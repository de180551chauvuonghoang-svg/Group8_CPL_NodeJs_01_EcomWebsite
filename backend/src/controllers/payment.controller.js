import { v4 as uuidv4 } from 'uuid';
import { pool, sql } from '../config/db.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const getCartProductIds = (cartItems = []) =>
  cartItems
    .map(item => item?.product?.id)
    .filter(id => typeof id === 'string' && id.length > 0);

const calculateDiscount = (coupon, subtotal) => {
  const value = Number(coupon.discount_value || 0);
  if (coupon.discount_type === 'fixed') {
    return Math.min(value, subtotal);
  }
  const raw = Math.round(subtotal * (value / 100));
  return coupon.max_discount_amt ? Math.min(raw, Number(coupon.max_discount_amt)) : raw;
};

const findApplicableCoupon = async ({ code, subtotal, cartItems }) => {
  const productIds = getCartProductIds(cartItems);
  const { recordset } = await pool.request()
    .input('code', String(code || '').trim().toUpperCase())
    .query(`
      SELECT TOP 1 *
      FROM Coupons
      WHERE code = @code
        AND is_active = 1
        AND deleted_at IS NULL
        AND (starts_at IS NULL OR starts_at <= GETDATE())
        AND (expires_at IS NULL OR expires_at >= GETDATE())
        AND (usage_limit IS NULL OR used_count < usage_limit)
    `);

  const coupon = recordset[0];
  if (!coupon) throw new Error('Mã voucher không hợp lệ hoặc đã hết hạn.');

  if (coupon.min_order_amount && Number(subtotal) < Number(coupon.min_order_amount)) {
    throw new Error(`Đơn hàng chưa đạt tối thiểu ${Number(coupon.min_order_amount).toLocaleString('vi-VN')}đ.`);
  }

  if (coupon.seller_id) {
    const products = await pool.request()
      .input('sellerId', coupon.seller_id)
      .query('SELECT id FROM Products WHERE seller_id = @sellerId');
    const sellerProductIds = new Set(products.recordset.map(row => row.id));
    const hasShopProduct = productIds.some(id => sellerProductIds.has(id));
    if (!hasShopProduct) {
      throw new Error('Voucher này chỉ áp dụng cho sản phẩm của shop phát hành.');
    }
  }

  return coupon;
};

export const validateCoupon = async (req, res) => {
  try {
    const { code, subtotal, cartItems } = req.body;
    if (!code) {
      return res.status(400).json({ status: 'fail', message: 'Vui lòng nhập mã voucher.' });
    }

    const coupon = await findApplicableCoupon({ code, subtotal: Number(subtotal || 0), cartItems });
    const discountAmount = calculateDiscount(coupon, Number(subtotal || 0));

    res.json({
      status: 'success',
      data: {
        couponId: coupon.id,
        code: coupon.code,
        discountType: coupon.discount_type,
        discountValue: Number(coupon.discount_value || 0),
        discountAmount,
        sellerId: coupon.seller_id || null,
      }
    });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

const decrementVariantStock = async (db, variantId, quantity) => {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error('So luong san pham khong hop le.');
  }

  const stockResult = await db.request()
    .input('variant_id', variantId)
    .query(`
      SELECT stock_qty
      FROM ProductVariants WITH (UPDLOCK, ROWLOCK)
      WHERE id = @variant_id
    `);

  const stock = Number(stockResult.recordset[0]?.stock_qty ?? -1);
  if (stock < quantity) {
    throw new Error('So luong ton kho khong du.');
  }

  await db.request()
    .input('variant_id', variantId)
    .input('quantity', quantity)
    .query(`
      UPDATE ProductVariants
      SET stock_qty = stock_qty - @quantity,
          updated_at = GETDATE()
      WHERE id = @variant_id
    `);
};

const createOrder = async (db, { userId, cartItems, shippingInfo, couponId, total, subtotal, discount, shippingFee }) => {
  const orderId = uuidv4();

  await db.request()
    .input('id',               orderId)
    .input('user_id',          userId)
    .input('coupon_id',        couponId || null)
    .input('status',           'pending')
    .input('subtotal',         subtotal)
    .input('discount_amount',  discount)
    .input('shipping_fee',     shippingFee)
    .input('total',            total)
    .input('shipping_name',    shippingInfo.name)
    .input('shipping_phone',   shippingInfo.phone)
    .input('shipping_address', shippingInfo.address)
    .input('shipping_city',    shippingInfo.city || null)
    .input('shipping_country', 'Vietnam')
    .input('note',             shippingInfo.note || null)
    .query(`INSERT INTO Orders (id, user_id, coupon_id, status, subtotal, discount_amount,
              shipping_fee, total, shipping_name, shipping_phone, shipping_address,
              shipping_city, shipping_country, note, created_at, updated_at)
            VALUES (@id, @user_id, @coupon_id, @status, @subtotal, @discount_amount,
              @shipping_fee, @total, @shipping_name, @shipping_phone, @shipping_address,
              @shipping_city, @shipping_country, @note, GETDATE(), GETDATE())`);

  // Insert order items (snapshot product info at time of purchase)
  for (const item of cartItems) {
    let variantId = item.variantId;

    // 1. If no variantId is provided, or it is a product ID, look up the first variant for this product
    if (!variantId || variantId.startsWith('prod')) {
      const varResult = await db.request()
        .input('productId', item.product.id)
        .query(`SELECT TOP 1 id FROM ProductVariants WHERE product_id = @productId`);
      if (varResult.recordset.length > 0) {
        variantId = varResult.recordset[0].id;
      }
    }

    // 2. If we still don't have a variantId (e.g., mock products in local development cart),
    // get a fallback variant from the DB to prevent foreign key constraint crashes.
    if (!variantId) {
      const fallbackVar = await db.request()
        .query(`SELECT TOP 1 id FROM ProductVariants`);
      if (fallbackVar.recordset.length > 0) {
        variantId = fallbackVar.recordset[0].id;
      }
    }

    const productName = typeof item.product?.name === 'string'
      ? item.product.name
      : String(item.product?.name || 'Sản phẩm');

    await decrementVariantStock(db, variantId, Number(item.quantity || 0));

    await db.request()
      .input('id',           uuidv4())
      .input('order_id',     orderId)
      .input('variant_id',   variantId)
      .input('quantity',     item.quantity)
      .input('unit_price',   item.product.price)
      .input('total_price',  item.product.price * item.quantity)
      .input('product_name', productName)
      .input('variant_info', item.variantInfo || null)
      .query(`INSERT INTO OrderItems (id, order_id, variant_id, quantity, unit_price,
                total_price, product_name, variant_info, created_at)
              VALUES (@id, @order_id, @variant_id, @quantity, @unit_price,
                @total_price, @product_name, @variant_info, GETDATE())`);
  }

  return orderId;
};

const createPaymentRecord = async (db, { orderId, method, amount, status = 'pending', transactionRef = null }) => {
  const paymentId = uuidv4();
  await db.request()
    .input('id',              paymentId)
    .input('order_id',        orderId)
    .input('method',          method)
    .input('status',          status)
    .input('amount',          amount)
    .input('transaction_ref', transactionRef)
    .query(`INSERT INTO Payments (id, order_id, method, status, amount, transaction_ref, created_at)
            VALUES (@id, @order_id, @method, @status, @amount, @transaction_ref, GETDATE())`);
  return paymentId;
};

const recordCouponUsage = async (db, { couponId, orderId, userId }) => {
  if (!couponId) return;

  const updateResult = await db.request()
    .input('coupon_id', couponId)
    .query(`
      UPDATE Coupons
      SET used_count = used_count + 1
      WHERE id = @coupon_id
        AND is_active = 1
        AND deleted_at IS NULL
        AND (usage_limit IS NULL OR used_count < usage_limit)
    `);

  if (updateResult.rowsAffected[0] === 0) {
    throw new Error('Voucher da het luot su dung.');
  }

  await db.request()
    .input('id', uuidv4())
    .input('coupon_id', couponId)
    .input('order_id', orderId)
    .input('user_id', userId)
    .query(`
      INSERT INTO CouponUsage (id, coupon_id, order_id, user_id, used_at)
      VALUES (@id, @coupon_id, @order_id, @user_id, GETDATE())
    `);
};

const restoreCouponUsage = async (db, { couponId, orderId }) => {
  if (!couponId) return;

  const usageResult = await db.request()
    .input('coupon_id', couponId)
    .input('order_id', orderId)
    .query(`
      SELECT TOP 1 id
      FROM CouponUsage
      WHERE coupon_id = @coupon_id AND order_id = @order_id
    `);

  if (usageResult.recordset.length === 0) return;

  await db.request()
    .input('coupon_id', couponId)
    .input('order_id', orderId)
    .query(`
      DELETE FROM CouponUsage
      WHERE coupon_id = @coupon_id AND order_id = @order_id
    `);

  await db.request()
    .input('coupon_id', couponId)
    .query(`
      UPDATE Coupons
      SET used_count = CASE WHEN used_count > 0 THEN used_count - 1 ELSE 0 END
      WHERE id = @coupon_id
    `);
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
    const { cartItems, shippingInfo, couponCode, subtotal, discount, shippingFee, total } = req.body;

    let couponId = null;
    if (couponCode) {
      const coupon = await findApplicableCoupon({ code: couponCode, subtotal, cartItems });
      couponId = coupon.id;
    }

    await transaction.begin();
    transactionStarted = true;

    const orderId = await createOrder(transaction, {
      userId, cartItems, shippingInfo, couponId,
      total, subtotal, discount: discount || 0, shippingFee: shippingFee || 0,
    });

    await recordCouponUsage(transaction, { couponId, orderId, userId });
    // COD payment record — confirmed immediately
    await createPaymentRecord(transaction, { orderId, method: 'cod', amount: total, status: 'pending' });

    // COD orders go to 'confirmed' right away
    await transaction.request()
      .input('order_id', orderId)
      .query(`UPDATE Orders SET status = 'confirmed', updated_at = GETDATE() WHERE id = @order_id`);

    await transaction.commit();
    transactionStarted = false;

    res.status(201).json({ status: 'success', orderId });
  } catch (err) {
    if (transactionStarted) {
      try { await transaction.rollback(); } catch (_) {}
    }
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

    res.json({ status: 'success', data: recordset[0] });
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
      .query(`SELECT o.id, o.status, o.total, o.created_at,
                     o.shipping_name, o.shipping_address,
                     p.method AS payment_method, p.status AS payment_status
              FROM Orders o
              LEFT JOIN Payments p ON p.order_id = o.id
              WHERE o.user_id = @user_id
              ORDER BY o.created_at DESC`);

    res.json({ status: 'success', data: recordset });
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
          SELECT variant_id, quantity
          FROM OrderItems
          WHERE order_id = @order_id
        `);

      for (const item of itemsResult.recordset) {
        await transaction.request()
          .input('variant_id', item.variant_id)
          .input('quantity', item.quantity)
          .query(`
            UPDATE ProductVariants
            SET stock_qty = stock_qty + @quantity,
                updated_at = GETDATE()
            WHERE id = @variant_id
          `);
      }

      await restoreCouponUsage(transaction, { couponId: order.coupon_id, orderId });

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
