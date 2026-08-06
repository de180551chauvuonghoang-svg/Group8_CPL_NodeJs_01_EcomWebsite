import { pool, sql } from "../config/db.js";

export const getSellerDashboardStats = async (sellerId) => {
  const productCountRes = await pool
    .request()
    .input("sellerId", sql.VarChar, sellerId)
    .query(
      "SELECT COUNT(*) AS total_products FROM Products WHERE seller_id = @sellerId",
    );

  const salesRes = await pool.request().input("sellerId", sql.VarChar, sellerId)
    .query(`
      SELECT
        ISNULL(SUM(CASE
          WHEN oi.fulfillment_status = 'delivered' THEN oi.total_price
          ELSE 0
        END), 0) AS total_revenue,
        COUNT(DISTINCT CASE
          WHEN oi.fulfillment_status <> 'cancelled' THEN oi.order_id
        END) AS total_orders
      FROM OrderItems oi
      JOIN ProductVariants pv ON oi.variant_id = pv.id
      JOIN Products p ON pv.product_id = p.id
      WHERE p.seller_id = @sellerId
    `);

  const pendingRes = await pool
    .request()
    .input("sellerId", sql.VarChar, sellerId).query(`
      SELECT COUNT(DISTINCT oi.order_id) AS pending_orders
      FROM OrderItems oi
      JOIN ProductVariants pv ON oi.variant_id = pv.id
      JOIN Products p ON pv.product_id = p.id
      WHERE p.seller_id = @sellerId
        AND oi.fulfillment_status IN ('pending_fulfillment', 'ready_to_ship')
    `);

  const lowStockRes = await pool
    .request()
    .input("sellerId", sql.VarChar, sellerId).query(`
      SELECT COUNT(*) AS low_stock
      FROM ProductVariants pv
      JOIN Products p ON pv.product_id = p.id
      WHERE p.seller_id = @sellerId
        AND ISNULL(p.is_active, 1) = 1
        AND pv.is_active = 1
        AND pv.is_default = 1
        AND pv.stock_qty <= pv.low_stock_threshold
    `);

  const topProductsRes = await pool
    .request()
    .input("sellerId", sql.VarChar, sellerId).query(`
      SELECT TOP 5 p.id, p.name, image.image_url,
             SUM(oi.quantity) AS sold_qty, SUM(oi.total_price) AS revenue
      FROM OrderItems oi
      JOIN ProductVariants pv ON oi.variant_id = pv.id
      JOIN Products p ON pv.product_id = p.id
      OUTER APPLY (
        SELECT TOP 1 product_image.image_url
        FROM ProductImages product_image
        WHERE product_image.product_id = p.id
        ORDER BY product_image.is_primary DESC, product_image.sort_order ASC, product_image.id ASC
      ) image
      WHERE p.seller_id = @sellerId
        AND oi.fulfillment_status = 'delivered'
      GROUP BY p.id, p.name, image.image_url
      ORDER BY sold_qty DESC, revenue DESC
    `);

  const topRatedProductsRes = await pool
    .request()
    .input("sellerId", sql.VarChar, sellerId).query(`
      SELECT TOP 5 product.id, product.name, image.image_url,
             CAST(AVG(CAST(review.rating AS DECIMAL(10,2))) AS DECIMAL(10,2)) AS rating,
             COUNT(*) AS reviews_count
      FROM Reviews review
      INNER JOIN Products product ON product.id = review.product_id
      OUTER APPLY (
        SELECT TOP 1 product_image.image_url
        FROM ProductImages product_image
        WHERE product_image.product_id = product.id
        ORDER BY product_image.is_primary DESC, product_image.sort_order ASC, product_image.id ASC
      ) image
      WHERE product.seller_id = @sellerId
        AND review.deleted_at IS NULL
        AND review.is_approved = 1
      GROUP BY product.id, product.name, image.image_url
      ORDER BY rating DESC, reviews_count DESC, product.id ASC
    `);

  return {
    totalProducts: Number(productCountRes.recordset[0].total_products || 0),
    totalRevenue: Number(salesRes.recordset[0].total_revenue || 0),
    totalOrders: Number(salesRes.recordset[0].total_orders || 0),
    pendingOrders: Number(pendingRes.recordset[0].pending_orders || 0),
    lowStock: Number(lowStockRes.recordset[0].low_stock || 0),
    revenueRule: "delivered_items_gross",
    topProducts: topProductsRes.recordset.map((product) => ({
      ...product,
      sold_qty: Number(product.sold_qty || 0),
      revenue: Number(product.revenue || 0),
    })),
    topRatedProducts: topRatedProductsRes.recordset.map((product) => ({
      ...product,
      rating: Number(product.rating || 0),
      reviews_count: Number(product.reviews_count || 0),
    })),
  };
};
