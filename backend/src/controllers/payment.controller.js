import { pool, sql } from '../config/db.js';
import { v4 as uuidv4 } from 'uuid';
import {
  createTrustedOrder,
  previewTrustedCoupon,
  sendCheckoutError
} from '../services/checkoutService.js';
import { getCustomerOrderItems } from '../services/orderTimelineService.js';
import {
  assertFulfillmentTransition,
  deriveOrderDisplayStatus,
  orderStatusError
} from '../services/orderStatusService.js';
import { INVENTORY_TYPES, recordInventoryLog } from '../services/inventoryService.js';
import { createNotification } from '../services/notificationService.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────
export const validateCoupon = async (req, res) => {
  try {
    const data = await previewTrustedCoupon(pool, {
      userId: req.user.id,
      couponCode: req.body?.code,
      cartItems: req.body?.cartItems,
      sellerId: req.body?.sellerId || null
    });

    res.json({
      status: 'success',
      data
    });
  } catch (err) {
    if (sendCheckoutError(res, err)) return;
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

const restoreCouponUsage = async (db, { orderId }) => {
  const usageResult = await db.request()
    .input('order_id', orderId)
    .query(`
      SELECT coupon_id
      FROM CouponUsage
      WHERE order_id = @order_id
    `);

  if (usageResult.recordset.length === 0) return;

  await db.request()
    .input('order_id', orderId)
    .query(`
      DELETE FROM CouponUsage
      WHERE order_id = @order_id
    `);

  for (const usage of usageResult.recordset) {
    await db.request()
      .input('coupon_id', usage.coupon_id)
      .query(`
        UPDATE Coupons
        SET used_count = CASE WHEN used_count > 0 THEN used_count - 1 ELSE 0 END
        WHERE id = @coupon_id
      `);
  }
};

// ─── Controllers ─────────────────────────────────────────────────────────────

/**


/**
 * POST /api/payments/cod/create
 * Creates a Cash On Delivery order directly (no payment gateway needed).
 */
export const createCODOrder = async (req, res, next) => {
  const transaction = new sql.Transaction(pool);
  let transactionStarted = false;
  try {
    const userId = req.user.id;
    const { cartItems, shippingInfo, couponCode, couponCodes, total } = req.body;

    await transaction.begin();
    transactionStarted = true;

    const result = await createTrustedOrder(transaction, {
      userId,
      cartItems,
      shippingInfo,
      couponCode,
      couponCodes,
      paymentMethod: 'cod',
      orderStatus: 'confirmed',
      paymentStatus: 'pending',
      clientTotal: total
    });

    await transaction.commit();
    transactionStarted = false;

    res.status(201).json({
      status: 'success',
      orderId: result.orderId,
      pricing: result.pricing,
      items: result.items
    });
  } catch (err) {
    if (transactionStarted) {
      try { await transaction.rollback(); } catch (_) {}
    }
    if (sendCheckoutError(res, err)) return;
    next(err);
  }
};

/**
 * GET /api/payments/order/:orderId
 * Returns order + payment status for the authenticated user.
 */
export const getOrderStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    const { recordset } = await pool.request()
      .input('order_id', orderId)
      .input('user_id',  userId)
      .query(`SELECT o.id, o.status AS order_status, o.total,
                     o.shipping_name, o.shipping_address, o.created_at,
                     p.status AS payment_status, p.method, p.transaction_ref
              FROM Orders o
              LEFT JOIN Payments p ON p.order_id = o.id
              WHERE o.id = @order_id AND o.user_id = @user_id`);

    if (recordset.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Order not found' });
    }

    const order = recordset[0];
    const items = await getCustomerOrderItems(userId, orderId);
    const displayStatus = deriveOrderDisplayStatus(items, order.order_status);

    res.json({
      status: 'success',
      data: {
        ...order,
        status: displayStatus,
        display_status: displayStatus,
        items
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/payments/orders
 * Returns all orders for the authenticated user (for Profile "My Orders" tab).
 */
export const getUserOrders = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const { recordset } = await pool.request()
      .input('user_id', userId)
      .query(`SELECT o.id, o.status AS order_status, o.total, o.created_at,
                     o.shipping_name, o.shipping_address,
                     p.method AS payment_method, p.status AS payment_status
              FROM Orders o
              LEFT JOIN Payments p ON p.order_id = o.id
              WHERE o.user_id = @user_id
              ORDER BY o.created_at DESC`);

    const items = await getCustomerOrderItems(userId);
    const itemsByOrder = new Map();
    for (const item of items) {
      const orderItems = itemsByOrder.get(item.order_id) || [];
      orderItems.push(item);
      itemsByOrder.set(item.order_id, orderItems);
    }

    const orders = recordset.map((order) => {
      const orderItems = itemsByOrder.get(order.id) || [];
      const displayStatus = deriveOrderDisplayStatus(orderItems, order.order_status);
      return {
        ...order,
        status: displayStatus,
        display_status: displayStatus,
        items: orderItems
      };
    });

    res.json({ status: 'success', data: orders });
  } catch (err) {
    next(err);
  }
};

export const cancelOrderAndRestoreStock = async (req, res, next) => {
  const transaction = new sql.Transaction(pool);
  let transactionStarted = false;
  try {
    const { orderId } = req.params;
    const userId = req.user.id;
    const requestedReason = req.body?.reason;
    if (
      requestedReason !== undefined &&
      (typeof requestedReason !== 'string' || requestedReason.trim().length > 255)
    ) {
      throw orderStatusError(
        'INVALID_CANCEL_REASON',
        'Lý do hủy đơn không hợp lệ hoặc vượt quá 255 ký tự.'
      );
    }
    const cancelReason = requestedReason?.trim() || 'Khách hàng hủy đơn.';

    await transaction.begin();
    transactionStarted = true;

    const orderResult = await transaction.request()
      .input('order_id', orderId)
      .input('user_id', userId)
      .query(`
        SELECT id, status, coupon_id
        FROM Orders WITH (UPDLOCK, ROWLOCK)
        WHERE id = @order_id AND user_id = @user_id
      `);

    const order = orderResult.recordset[0];
    if (!order) {
      throw new Error('Order not found.');
    }

    const closedStatuses = ['cancelled', 'refunded', 'failed'];
    const cancellableStatuses = ['pending', 'confirmed', 'pending_payment'];
    if (!closedStatuses.includes(order.status) && !cancellableStatuses.includes(order.status)) {
      const err = new Error('Order cannot be cancelled at its current status.');
      err.statusCode = 400;
      throw err;
    }

    if (!closedStatuses.includes(order.status)) {
      const itemsResult = await transaction.request()
        .input('order_id', orderId)
        .query(`
          SELECT item.id, item.variant_id, item.quantity, item.fulfillment_status,
                 item.product_name, product.id AS product_id,
                 default_variant.id AS stock_variant_id,
                 seller.user_id AS seller_user_id
          FROM OrderItems item WITH (UPDLOCK, ROWLOCK)
          INNER JOIN ProductVariants ordered_variant ON ordered_variant.id = item.variant_id
          INNER JOIN Products product ON product.id = ordered_variant.product_id
          INNER JOIN ProductVariants default_variant
            ON default_variant.product_id = product.id AND default_variant.is_default = 1
          INNER JOIN Sellers seller ON seller.id = product.seller_id
          WHERE item.order_id = @order_id
        `);

      for (const item of itemsResult.recordset) {
        const transition = assertFulfillmentTransition(
          item.fulfillment_status,
          'cancelled'
        );
        if (!transition.changed) continue;

        const stockUpdate = await transaction.request()
          .input('variant_id', item.stock_variant_id)
          .input('quantity', item.quantity)
          .query(`
            UPDATE ProductVariants
            SET stock_qty = stock_qty + @quantity,
                updated_at = GETDATE()
            OUTPUT
              DELETED.stock_qty AS old_quantity,
              INSERTED.stock_qty AS new_quantity
            WHERE id = @variant_id
          `);

        const stockChange = stockUpdate.recordset[0];
        await recordInventoryLog(transaction, {
          variantId: item.stock_variant_id,
          oldQuantity: Number(stockChange.old_quantity),
          changeQuantity: Number(item.quantity),
          newQuantity: Number(stockChange.new_quantity),
          type: INVENTORY_TYPES.ORDER_CANCELLED,
          referenceId: item.id,
          reason: cancelReason,
          createdBy: userId
        });

        await transaction.request()
          .input('order_item_id', item.id)
          .input('cancel_reason', sql.NVarChar, cancelReason)
          .query(`
            UPDATE OrderItems
            SET fulfillment_status = 'cancelled',
                cancel_reason = @cancel_reason,
                updated_at = GETDATE()
            WHERE id = @order_item_id
          `);

        await transaction.request()
          .input('id', sql.VarChar, uuidv4())
          .input('order_item_id', item.id)
          .input('old_status', sql.VarChar, transition.current)
          .input('user_id', sql.VarChar, userId)
          .input('note', sql.NVarChar, cancelReason)
          .query(`
            INSERT INTO OrderItemStatusHistory (
              id, order_item_id, old_status, new_status,
              changed_by_user_id, change_source, note, created_at
            ) VALUES (
              @id, @order_item_id, @old_status, 'cancelled',
              @user_id, 'customer', @note, GETDATE()
            )
          `);

        await createNotification(transaction, {
          userId: item.seller_user_id,
          type: 'order_cancelled',
          title: '\u0110\u01a1n h\u00e0ng \u0111\u00e3 h\u1ee7y',
          message: `${item.product_name}: ${cancelReason}`,
          entityType: 'order',
          entityId: orderId,
          data: { orderId, orderItemId: item.id, productId: item.product_id },
          dedupeKey: `order-cancelled:${item.id}`
        });
      }

      await restoreCouponUsage(transaction, { orderId });

      await transaction.request()
        .input('order_id', orderId)
        .query(`
          UPDATE Orders
          SET status = 'cancelled',
              updated_at = GETDATE()
          WHERE id = @order_id
        `);

      await transaction.request()
        .input('order_id', orderId)
        .query(`
          UPDATE Payments
          SET status = 'failed'
          WHERE order_id = @order_id
        `);
    }

    await transaction.commit();
    transactionStarted = false;

    res.json({ status: 'success', message: 'Order cancelled and stock restored.' });
  } catch (err) {
    if (transactionStarted) {
      try { await transaction.rollback(); } catch (_) {}
    }
    next(err);
  }
};
