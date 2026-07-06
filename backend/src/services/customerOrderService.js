import { sql, pool } from '../config/db.js';
import { calculateDistance, simulateCustomerCoordinates } from './shippingService.js';
import { couponService } from './couponService.js';

export const customerOrderService = {
  /**
   * Place orders. Items will be grouped by shop_id and split into multiple orders if multi-vendor.
   *
   * @param {string} userId - ID of customer
   * @param {Array} items - Array of { variantId, quantity }
   * @param {Object} shippingInfo - { name, phone, address, city, country, latitude, longitude, note, paymentMethod }
   */
  checkout: async (userId, items, shippingInfo) => {
    if (!items || items.length === 0) {
      throw new Error('Giỏ hàng trống');
    }

    const {
      name,
      phone,
      address,
      city = 'TP.HCM',
      country = 'Vietnam',
      latitude,
      longitude,
      note = '',
      paymentMethod = 'COD',
      couponCode = ''
    } = shippingInfo;

    if (!name || !phone || !address) {
      throw new Error('Thông tin người nhận (tên, số điện thoại, địa chỉ) là bắt buộc');
    }

    // 1. Fetch variant and product information for all items
    const enrichedItems = [];
    for (const item of items) {
      const result = await pool.request()
        .input('variantId', sql.VarChar, item.variantId)
        .query(`
          SELECT pv.*, p.name AS product_name, p.shop_id, p.is_active AS product_active
          FROM ProductVariants pv
          LEFT JOIN Products p ON pv.product_id = p.id
          WHERE pv.id = @variantId
        `);

      const variant = result.recordset[0];
      if (!variant) {
        throw new Error(`Sản phẩm biến thể không tồn tại: ${item.variantId}`);
      }
      if (!variant.product_active || !variant.is_active) {
        throw new Error(`Sản phẩm '${variant.product_name}' hiện không hoạt động`);
      }
      if (variant.stock_qty < item.quantity) {
        throw new Error(`Sản phẩm '${variant.product_name}' không đủ hàng trong kho (Còn lại: ${variant.stock_qty})`);
      }

      enrichedItems.push({
        variantId: variant.id,
        productId: variant.product_id,
        productName: variant.product_name,
        sku: variant.sku,
        unitPrice: parseFloat(variant.price),
        quantity: item.quantity,
        shopId: variant.shop_id
      });
    }

    // Calculate total subtotal of the whole cart to validate the coupon
    let totalSubtotal = 0;
    for (const item of enrichedItems) {
      totalSubtotal += item.unitPrice * item.quantity;
    }

    let couponId = null;
    let discountAmount = 0;

    if (couponCode) {
      const couponVal = await couponService.validateCoupon(couponCode, userId, totalSubtotal, enrichedItems[0]?.shopId || null);
      if (!couponVal.valid) {
        throw new Error(couponVal.message);
      }
      couponId = couponVal.coupon.id;
      discountAmount = couponVal.discountAmount;
    }

    // 2. Group items by shopId
    const shopGroups = {};
    for (const item of enrichedItems) {
      const sId = item.shopId || 'shop_unknown';
      if (!shopGroups[sId]) {
        shopGroups[sId] = [];
      }
      shopGroups[sId].push(item);
    }

    const createdOrders = [];

    // 3. Process each shop group inside its own transaction
    for (const [shopId, groupItems] of Object.entries(shopGroups)) {
      // Fetch shop details
      const shopRes = await pool.request()
        .input('shopId', sql.VarChar, shopId)
        .query('SELECT * FROM Shops WHERE id = @shopId');
      
      const shop = shopRes.recordset[0];
      if (!shop) {
        throw new Error(`Không tìm thấy thông tin cửa hàng có ID: ${shopId}`);
      }

      // Determine customer coordinates
      let custLat = parseFloat(latitude);
      let custLng = parseFloat(longitude);
      
      if (isNaN(custLat) || isNaN(custLng)) {
        // Dev fallback: simulate coordinates near the shop location to avoid distance errors
        const simulated = simulateCustomerCoordinates(parseFloat(shop.latitude), parseFloat(shop.longitude));
        custLat = simulated.latitude;
        custLng = simulated.longitude;
      }

      // Calculate distance and shipping fee
      const distance_km = calculateDistance(
        parseFloat(shop.latitude),
        parseFloat(shop.longitude),
        custLat,
        custLng
      );

      const shipping_fee = Math.round(distance_km * parseFloat(shop.shipping_fee_per_km));

      // Calculate subtotal
      let subtotal = 0;
      for (const item of groupItems) {
        subtotal += item.unitPrice * item.quantity;
      }
      
      // Calculate shop-specific discount proportionally
      const shopDiscount = totalSubtotal > 0 ? Math.round(discountAmount * (subtotal / totalSubtotal)) : 0;
      const total = subtotal - shopDiscount + shipping_fee;

      const transaction = new sql.Transaction(pool);
      try {
        await transaction.begin();
        const req = () => transaction.request();

        const orderId = `ord_${Math.random().toString(36).substr(2, 9)}`;

        // A. Insert Orders (with coupon_id and proportional discount)
        await req()
          .input('id', sql.VarChar, orderId)
          .input('userId', sql.VarChar, userId)
          .input('couponId', sql.VarChar, couponId)
          .input('status', sql.VarChar, 'pending')
          .input('subtotal', sql.Decimal(18, 2), subtotal)
          .input('discountAmount', sql.Decimal(18, 2), shopDiscount)
          .input('shippingFee', sql.Decimal(18, 2), shipping_fee)
          .input('total', sql.Decimal(18, 2), total)
          .input('shippingName', sql.NVarChar, name)
          .input('shippingPhone', sql.VarChar, phone)
          .input('shippingAddress', sql.NVarChar, address)
          .input('shippingCity', sql.NVarChar, city)
          .input('shippingCountry', sql.NVarChar, country)
          .input('note', sql.NVarChar, note)
          .input('shopId', sql.VarChar, shopId)
          .input('distanceKm', sql.Decimal(5, 2), distance_km)
          .query(`
            INSERT INTO Orders (id, user_id, coupon_id, status, subtotal, discount_amount, shipping_fee, total, 
                               shipping_name, shipping_phone, shipping_address, shipping_city, shipping_country, 
                               note, shop_id, distance_km)
            VALUES (@id, @userId, @couponId, @status, @subtotal, @discountAmount, @shippingFee, @total,
                    @shippingName, @shippingPhone, @shippingAddress, @shippingCity, @shippingCountry,
                    @note, @shopId, @distanceKm)
          `);

        // B. Insert OrderItems & Reduce Stock
        for (const item of groupItems) {
          const itemId = `item_${Math.random().toString(36).substr(2, 9)}`;
          const itemTotal = item.unitPrice * item.quantity;

          await req()
            .input('id', sql.VarChar, itemId)
            .input('orderId', sql.VarChar, orderId)
            .input('variantId', sql.VarChar, item.variantId)
            .input('quantity', sql.Int, item.quantity)
            .input('unitPrice', sql.Decimal(18, 2), item.unitPrice)
            .input('totalPrice', sql.Decimal(18, 2), itemTotal)
            .input('productName', sql.NVarChar, item.productName)
            .input('variantInfo', sql.NVarChar, `SKU: ${item.sku}`)
            .query(`
              INSERT INTO OrderItems (id, order_id, variant_id, quantity, unit_price, total_price, product_name, variant_info)
              VALUES (@id, @orderId, @variantId, @quantity, @unitPrice, @totalPrice, @productName, @variantInfo)
            `);

          // Update product variant stock
          await req()
            .input('varId', sql.VarChar, item.variantId)
            .input('qty', sql.Int, item.quantity)
            .query(`
              UPDATE ProductVariants 
              SET stock_qty = stock_qty - @qty 
              WHERE id = @varId
            `);
        }

        // C. Create Payment Record
        const paymentId = `pay_${Math.random().toString(36).substr(2, 9)}`;
        await req()
          .input('id', sql.VarChar, paymentId)
          .input('orderId', sql.VarChar, orderId)
          .input('method', sql.VarChar, paymentMethod)
          .input('status', sql.VarChar, 'pending')
          .input('amount', sql.Decimal(18, 2), total)
          .query(`
            INSERT INTO Payments (id, order_id, method, status, amount)
            VALUES (@id, @orderId, @method, @status, @amount)
          `);

        // D. Create Coupon Usage Record & Increment Coupon used count if applicable
        if (couponId) {
          const usageId = `usg_${Math.random().toString(36).substr(2, 9)}`;
          await req()
            .input('usageId', sql.VarChar, usageId)
            .input('couponId', sql.VarChar, couponId)
            .input('orderId', sql.VarChar, orderId)
            .input('userId', sql.VarChar, userId)
            .query(`
              INSERT INTO CouponUsage (id, coupon_id, order_id, user_id)
              VALUES (@usageId, @couponId, @orderId, @userId)
            `);

          await req()
            .input('cId', sql.VarChar, couponId)
            .query(`
              UPDATE Coupons 
              SET used_count = used_count + 1 
              WHERE id = @cId
            `);
        }

        await transaction.commit();

        createdOrders.push({
          orderId,
          shopId,
          shopName: shop.shop_name,
          subtotal,
          shippingFee: shipping_fee,
          total,
          distanceKm: distance_km,
          status: 'pending'
        });
      } catch (err) {
        await transaction.rollback();
        throw err;
      }
    }

    return createdOrders;
  },

  /**
   * Get customer orders list
   */
  getOrders: async (userId, { status, page = 1, limit = 20 } = {}) => {
    let query = `
      SELECT o.*, s.shop_name
      FROM Orders o
      LEFT JOIN Shops s ON o.shop_id = s.id
      WHERE o.user_id = @userId
    `;
    const request = pool.request().input('userId', sql.VarChar, userId);

    if (status) {
      query += ' AND o.status = @status';
      request.input('status', sql.VarChar, status);
    }

    query += ' ORDER BY o.created_at DESC';
    query += ' OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY';
    request.input('offset', sql.Int, (page - 1) * limit);
    request.input('limit', sql.Int, limit);

    const result = await request.query(query);

    const countReq = pool.request().input('userId', sql.VarChar, userId);
    let countQuery = 'SELECT COUNT(*) AS total FROM Orders WHERE user_id = @userId';
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
   * Get order detail for a customer
   */
  getOrderDetail: async (orderId, userId) => {
    const result = await pool.request()
      .input('orderId', sql.VarChar, orderId)
      .input('userId', sql.VarChar, userId)
      .query(`
        SELECT o.*, s.shop_name, s.phone_number AS shop_phone, s.warehouse_address AS shop_address
        FROM Orders o
        LEFT JOIN Shops s ON o.shop_id = s.id
        WHERE o.id = @orderId AND o.user_id = @userId
      `);

    const order = result.recordset[0];
    if (!order) {
      throw new Error('Đơn hàng không tồn tại hoặc không thuộc quyền sở hữu của bạn');
    }

    // Get items
    const itemsResult = await pool.request()
      .input('orderId', sql.VarChar, orderId)
      .query(`
        SELECT oi.*, pv.image_url AS variant_image
        FROM OrderItems oi
        LEFT JOIN ProductVariants pv ON oi.variant_id = pv.id
        WHERE oi.order_id = @orderId
      `);

    order.items = itemsResult.recordset;
    return order;
  },

  /**
   * Customer cancels their own order.
   * Can only cancel if order is 'pending' or 'confirmed'.
   */
  cancelOrder: async (orderId, userId) => {
    const result = await pool.request()
      .input('orderId', sql.VarChar, orderId)
      .input('userId', sql.VarChar, userId)
      .query('SELECT * FROM Orders WHERE id = @orderId AND user_id = @userId');

    const order = result.recordset[0];
    if (!order) {
      throw new Error('Đơn hàng không tồn tại hoặc không thuộc quyền sở hữu của bạn');
    }

    if (order.status !== 'pending' && order.status !== 'confirmed') {
      throw new Error(`Không thể hủy đơn hàng đang ở trạng thái: '${order.status}'`);
    }

    const transaction = new sql.Transaction(pool);
    try {
      await transaction.begin();
      const req = () => transaction.request();

      // Update Order Status
      await req()
        .input('orderId', sql.VarChar, orderId)
        .query("UPDATE Orders SET status = 'cancelled', updated_at = GETDATE() WHERE id = @orderId");

      // Refund items stock
      const items = await pool.request()
        .input('orderId', sql.VarChar, orderId)
        .query('SELECT * FROM OrderItems WHERE order_id = @orderId');

      for (const item of items.recordset) {
        await req()
          .input('varId', sql.VarChar, item.variant_id)
          .input('qty', sql.Int, item.quantity)
          .query('UPDATE ProductVariants SET stock_qty = stock_qty + @qty WHERE id = @varId');
      }

      await transaction.commit();
      return await customerOrderService.getOrderDetail(orderId, userId);
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
};
