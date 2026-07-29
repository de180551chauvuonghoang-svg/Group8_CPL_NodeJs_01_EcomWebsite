import { connectDB, pool, sql } from "../src/config/db.js";
import {
  createTrustedOrder,
  recalculateOrderAfterCancellation
} from "../src/services/checkoutService.js";
import { sellerService } from "../src/services/sellerService.js";
import { sellerDashboardTaskService } from "../src/services/sellerDashboardTaskService.js";
import {
  getFinanceSummary,
  getFinanceTransactions
} from "../src/services/sellerFinanceService.js";
import { getSellerReturns } from "../src/services/returnService.js";

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const getCheckoutProduct = async (transaction, sellerId) => {
  const result = await transaction.request()
    .input("sellerId", sql.VarChar, sellerId)
    .query(`
      SELECT TOP 1 p.id, pv.id AS variant_id,
             COALESCE(flash_sale.sale_price, pv.price, p.base_price) AS price
      FROM Products p
      INNER JOIN ProductVariants pv
        ON pv.product_id = p.id AND pv.is_default = 1 AND pv.is_active = 1
      OUTER APPLY (
        SELECT TOP 1 sale_price
        FROM ProductFlashSales
        WHERE product_id = p.id
          AND (variant_id IS NULL OR variant_id = pv.id)
          AND status = 'active'
          AND starts_at <= GETDATE()
          AND ends_at >= GETDATE()
        ORDER BY ends_at
      ) flash_sale
      WHERE p.seller_id = @sellerId
        AND p.is_active = 1
        AND pv.stock_qty > 0
      ORDER BY p.id
    `);
  return result.recordset[0];
};

const verifyReadServices = async (sellers) => {
  for (const seller of sellers) {
    const products = await sellerService.getSellerProducts(seller.id, {
      page: 1,
      limit: 2
    });
    const tasks = await sellerDashboardTaskService.getTasks(seller.id, seller.user_id);
    const finance = await getFinanceSummary(seller.id, {});
    const transactions = await getFinanceTransactions(seller.id, { page: 1, limit: 2 });
    const returns = await getSellerReturns(seller.id, { page: 1, limit: 2 });
    assert(products.products.every((product) => product.variants.length === 1), "Product has multiple logical variants.");
    assert(Number.isInteger(tasks.pending_returns), "Dashboard tasks response is invalid.");
    assert(Number.isFinite(finance.net_revenue), "Finance summary response is invalid.");
    assert(transactions.pagination.page === 1, "Finance pagination response is invalid.");
    assert(returns.pagination.page === 1, "Return pagination response is invalid.");
  }
};

const verifyCheckoutRollback = async (sellers, customerId) => {
  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  try {
    const cartItems = [];
    const couponCodes = [];
    for (let index = 0; index < sellers.length; index += 1) {
      const seller = sellers[index];
      const product = await getCheckoutProduct(transaction, seller.id);
      assert(product, `No in-stock product for seller ${seller.id}.`);
      const code = `VERIFY${Date.now()}${index}`;
      const couponId = `verify_coupon_${Date.now()}_${index}`;
      await transaction.request()
        .input("id", sql.VarChar, couponId)
        .input("sellerId", sql.VarChar, seller.id)
        .input("code", sql.VarChar, code)
        .query(`
          INSERT INTO Coupons (
            id, seller_id, code, discount_type, discount_value,
            min_order_amount, usage_limit, starts_at, expires_at, is_active
          ) VALUES (
            @id, @sellerId, @code, 'fixed', 1000,
            0, 10, DATEADD(DAY, -1, GETDATE()), DATEADD(DAY, 1, GETDATE()), 1
          )
        `);
      cartItems.push({
        productId: product.id,
        variantId: product.variant_id,
        quantity: 1,
        product: { id: product.id, price: Number(product.price) }
      });
      couponCodes.push({ sellerId: seller.id, code });
    }

    const result = await createTrustedOrder(transaction, {
      userId: customerId,
      cartItems,
      shippingInfo: {
        name: "Verification Customer",
        phone: "0900000000",
        address: "Verification address"
      },
      couponCodes,
      paymentMethod: "cod",
      orderStatus: "confirmed",
      paymentStatus: "pending"
    });
    const counts = await transaction.request()
      .input("orderId", sql.VarChar, result.orderId)
      .query(`
        SELECT
          (SELECT COUNT(*) FROM OrderCoupons WHERE order_id = @orderId) AS order_coupons,
          (SELECT COUNT(*) FROM CouponUsage WHERE order_id = @orderId) AS coupon_usages,
          (SELECT COUNT(*) FROM Notifications WHERE entity_id = @orderId) AS notifications
      `);
    const row = counts.recordset[0];
    assert(result.pricing.couponDiscounts.length === sellers.length, "Not all shop coupons were applied.");
    assert(Number(row.order_coupons) === sellers.length, "OrderCoupons rows are missing.");
    assert(Number(row.coupon_usages) === sellers.length, "CouponUsage rows are missing.");
    assert(Number(row.notifications) === sellers.length, "Seller order notifications are missing.");

    await transaction.request()
      .input("orderItemId", sql.VarChar, result.items[0].orderItemId)
      .query(`
        UPDATE OrderItems
        SET fulfillment_status = 'cancelled'
        WHERE id = @orderItemId
      `);
    const repriced = await recalculateOrderAfterCancellation(transaction, result.orderId);
    const afterCancellation = (await transaction.request()
      .input("orderId", sql.VarChar, result.orderId)
      .query(`
        SELECT
          (SELECT COUNT(*) FROM OrderCoupons WHERE order_id = @orderId) AS order_coupons,
          (SELECT COUNT(*) FROM CouponUsage WHERE order_id = @orderId) AS coupon_usages
      `)).recordset[0];
    assert(Number(afterCancellation.order_coupons) === 1, "Cancelled shop coupon was not removed.");
    assert(Number(afterCancellation.coupon_usages) === 1, "Cancelled shop coupon usage was not released.");
    assert(repriced.discount === 1000, "Order discount was not recalculated after cancellation.");
    return { pricing: result.pricing, counts: row, afterCancellation: { repriced, counts: afterCancellation } };
  } finally {
    await transaction.rollback();
  }
};

await connectDB();
try {
  const sellers = (await pool.request().query(`
    SELECT TOP 2 id, user_id, shop_name
    FROM Sellers
    ORDER BY id
  `)).recordset;
  const customer = (await pool.request().query(`
    SELECT TOP 1 id
    FROM Users
    WHERE role = 'customer'
    ORDER BY id
  `)).recordset[0];
  assert(sellers.length === 2, "Verification requires two sellers.");
  assert(customer, "Verification requires one customer.");

  const invariant = (await pool.request().query(`
    SELECT COUNT(*) AS invalid_products
    FROM (
      SELECT product_id
      FROM ProductVariants
      GROUP BY product_id
      HAVING SUM(CASE WHEN is_default = 1 AND is_active = 1 THEN 1 ELSE 0 END) <> 1
    ) invalid
  `)).recordset[0];
  assert(Number(invariant.invalid_products) === 0, "Default variant invariant failed.");

  const clock = (await pool.request().query("SELECT GETDATE() AS local_now")).recordset[0];
  assert(Math.abs(Date.now() - new Date(clock.local_now).getTime()) < 60000, "Database time is serialized with the wrong timezone.");

  await verifyReadServices(sellers);
  const checkout = await verifyCheckoutRollback(sellers, customer.id);
  console.log(JSON.stringify({
    status: "success",
    default_variant_invariant: true,
    timezone_round_trip: true,
    checkout
  }, null, 2));
} finally {
  await pool.close();
}
