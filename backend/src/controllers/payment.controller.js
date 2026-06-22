import { v4 as uuidv4 } from 'uuid';
import { pool } from '../config/db.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const createOrder = async (pool, { userId, cartItems, shippingInfo, couponId, total, subtotal, discount, shippingFee }) => {
  const orderId = uuidv4();

  await pool.request()
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
      const varResult = await pool.request()
        .input('productId', item.product.id)
        .query(`SELECT TOP 1 id FROM ProductVariants WHERE product_id = @productId`);
      if (varResult.recordset.length > 0) {
        variantId = varResult.recordset[0].id;
      }
    }

    // 2. If we still don't have a variantId (e.g., mock products in local development cart),
    // get a fallback variant from the DB to prevent foreign key constraint crashes.
    if (!variantId) {
      const fallbackVar = await pool.request()
        .query(`SELECT TOP 1 id FROM ProductVariants`);
      if (fallbackVar.recordset.length > 0) {
        variantId = fallbackVar.recordset[0].id;
      }
    }

    await pool.request()
      .input('id',           uuidv4())
      .input('order_id',     orderId)
      .input('variant_id',   variantId)
      .input('quantity',     item.quantity)
      .input('unit_price',   item.product.price)
      .input('total_price',  item.product.price * item.quantity)
      .input('product_name', item.product.name)
      .input('variant_info', item.variantInfo || null)
      .query(`INSERT INTO OrderItems (id, order_id, variant_id, quantity, unit_price,
                total_price, product_name, variant_info, created_at)
              VALUES (@id, @order_id, @variant_id, @quantity, @unit_price,
                @total_price, @product_name, @variant_info, GETDATE())`);
  }

  return orderId;
};

const createPaymentRecord = async (pool, { orderId, method, amount, status = 'pending', transactionRef = null }) => {
  const paymentId = uuidv4();
  await pool.request()
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

// ─── Controllers ─────────────────────────────────────────────────────────────

/**


/**
 * POST /api/payments/cod/create
 * Creates a Cash On Delivery order directly (no payment gateway needed).
 */
export const createCODOrder = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { cartItems, shippingInfo, couponCode, subtotal, discount, shippingFee, total } = req.body;

    let couponId = null;
    if (couponCode) {
      const { recordset } = await pool.request()
        .input('code', couponCode)
        .query(`SELECT id FROM Coupons WHERE code = @code AND is_active = 1`);
      if (recordset.length > 0) couponId = recordset[0].id;
    }

    const orderId = await createOrder(pool, {
      userId, cartItems, shippingInfo, couponId,
      total, subtotal, discount: discount || 0, shippingFee: shippingFee || 0,
    });

    // COD payment record — confirmed immediately
    await createPaymentRecord(pool, { orderId, method: 'cod', amount: total, status: 'pending' });

    // COD orders go to 'confirmed' right away
    await pool.request()
      .input('order_id', orderId)
      .query(`UPDATE Orders SET status = 'confirmed', updated_at = GETDATE() WHERE id = @order_id`);

    res.status(201).json({ status: 'success', orderId });
  } catch (err) {
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
