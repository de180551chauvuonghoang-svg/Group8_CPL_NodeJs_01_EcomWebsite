import { pool, sql } from "../config/db.js";
import {
  paginationMeta,
  parsePagination,
  parseSearch,
  queryError
} from "../utils/queryUtils.js";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const BUSINESS_TIME_ZONE = "Asia/Ho_Chi_Minh";

const getBusinessToday = () => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return new Date(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day)));
};

const normalizeRange = (query = {}) => {
  const hasFrom = query.from !== undefined && query.from !== "";
  const hasTo = query.to !== undefined && query.to !== "";
  if (hasFrom !== hasTo) {
    throw queryError("FINANCE_DATE_RANGE_REQUIRED", "from va to phai duoc gui cung nhau.");
  }
  if (!hasFrom) return { from: null, to: null };
  if (!DATE_PATTERN.test(query.from) || !DATE_PATTERN.test(query.to)) {
    throw queryError("INVALID_FINANCE_DATE", "from va to phai co dinh dang YYYY-MM-DD.");
  }
  const [fromYear, fromMonth, fromDay] = query.from.split("-").map(Number);
  const [toYear, toMonth, toDay] = query.to.split("-").map(Number);
  const fromDate = new Date(Date.UTC(fromYear, fromMonth - 1, fromDay));
  const toDate = new Date(Date.UTC(toYear, toMonth - 1, toDay));
  if (
    fromDate.getUTCFullYear() !== fromYear
    || fromDate.getUTCMonth() !== fromMonth - 1
    || fromDate.getUTCDate() !== fromDay
    || toDate.getUTCFullYear() !== toYear
    || toDate.getUTCMonth() !== toMonth - 1
    || toDate.getUTCDate() !== toDay
  ) {
    throw queryError("INVALID_FINANCE_DATE", "Khoang ngay tai chinh khong hop le.");
  }
  if (fromDate > toDate) {
    throw queryError("INVALID_FINANCE_RANGE", "from khong duoc sau to.");
  }
  if (toDate > getBusinessToday()) {
    throw queryError(
      "FINANCE_FUTURE_DATE_NOT_ALLOWED",
      "Khong duoc truy van bao cao tai chinh o ngay trong tuong lai."
    );
  }
  return { from: query.from, to: query.to };
};

const financeCtes = `
  WITH SellerOrderItems AS (
    SELECT item.id, item.order_id, item.quantity, item.unit_price, item.total_price,
           item.product_name, item.fulfillment_status, orders.user_id,
           orders.created_at AS order_created_at,
           customer.name AS customer_name,
           delivered.created_at AS delivered_at
    FROM OrderItems item
    INNER JOIN Orders orders ON orders.id = item.order_id
    INNER JOIN Users customer ON customer.id = orders.user_id
    INNER JOIN ProductVariants variant ON variant.id = item.variant_id
    INNER JOIN Products product ON product.id = variant.product_id
    OUTER APPLY (
      SELECT TOP 1 history.created_at
      FROM OrderItemStatusHistory history
      WHERE history.order_item_id = item.id AND history.new_status = 'delivered'
      ORDER BY history.created_at DESC
    ) delivered
    WHERE product.seller_id = @sellerId
  ),
  DeliveredOrders AS (
    SELECT order_id, user_id, customer_name,
           SUM(total_price) AS gross_amount,
           SUM(quantity) AS units_sold,
           MAX(COALESCE(delivered_at, order_created_at)) AS recognized_at
    FROM SellerOrderItems
    WHERE fulfillment_status = 'delivered'
    GROUP BY order_id, user_id, customer_name
  ),
  SellerDiscounts AS (
    SELECT delivered.order_id,
           CASE
             WHEN order_coupon.id IS NOT NULL AND order_coupon.eligible_subtotal > 0
               THEN ROUND(order_coupon.discount_amount
                 * delivered.gross_amount / order_coupon.eligible_subtotal, 2)
             WHEN legacy_coupon.seller_id = @sellerId AND seller_subtotal.total_value > 0
               THEN ROUND(orders.discount_amount
                 * delivered.gross_amount / seller_subtotal.total_value, 2)
             ELSE 0
           END AS discount_amount
    FROM DeliveredOrders delivered
    INNER JOIN Orders orders ON orders.id = delivered.order_id
    LEFT JOIN OrderCoupons order_coupon
      ON order_coupon.order_id = delivered.order_id AND order_coupon.seller_id = @sellerId
    LEFT JOIN Coupons legacy_coupon ON legacy_coupon.id = orders.coupon_id
    OUTER APPLY (
      SELECT SUM(total_price) AS total_value
      FROM SellerOrderItems all_items
      WHERE all_items.order_id = delivered.order_id
    ) seller_subtotal
  ),
  SalesTransactions AS (
    SELECT 'sale' AS transaction_type, item.order_id, item.id AS order_item_id,
           CAST(NULL AS VARCHAR(50)) AS return_id,
           item.customer_name,
           item.product_name AS description,
           item.total_price AS gross_amount,
           CASE WHEN delivered.gross_amount > 0
             THEN ROUND(COALESCE(discount.discount_amount, 0) * item.total_price / delivered.gross_amount, 2)
             ELSE 0
           END AS discount_amount,
           CAST(0 AS DECIMAL(18,2)) AS return_amount,
           item.total_price - CASE WHEN delivered.gross_amount > 0
             THEN ROUND(COALESCE(discount.discount_amount, 0) * item.total_price / delivered.gross_amount, 2)
             ELSE 0
           END AS net_amount,
           item.quantity AS units_sold,
           COALESCE(item.delivered_at, item.order_created_at) AS recognized_at
    FROM SellerOrderItems item
    INNER JOIN DeliveredOrders delivered ON delivered.order_id = item.order_id
    LEFT JOIN SellerDiscounts discount ON discount.order_id = delivered.order_id
    WHERE item.fulfillment_status = 'delivered'
  ),
  ReturnTransactions AS (
    SELECT 'return' AS transaction_type, item.order_id, item.id AS order_item_id,
           return_request.id AS return_id,
           customer.name AS customer_name,
           CONCAT(N'Tra hang: ', item.product_name) AS description,
           CAST(0 AS DECIMAL(18,2)) AS gross_amount,
           CAST(0 AS DECIMAL(18,2)) AS discount_amount,
           CAST(return_request.quantity * item.unit_price AS DECIMAL(18,2)) AS return_amount,
           CAST(-(return_request.quantity * item.unit_price) AS DECIMAL(18,2)) AS net_amount,
           -return_request.quantity AS units_sold,
           return_request.returned_at AS recognized_at
    FROM ReturnRequests return_request
    INNER JOIN OrderItems item ON item.id = return_request.order_item_id
    INNER JOIN Users customer ON customer.id = return_request.customer_user_id
    WHERE return_request.seller_id = @sellerId
      AND return_request.status = 'item_returned'
  ),
  FinanceTransactions AS (
    SELECT * FROM SalesTransactions
    UNION ALL
    SELECT * FROM ReturnTransactions
  )
`;

const bindRange = (request, sellerId, range) => request
  .input("sellerId", sql.VarChar, sellerId)
  .input("from", sql.Date, range.from)
  .input("to", sql.Date, range.to);

const mapMoney = (value) => Number(value || 0);

export const getFinanceSummary = async (sellerId, query = {}) => {
  const range = normalizeRange(query);
  const request = bindRange(pool.request(), sellerId, range);
  const result = await request.query(`
    ${financeCtes}
    SELECT
      COALESCE(SUM(gross_amount), 0) AS gross_sales,
      COALESCE(SUM(discount_amount), 0) AS voucher_discount,
      COALESCE(SUM(return_amount), 0) AS returned_amount,
      COALESCE(SUM(net_amount), 0) AS net_revenue,
      COALESCE(SUM(units_sold), 0) AS net_units,
      COUNT(DISTINCT CASE WHEN transaction_type = 'sale' THEN order_id END) AS delivered_orders,
      COUNT(CASE WHEN transaction_type = 'return' THEN 1 END) AS completed_returns
    FROM FinanceTransactions
    WHERE (@from IS NULL OR recognized_at >= @from)
      AND (@to IS NULL OR recognized_at < DATEADD(DAY, 1, @to));

    SELECT COALESCE(SUM(item.total_price), 0) AS pending_revenue,
           COUNT(DISTINCT item.order_id) AS pending_orders
    FROM OrderItems item
    INNER JOIN ProductVariants variant ON variant.id = item.variant_id
    INNER JOIN Products product ON product.id = variant.product_id
    WHERE product.seller_id = @sellerId
      AND item.fulfillment_status IN ('pending_fulfillment', 'ready_to_ship', 'shipping');
  `);
  const summary = result.recordsets[0][0];
  const pending = result.recordsets[1][0];
  return {
    period: range,
    gross_sales: mapMoney(summary.gross_sales),
    voucher_discount: mapMoney(summary.voucher_discount),
    returned_amount: mapMoney(summary.returned_amount),
    net_revenue: mapMoney(summary.net_revenue),
    net_units: Number(summary.net_units || 0),
    delivered_orders: Number(summary.delivered_orders || 0),
    completed_returns: Number(summary.completed_returns || 0),
    pending_revenue: mapMoney(pending.pending_revenue),
    pending_orders: Number(pending.pending_orders || 0),
    note: "Read-only estimate; payout and payment gateway reconciliation are not included."
  };
};

export const getFinanceTransactions = async (sellerId, query = {}) => {
  const range = normalizeRange(query);
  const { page, limit, offset } = parsePagination(query);
  const search = parseSearch(query.search);
  const type = String(query.type || query.status || "all").toLowerCase();
  if (!["all", "sale", "return"].includes(type)) {
    throw queryError("INVALID_FINANCE_TYPE", "type chi nhan all, sale hoac return.");
  }
  const request = bindRange(pool.request(), sellerId, range)
    .input("type", sql.VarChar, type)
    .input("search", sql.NVarChar, search || null)
    .input("offset", sql.Int, offset)
    .input("limit", sql.Int, limit);
  const result = await request.query(`
    ${financeCtes}
    SELECT COUNT(*) OVER() AS total_count, *
    FROM FinanceTransactions
    WHERE (@from IS NULL OR recognized_at >= @from)
      AND (@to IS NULL OR recognized_at < DATEADD(DAY, 1, @to))
      AND (@type = 'all' OR transaction_type = @type)
      AND (@search IS NULL OR order_id LIKE '%' + @search + '%'
        OR description LIKE '%' + @search + '%'
        OR customer_name LIKE '%' + @search + '%')
    ORDER BY recognized_at DESC, order_id DESC
    OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
  `);
  const total = Number(result.recordset[0]?.total_count || 0);
  return {
    transactions: result.recordset.map(({ total_count, ...row }) => ({
      ...row,
      gross_amount: mapMoney(row.gross_amount),
      discount_amount: mapMoney(row.discount_amount),
      return_amount: mapMoney(row.return_amount),
      net_amount: mapMoney(row.net_amount),
      units_sold: Number(row.units_sold || 0)
    })),
    pagination: paginationMeta(page, limit, total)
  };
};
