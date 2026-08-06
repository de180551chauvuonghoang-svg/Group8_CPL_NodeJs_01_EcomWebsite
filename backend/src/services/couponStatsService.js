import { pool, sql } from "../config/db.js";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ALLOWED_STATUSES = new Set([
  "all",
  "active",
  "scheduled",
  "expired",
  "disabled",
  "exhausted"
]);
const ALLOWED_SORTS = new Set([
  "created_at",
  "code",
  "redemptions",
  "attributed_order_value",
  "discount_amount",
  "usage_rate"
]);

export const couponStatsError = (code, message, statusCode = 400) => {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  error.status = "fail";
  return error;
};

const parsePositiveInteger = (value, fallback, fieldName, max) => {
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > max) {
    throw couponStatsError(
      "INVALID_COUPON_STATS_QUERY",
      `${fieldName} must be an integer from 1 to ${max}.`
    );
  }
  return parsed;
};

const parseDate = (value, fieldName) => {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) {
    throw couponStatsError(
      "INVALID_COUPON_STATS_DATE",
      `${fieldName} must use YYYY-MM-DD format.`
    );
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw couponStatsError(
      "INVALID_COUPON_STATS_DATE",
      `${fieldName} is not a valid date.`
    );
  }
  return date;
};

const normalizeFilters = (query = {}) => {
  const hasFrom = query.from !== undefined && query.from !== "";
  const hasTo = query.to !== undefined && query.to !== "";
  if (hasFrom !== hasTo) {
    throw couponStatsError(
      "COUPON_STATS_DATE_RANGE_REQUIRED",
      "from and to must be provided together."
    );
  }

  let from = null;
  let to = null;
  if (hasFrom) {
    const fromDate = parseDate(query.from, "from");
    const toDate = parseDate(query.to, "to");
    if (fromDate > toDate) {
      throw couponStatsError(
        "INVALID_COUPON_STATS_RANGE",
        "from cannot be after to."
      );
    }
    from = query.from;
    to = query.to;
  }

  const status = String(query.status || "all").toLowerCase();
  if (!ALLOWED_STATUSES.has(status)) {
    throw couponStatsError(
      "INVALID_COUPON_STATUS_FILTER",
      "status must be all, active, scheduled, expired, disabled, or exhausted."
    );
  }

  const sortBy = String(query.sortBy || "redemptions");
  if (!ALLOWED_SORTS.has(sortBy)) {
    throw couponStatsError(
      "INVALID_COUPON_STATS_SORT",
      "Unsupported sortBy value."
    );
  }

  const sortOrder = String(query.sortOrder || "desc").toLowerCase();
  if (!["asc", "desc"].includes(sortOrder)) {
    throw couponStatsError(
      "INVALID_COUPON_STATS_SORT",
      "sortOrder must be asc or desc."
    );
  }

  const search = String(query.search || "").trim().toLowerCase();
  if (search.length > 100) {
    throw couponStatsError(
      "INVALID_COUPON_STATS_QUERY",
      "search cannot exceed 100 characters."
    );
  }

  return {
    from,
    to,
    status,
    search,
    couponId: query.couponId ? String(query.couponId).trim() : null,
    sortBy,
    sortOrder,
    page: parsePositiveInteger(query.page, 1, "page", 1000000),
    limit: parsePositiveInteger(query.limit, 20, "limit", 100)
  };
};

const getCouponStatus = (coupon, now) => {
  if (!coupon.is_active) return "disabled";
  if (coupon.starts_at && new Date(coupon.starts_at) > now) return "scheduled";
  if (coupon.expires_at && new Date(coupon.expires_at) < now) return "expired";
  if (
    coupon.usage_limit !== null &&
    Number(coupon.used_count || 0) >= Number(coupon.usage_limit)
  ) {
    return "exhausted";
  }
  return "active";
};

const toNumber = (value) => Number(value || 0);

const mapCoupon = (row, now) => {
  const usageLimit = row.usage_limit === null ? null : Number(row.usage_limit);
  const usedCount = Number(row.used_count || 0);
  const usageRate = usageLimit
    ? Math.round((usedCount / usageLimit) * 10000) / 100
    : null;

  return {
    id: row.id,
    code: row.code,
    description: row.description,
    status: getCouponStatus(row, now),
    discount_type: row.discount_type,
    discount_value: toNumber(row.discount_value),
    min_order_amount: row.min_order_amount === null ? null : toNumber(row.min_order_amount),
    max_discount_amount: row.max_discount_amt === null ? null : toNumber(row.max_discount_amt),
    starts_at: row.starts_at,
    expires_at: row.expires_at,
    is_active: Boolean(row.is_active),
    created_at: row.created_at,
    usage_limit: usageLimit,
    used_count: usedCount,
    remaining_uses: usageLimit === null ? null : Math.max(0, usageLimit - usedCount),
    usage_rate: usageRate,
    redemptions: toNumber(row.redemptions),
    unique_customers: toNumber(row.unique_customers),
    attributed_order_value: toNumber(row.attributed_order_value),
    discount_amount: toNumber(row.discount_amount),
    net_order_value: toNumber(row.net_order_value),
    delivered_orders: toNumber(row.delivered_orders),
    delivered_gross_revenue: toNumber(row.delivered_gross_revenue),
    last_used_at: row.last_used_at || null
  };
};

const compareCoupons = (left, right, sortBy, sortOrder) => {
  const direction = sortOrder === "asc" ? 1 : -1;
  const leftValue = left[sortBy];
  const rightValue = right[sortBy];

  if (sortBy === "created_at") {
    return (new Date(leftValue).getTime() - new Date(rightValue).getTime()) * direction;
  }
  if (sortBy === "code") {
    return String(leftValue).localeCompare(String(rightValue)) * direction;
  }
  return (Number(leftValue || 0) - Number(rightValue || 0)) * direction;
};

const emptyStatusSummary = () => ({
  active: 0,
  scheduled: 0,
  expired: 0,
  disabled: 0,
  exhausted: 0
});

export const couponStatsService = {
  getSellerCouponStats: async (sellerId, query = {}) => {
    const filters = normalizeFilters(query);
    const result = await pool.request()
      .input("sellerId", sql.VarChar, sellerId)
      .input("from", sql.VarChar, filters.from)
      .input("to", sql.VarChar, filters.to)
      .query(`
        SELECT
          usage.coupon_id,
          usage.user_id,
          usage.used_at,
          usage.order_id,
          CAST(item_values.attributed_order_value AS DECIMAL(18, 2)) AS attributed_order_value,
          CAST(item_values.delivered_gross_revenue AS DECIMAL(18, 2)) AS delivered_gross_revenue,
          item_values.delivered_item_count,
          CAST(COALESCE(
            order_coupon.discount_amount,
            CASE WHEN order_row.coupon_id = usage.coupon_id THEN order_row.discount_amount ELSE 0 END
          ) AS DECIMAL(18, 2)) AS discount_amount
        INTO #EligibleCouponUsage
        FROM CouponUsage usage
        INNER JOIN Coupons coupon ON coupon.id = usage.coupon_id
        INNER JOIN Orders order_row ON order_row.id = usage.order_id
        LEFT JOIN OrderCoupons order_coupon
          ON order_coupon.order_id = usage.order_id
          AND order_coupon.coupon_id = usage.coupon_id
        CROSS APPLY (
          SELECT
            COALESCE(SUM(CASE
              WHEN item.fulfillment_status <> 'cancelled' THEN item.total_price
              ELSE 0
            END), 0) AS attributed_order_value,
            COALESCE(SUM(CASE
              WHEN item.fulfillment_status = 'delivered' THEN item.total_price
              ELSE 0
            END), 0) AS delivered_gross_revenue,
            SUM(CASE WHEN item.fulfillment_status <> 'cancelled' THEN 1 ELSE 0 END) AS active_item_count,
            SUM(CASE WHEN item.fulfillment_status = 'delivered' THEN 1 ELSE 0 END) AS delivered_item_count
          FROM OrderItems item
          INNER JOIN ProductVariants variant ON variant.id = item.variant_id
          INNER JOIN Products product ON product.id = variant.product_id
          WHERE item.order_id = order_row.id
            AND product.seller_id = coupon.seller_id
        ) item_values
        WHERE coupon.seller_id = @sellerId
          AND coupon.deleted_at IS NULL
          AND order_row.status NOT IN ('cancelled', 'failed', 'refunded')
          AND item_values.active_item_count > 0
          AND (@from IS NULL OR usage.used_at >= CONVERT(DATE, @from, 23))
          AND (@to IS NULL OR usage.used_at < DATEADD(DAY, 1, CONVERT(DATE, @to, 23)));

        SELECT
          coupon.id,
          coupon.code,
          coupon.description,
          coupon.discount_type,
          coupon.discount_value,
          coupon.min_order_amount,
          coupon.max_discount_amt,
          coupon.usage_limit,
          coupon.used_count,
          coupon.starts_at,
          coupon.expires_at,
          coupon.is_active,
          coupon.created_at,
          COUNT(usage.order_id) AS redemptions,
          COUNT(DISTINCT usage.user_id) AS unique_customers,
          COALESCE(SUM(usage.attributed_order_value), 0) AS attributed_order_value,
          COALESCE(SUM(usage.discount_amount), 0) AS discount_amount,
          COALESCE(SUM(CASE
            WHEN usage.attributed_order_value > usage.discount_amount
              THEN usage.attributed_order_value - usage.discount_amount
            ELSE 0
          END), 0) AS net_order_value,
          COUNT(DISTINCT CASE
            WHEN usage.delivered_item_count > 0 THEN usage.order_id
          END) AS delivered_orders,
          COALESCE(SUM(usage.delivered_gross_revenue), 0) AS delivered_gross_revenue,
          MAX(usage.used_at) AS last_used_at
        FROM Coupons coupon
        LEFT JOIN #EligibleCouponUsage usage ON usage.coupon_id = coupon.id
        WHERE coupon.seller_id = @sellerId
          AND coupon.deleted_at IS NULL
        GROUP BY
          coupon.id, coupon.code, coupon.description, coupon.discount_type,
          coupon.discount_value, coupon.min_order_amount, coupon.max_discount_amt,
          coupon.usage_limit, coupon.used_count, coupon.starts_at, coupon.expires_at,
          coupon.is_active, coupon.created_at;

        SELECT DISTINCT coupon_id, user_id
        FROM #EligibleCouponUsage;

        DROP TABLE #EligibleCouponUsage;
      `);

    const now = new Date();
    let coupons = result.recordsets[0].map((row) => mapCoupon(row, now));
    if (filters.couponId) {
      coupons = coupons.filter((coupon) => coupon.id === filters.couponId);
    }
    if (filters.status !== "all") {
      coupons = coupons.filter((coupon) => coupon.status === filters.status);
    }
    if (filters.search) {
      coupons = coupons.filter((coupon) => (
        coupon.code.toLowerCase().includes(filters.search) ||
        String(coupon.description || "").toLowerCase().includes(filters.search)
      ));
    }

    const couponIds = new Set(coupons.map((coupon) => coupon.id));
    const uniqueCustomerIds = new Set(
      result.recordsets[1]
        .filter((row) => couponIds.has(row.coupon_id))
        .map((row) => row.user_id)
    );
    const statusCounts = emptyStatusSummary();
    const summary = coupons.reduce((totals, coupon) => {
      statusCounts[coupon.status] += 1;
      totals.total_redemptions += coupon.redemptions;
      totals.attributed_order_value += coupon.attributed_order_value;
      totals.discount_amount += coupon.discount_amount;
      totals.net_order_value += coupon.net_order_value;
      totals.delivered_orders += coupon.delivered_orders;
      totals.delivered_gross_revenue += coupon.delivered_gross_revenue;
      return totals;
    }, {
      total_redemptions: 0,
      attributed_order_value: 0,
      discount_amount: 0,
      net_order_value: 0,
      delivered_orders: 0,
      delivered_gross_revenue: 0
    });

    coupons.sort((left, right) => {
      const compared = compareCoupons(left, right, filters.sortBy, filters.sortOrder);
      if (compared !== 0) return compared;
      return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
    });

    const total = coupons.length;
    const totalPages = total === 0 ? 0 : Math.ceil(total / filters.limit);
    const offset = (filters.page - 1) * filters.limit;
    const pageCoupons = coupons.slice(offset, offset + filters.limit);

    return {
      generated_at: now.toISOString(),
      timezone: "Asia/Ho_Chi_Minh",
      metric_rule: {
        usage_date: "CouponUsage.used_at",
        cancelled_orders: "excluded",
        attributed_order_value: "non_cancelled_items_of_coupon_seller",
        delivered_revenue: "delivered_items_gross_before_discount"
      },
      filters: {
        from: filters.from,
        to: filters.to,
        status: filters.status,
        search: filters.search || null,
        coupon_id: filters.couponId
      },
      summary: {
        total_coupons: total,
        coupon_status: statusCounts,
        ...summary,
        unique_customers: uniqueCustomerIds.size
      },
      coupons: pageCoupons,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        total_pages: totalPages
      }
    };
  }
};
