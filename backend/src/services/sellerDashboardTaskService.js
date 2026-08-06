import { pool, sql } from "../config/db.js";

export const SELLER_TASK_OVERDUE_HOURS = 24;

export const sellerDashboardTaskService = {
  getTasks: async (sellerId, sellerUserId) => {
    const result = await pool.request()
      .input("sellerId", sql.VarChar, sellerId)
      .input("sellerUserId", sql.VarChar, sellerUserId)
      .input("overdueAfterHours", sql.Int, SELLER_TASK_OVERDUE_HOURS)
      .query(`
        SELECT
          (
            SELECT COUNT(DISTINCT item.order_id)
            FROM OrderItems item
            INNER JOIN ProductVariants variant ON variant.id = item.variant_id
            INNER JOIN Products product ON product.id = variant.product_id
            WHERE product.seller_id = @sellerId
              AND item.fulfillment_status = 'pending_fulfillment'
          ) AS orders_to_process,
          (
            SELECT COUNT(DISTINCT item.order_id)
            FROM OrderItems item
            INNER JOIN ProductVariants variant ON variant.id = item.variant_id
            INNER JOIN Products product ON product.id = variant.product_id
            WHERE product.seller_id = @sellerId
              AND item.fulfillment_status = 'pending_fulfillment'
              AND item.created_at < DATEADD(HOUR, -@overdueAfterHours, GETDATE())
          ) AS overdue_orders,
          (
            SELECT COUNT(*)
            FROM Messages message
            WHERE message.receiver_id = @sellerUserId
              AND message.is_read = 0
          ) AS unread_messages,
          (
            SELECT COUNT(*)
            FROM Products product
            INNER JOIN ProductVariants variant
              ON variant.product_id = product.id AND variant.is_default = 1
            WHERE product.seller_id = @sellerId
              AND product.is_active = 1
              AND variant.stock_qty = 0
          ) AS out_of_stock_products,
          (
            SELECT COUNT(*)
            FROM Products product
            INNER JOIN ProductVariants variant
              ON variant.product_id = product.id AND variant.is_default = 1
            WHERE product.seller_id = @sellerId
              AND product.is_active = 1
              AND variant.stock_qty > 0
              AND variant.stock_qty <= variant.low_stock_threshold
          ) AS low_stock_products,
          (
            SELECT COUNT(*)
            FROM Reviews review
            INNER JOIN Products product ON product.id = review.product_id
            WHERE product.seller_id = @sellerId
              AND review.deleted_at IS NULL
              AND review.is_approved = 1
              AND review.seller_reply IS NULL
          ) AS unreplied_reviews,
          (
            SELECT COUNT(*)
            FROM ReturnRequests return_request
            WHERE return_request.seller_id = @sellerId
              AND return_request.status = 'requested'
          ) AS pending_returns
      `);

    const row = result.recordset[0] || {};
    return {
      ...Object.fromEntries(
        Object.entries(row).map(([key, value]) => [key, Number(value || 0)])
      ),
      overdue_after_hours: SELLER_TASK_OVERDUE_HOURS
    };
  }
};
