import { pool, sql } from "../config/db.js";

const PERIOD_CONFIG = Object.freeze({
  day: { defaultBuckets: 30, maxBuckets: 366 },
  month: { defaultBuckets: 12, maxBuckets: 60 },
  year: { defaultBuckets: 5, maxBuckets: 10 }
});
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const analyticsError = (code, message, statusCode = 400) => {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  error.status = "fail";
  return error;
};

const formatDate = (date) => [
  date.getUTCFullYear(),
  String(date.getUTCMonth() + 1).padStart(2, "0"),
  String(date.getUTCDate()).padStart(2, "0")
].join("-");

const getVietnamToday = () => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return new Date(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day)));
};

const parseDate = (value, fieldName) => {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) {
    throw analyticsError("INVALID_ANALYTICS_DATE", `${fieldName} phải có định dạng YYYY-MM-DD.`);
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw analyticsError("INVALID_ANALYTICS_DATE", `${fieldName} không phải ngày hợp lệ.`);
  }
  return date;
};

const shiftDate = (date, period, amount) => {
  if (period === "month") {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1));
  }
  if (period === "year") {
    return new Date(Date.UTC(date.getUTCFullYear() + amount, 0, 1));
  }
  const shifted = new Date(date);
  shifted.setUTCDate(shifted.getUTCDate() + amount);
  return shifted;
};

const startOfBucket = (date, period) => {
  if (period === "month") {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  }
  if (period === "year") {
    return new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  }
  return new Date(date);
};

const bucketKey = (date, period) => {
  if (period === "year") return String(date.getUTCFullYear());
  if (period === "month") return formatDate(date).slice(0, 7);
  return formatDate(date);
};

const bucketLabel = (date, period) => {
  if (period === "year") return String(date.getUTCFullYear());
  if (period === "month") {
    return `${String(date.getUTCMonth() + 1).padStart(2, "0")}/${date.getUTCFullYear()}`;
  }
  return `${String(date.getUTCDate()).padStart(2, "0")}/${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
};

const buildBuckets = (fromDate, toDate, period) => {
  const buckets = [];
  const maxBuckets = PERIOD_CONFIG[period].maxBuckets;
  let cursor = startOfBucket(fromDate, period);
  const lastBucket = startOfBucket(toDate, period);

  while (cursor <= lastBucket) {
    if (buckets.length >= maxBuckets) {
      throw analyticsError(
        "ANALYTICS_RANGE_TOO_LARGE",
        `Khoảng thời gian vượt quá ${maxBuckets} mốc ${period}.`
      );
    }
    buckets.push({
      key: bucketKey(cursor, period),
      label: bucketLabel(cursor, period),
      orders_created: 0,
      units_ordered: 0,
      gross_revenue: 0,
      delivered_orders: 0,
      units_sold: 0,
      pending_fulfillment: 0,
      ready_to_ship: 0,
      shipping: 0,
      delivered: 0,
      cancelled: 0
    });
    cursor = shiftDate(cursor, period, 1);
  }
  return buckets;
};

const resolveRange = (query = {}) => {
  const period = query.period || "day";
  if (!PERIOD_CONFIG[period]) {
    throw analyticsError(
      "INVALID_ANALYTICS_PERIOD",
      "period chỉ chấp nhận day, month hoặc year."
    );
  }

  const hasFrom = query.from !== undefined && query.from !== "";
  const hasTo = query.to !== undefined && query.to !== "";
  if (hasFrom !== hasTo) {
    throw analyticsError(
      "ANALYTICS_DATE_RANGE_REQUIRED",
      "Khi lọc tùy chỉnh, from và to phải được gửi cùng nhau."
    );
  }

  let fromDate;
  let toDate;
  if (hasFrom) {
    fromDate = parseDate(query.from, "from");
    toDate = parseDate(query.to, "to");
  } else {
    toDate = getVietnamToday();
    fromDate = startOfBucket(
      shiftDate(toDate, period, -(PERIOD_CONFIG[period].defaultBuckets - 1)),
      period
    );
  }

  if (fromDate > toDate) {
    throw analyticsError("INVALID_ANALYTICS_RANGE", "Ngày bắt đầu không được sau ngày kết thúc.");
  }

  const buckets = buildBuckets(fromDate, toDate, period);
  return {
    period,
    from: formatDate(fromDate),
    to: formatDate(toDate),
    buckets
  };
};

const sqlBucketExpression = (column, period) => {
  if (period === "year") return `CONVERT(VARCHAR(4), YEAR(${column}))`;
  if (period === "month") {
    return `CONCAT(YEAR(${column}), '-', RIGHT('0' + CONVERT(VARCHAR(2), MONTH(${column})), 2))`;
  }
  return `CONVERT(CHAR(10), ${column}, 23)`;
};

const emptyStatusCounts = () => ({
  pending_fulfillment: 0,
  ready_to_ship: 0,
  shipping: 0,
  delivered: 0,
  cancelled: 0
});

const mapStatusCounts = (row = {}) => ({
  pending_fulfillment: Number(row.pending_fulfillment || 0),
  ready_to_ship: Number(row.ready_to_ship || 0),
  shipping: Number(row.shipping || 0),
  delivered: Number(row.delivered || 0),
  cancelled: Number(row.cancelled || 0)
});

export const sellerAnalyticsService = {
  getDashboardAnalytics: async (sellerId, query = {}) => {
    const range = resolveRange(query);
    const createdBucket = sqlBucketExpression("item.created_at", range.period);
    const deliveredBucket = sqlBucketExpression("recognized.recognized_at", range.period);
    const eventBucket = sqlBucketExpression("history.created_at", range.period);

    const result = await pool.request()
      .input("sellerId", sql.VarChar, sellerId)
      .input("from", sql.VarChar, range.from)
      .input("to", sql.VarChar, range.to)
      .query(`
        SELECT
          ${createdBucket} AS bucket_key,
          COUNT(DISTINCT item.order_id) AS orders_created,
          COALESCE(SUM(item.quantity), 0) AS units_ordered
        FROM OrderItems item
        INNER JOIN ProductVariants variant ON variant.id = item.variant_id
        INNER JOIN Products product ON product.id = variant.product_id
        WHERE product.seller_id = @sellerId
          AND item.created_at >= CONVERT(DATE, @from, 23)
          AND item.created_at < DATEADD(DAY, 1, CONVERT(DATE, @to, 23))
        GROUP BY ${createdBucket};

        SELECT
          COUNT(DISTINCT item.order_id) AS orders_created,
          COALESCE(SUM(item.quantity), 0) AS units_ordered
        FROM OrderItems item
        INNER JOIN ProductVariants variant ON variant.id = item.variant_id
        INNER JOIN Products product ON product.id = variant.product_id
        WHERE product.seller_id = @sellerId
          AND item.created_at >= CONVERT(DATE, @from, 23)
          AND item.created_at < DATEADD(DAY, 1, CONVERT(DATE, @to, 23));

        SELECT
          ${deliveredBucket} AS bucket_key,
          COALESCE(SUM(item.total_price), 0) AS gross_revenue,
          COUNT(DISTINCT item.order_id) AS delivered_orders,
          COALESCE(SUM(item.quantity), 0) AS units_sold
        FROM OrderItems item
        INNER JOIN ProductVariants variant ON variant.id = item.variant_id
        INNER JOIN Products product ON product.id = variant.product_id
        OUTER APPLY (
          SELECT TOP 1 status_history.created_at AS delivered_at
          FROM OrderItemStatusHistory status_history
          WHERE status_history.order_item_id = item.id
            AND status_history.new_status = 'delivered'
          ORDER BY status_history.created_at ASC, status_history.id ASC
        ) delivered_event
        CROSS APPLY (
          SELECT COALESCE(delivered_event.delivered_at, item.updated_at, item.created_at) AS recognized_at
        ) recognized
        WHERE product.seller_id = @sellerId
          AND item.fulfillment_status = 'delivered'
          AND recognized.recognized_at >= CONVERT(DATE, @from, 23)
          AND recognized.recognized_at < DATEADD(DAY, 1, CONVERT(DATE, @to, 23))
        GROUP BY ${deliveredBucket};

        SELECT
          COALESCE(SUM(item.total_price), 0) AS gross_revenue,
          COUNT(DISTINCT item.order_id) AS delivered_orders,
          COALESCE(SUM(item.quantity), 0) AS units_sold
        FROM OrderItems item
        INNER JOIN ProductVariants variant ON variant.id = item.variant_id
        INNER JOIN Products product ON product.id = variant.product_id
        OUTER APPLY (
          SELECT TOP 1 status_history.created_at AS delivered_at
          FROM OrderItemStatusHistory status_history
          WHERE status_history.order_item_id = item.id
            AND status_history.new_status = 'delivered'
          ORDER BY status_history.created_at ASC, status_history.id ASC
        ) delivered_event
        CROSS APPLY (
          SELECT COALESCE(delivered_event.delivered_at, item.updated_at, item.created_at) AS recognized_at
        ) recognized
        WHERE product.seller_id = @sellerId
          AND item.fulfillment_status = 'delivered'
          AND recognized.recognized_at >= CONVERT(DATE, @from, 23)
          AND recognized.recognized_at < DATEADD(DAY, 1, CONVERT(DATE, @to, 23));

        SELECT
          ${eventBucket} AS bucket_key,
          SUM(CASE WHEN history.new_status = 'pending_fulfillment' THEN 1 ELSE 0 END) AS pending_fulfillment,
          SUM(CASE WHEN history.new_status = 'ready_to_ship' THEN 1 ELSE 0 END) AS ready_to_ship,
          SUM(CASE WHEN history.new_status IN ('shipping', 'shipped') THEN 1 ELSE 0 END) AS shipping,
          SUM(CASE WHEN history.new_status = 'delivered' THEN 1 ELSE 0 END) AS delivered,
          SUM(CASE WHEN history.new_status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled
        FROM OrderItemStatusHistory history
        INNER JOIN OrderItems item ON item.id = history.order_item_id
        INNER JOIN ProductVariants variant ON variant.id = item.variant_id
        INNER JOIN Products product ON product.id = variant.product_id
        WHERE product.seller_id = @sellerId
          AND history.created_at >= CONVERT(DATE, @from, 23)
          AND history.created_at < DATEADD(DAY, 1, CONVERT(DATE, @to, 23))
        GROUP BY ${eventBucket};

        SELECT
          SUM(CASE WHEN item.fulfillment_status = 'pending_fulfillment' THEN 1 ELSE 0 END) AS pending_fulfillment,
          SUM(CASE WHEN item.fulfillment_status = 'ready_to_ship' THEN 1 ELSE 0 END) AS ready_to_ship,
          SUM(CASE WHEN item.fulfillment_status IN ('shipping', 'shipped') THEN 1 ELSE 0 END) AS shipping,
          SUM(CASE WHEN item.fulfillment_status = 'delivered' THEN 1 ELSE 0 END) AS delivered,
          SUM(CASE WHEN item.fulfillment_status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled
        FROM OrderItems item
        INNER JOIN ProductVariants variant ON variant.id = item.variant_id
        INNER JOIN Products product ON product.id = variant.product_id
        WHERE product.seller_id = @sellerId
          AND item.created_at >= CONVERT(DATE, @from, 23)
          AND item.created_at < DATEADD(DAY, 1, CONVERT(DATE, @to, 23));
      `);

    const seriesByKey = new Map(range.buckets.map((bucket) => [bucket.key, bucket]));
    for (const row of result.recordsets[0]) {
      const bucket = seriesByKey.get(row.bucket_key);
      if (!bucket) continue;
      bucket.orders_created = Number(row.orders_created || 0);
      bucket.units_ordered = Number(row.units_ordered || 0);
    }
    for (const row of result.recordsets[2]) {
      const bucket = seriesByKey.get(row.bucket_key);
      if (!bucket) continue;
      bucket.gross_revenue = Number(row.gross_revenue || 0);
      bucket.delivered_orders = Number(row.delivered_orders || 0);
      bucket.units_sold = Number(row.units_sold || 0);
    }
    for (const row of result.recordsets[4]) {
      const bucket = seriesByKey.get(row.bucket_key);
      if (!bucket) continue;
      Object.assign(bucket, mapStatusCounts(row));
    }

    const createdSummary = result.recordsets[1][0] || {};
    const deliveredSummary = result.recordsets[3][0] || {};
    const currentStatus = result.recordsets[5][0]
      ? mapStatusCounts(result.recordsets[5][0])
      : emptyStatusCounts();
    const grossRevenue = Number(deliveredSummary.gross_revenue || 0);
    const deliveredOrders = Number(deliveredSummary.delivered_orders || 0);

    return {
      period: range.period,
      from: range.from,
      to: range.to,
      timezone: "Asia/Ho_Chi_Minh",
      revenue_rule: "delivered_items_gross",
      summary: {
        orders_created: Number(createdSummary.orders_created || 0),
        units_ordered: Number(createdSummary.units_ordered || 0),
        gross_revenue: grossRevenue,
        delivered_orders: deliveredOrders,
        units_sold: Number(deliveredSummary.units_sold || 0),
        average_delivered_order_value: deliveredOrders > 0
          ? Math.round((grossRevenue / deliveredOrders) * 100) / 100
          : 0,
        current_status: currentStatus
      },
      series: range.buckets
    };
  }
};
