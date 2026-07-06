import { sql, pool } from '../config/db.js';

// ── Valid status transitions (Seller perspective) ────────────
const STATUS_TRANSITIONS = {
  'pending':    ['confirmed', 'cancelled'],
  'confirmed':  ['processing', 'cancelled'],
  'processing': ['shipped'],
  'shipped':    ['delivered'],
  'delivered':  [],
  'cancelled':  [],
  'refunded':   []
};

export const sellerOrderService = {
  /**
   * List orders belonging to a shop with optional status filter and pagination.
   */
  getOrdersByShop: async (shopId, { status, page = 1, limit = 20 } = {}) => {
    let query = `
      SELECT o.*, u.name AS customer_name, u.email AS customer_email,
             u.phone_number AS customer_phone
      FROM Orders o
      LEFT JOIN Users u ON o.user_id = u.id
      WHERE o.shop_id = @shopId
    `;
    const request = pool.request().input('shopId', sql.VarChar, shopId);

    if (status) {
      query += ' AND o.status = @status';
      request.input('status', sql.VarChar, status);
    }

    query += ' ORDER BY o.created_at DESC';
    query += ' OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY';
    request.input('offset', sql.Int, (page - 1) * limit);
    request.input('limit', sql.Int, limit);

    const result = await request.query(query);

    // Total count (separate request to avoid input name collisions)
    const countReq = pool.request().input('shopId', sql.VarChar, shopId);
    let countQuery = 'SELECT COUNT(*) AS total FROM Orders WHERE shop_id = @shopId';
    if (status) {
      countQuery += ' AND status = @status';
      countReq.input('status', sql.VarChar, status);
    }
    const countResult = await countReq.query(countQuery);

    return {
      orders: result.recordset,
      total: countResult.recordset[0].total,
      page,
      limit,
      totalPages: Math.ceil(countResult.recordset[0].total / limit)
    };
  },

  /**
   * Get full detail of a single order (including line items).
   * Throws if order does not belong to the given shop.
   */
  getOrderDetail: async (orderId, shopId) => {
    const result = await pool.request()
      .input('orderId', sql.VarChar, orderId)
      .input('shopId', sql.VarChar, shopId)
      .query(`
        SELECT o.*, u.name AS customer_name, u.email AS customer_email,
               u.phone_number AS customer_phone
        FROM Orders o
        LEFT JOIN Users u ON o.user_id = u.id
        WHERE o.id = @orderId AND o.shop_id = @shopId
      `);

    const order = result.recordset[0];
    if (!order) {
      throw new Error('Order not found or does not belong to your shop');
    }

    // Fetch line items
    const itemsResult = await pool.request()
      .input('orderId', sql.VarChar, orderId)
      .query(`
        SELECT oi.*, pv.sku, pv.image_url AS variant_image
        FROM OrderItems oi
        LEFT JOIN ProductVariants pv ON oi.variant_id = pv.id
        WHERE oi.order_id = @orderId
      `);

    order.items = itemsResult.recordset;
    return order;
  },

  /**
   * Transition an order to a new status with lifecycle validation.
   * On 'delivered' → auto-log inventory deductions.
   */
  updateOrderStatus: async (orderId, shopId, newStatus) => {
    // 1. Fetch current order
    const result = await pool.request()
      .input('orderId', sql.VarChar, orderId)
      .input('shopId', sql.VarChar, shopId)
      .query('SELECT * FROM Orders WHERE id = @orderId AND shop_id = @shopId');

    const order = result.recordset[0];
    if (!order) {
      throw new Error('Order not found or does not belong to your shop');
    }

    // 2. Validate transition
    const currentStatus = order.status;
    const allowed = STATUS_TRANSITIONS[currentStatus];

    if (!allowed || !allowed.includes(newStatus)) {
      throw new Error(
        `Cannot transition from '${currentStatus}' to '${newStatus}'. ` +
        `Allowed: ${allowed ? allowed.join(', ') : 'none'}`
      );
    }

    // 3. Apply new status
    await pool.request()
      .input('orderId', sql.VarChar, orderId)
      .input('status', sql.VarChar, newStatus)
      .query('UPDATE Orders SET status = @status, updated_at = GETDATE() WHERE id = @orderId');

    // 4. Side-effects on delivery
    if (newStatus === 'delivered') {
      const items = await pool.request()
        .input('orderId', sql.VarChar, orderId)
        .query('SELECT * FROM OrderItems WHERE order_id = @orderId');

      for (const item of items.recordset) {
        const logId = `invlog_${Math.random().toString(36).substr(2, 9)}`;
        await pool.request()
          .input('logId',     sql.VarChar,  logId)
          .input('variantId', sql.VarChar,  item.variant_id)
          .input('changeQty', sql.Int,      -item.quantity)
          .input('reason',    sql.NVarChar, `Order ${orderId} delivered`)
          .input('refId',     sql.VarChar,  orderId)
          .query(`
            INSERT INTO InventoryLogs (id, variant_id, change_qty, reason, reference_id)
            VALUES (@logId, @variantId, @changeQty, @reason, @refId)
          `);
      }
    }

    return await sellerOrderService.getOrderDetail(orderId, shopId);
  },

  /**
   * Aggregate order stats grouped by status for a shop.
   */
  getOrderStats: async (shopId) => {
    const result = await pool.request()
      .input('shopId', sql.VarChar, shopId)
      .query(`
        SELECT
          status,
          COUNT(*) AS count,
          COALESCE(SUM(total), 0) AS total_revenue
        FROM Orders
        WHERE shop_id = @shopId
        GROUP BY status
      `);

    return result.recordset;
  }
};
