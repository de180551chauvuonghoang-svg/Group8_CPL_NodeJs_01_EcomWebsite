import { pool, sql } from "../config/db.js";
import {
  deriveOrderDisplayStatus,
  normalizeFulfillmentStatus,
  orderStatusError
} from "./orderStatusService.js";

const mapTimeline = (order, items, historyRows, { includeActor = false } = {}) => {
  const historyByItem = new Map();

  for (const row of historyRows) {
    const event = {
      id: row.id,
      old_status: row.old_status ? normalizeFulfillmentStatus(row.old_status) : null,
      new_status: normalizeFulfillmentStatus(row.new_status),
      change_source: row.change_source,
      note: row.note,
      created_at: row.created_at
    };

    if (includeActor) {
      event.changed_by_user_id = row.changed_by_user_id;
      event.changed_by_name = row.changed_by_name;
    }

    const itemHistory = historyByItem.get(row.order_item_id) || [];
    itemHistory.push(event);
    historyByItem.set(row.order_item_id, itemHistory);
  }

  const mappedItems = items.map((item) => ({
    ...item,
    fulfillment_status: normalizeFulfillmentStatus(item.fulfillment_status),
    history: historyByItem.get(item.id) || []
  }));

  return {
    ...order,
    display_status: deriveOrderDisplayStatus(mappedItems, order.order_status),
    items: mappedItems
  };
};

const getHistoryRows = async (orderId, sellerId = null) => {
  const request = pool.request()
    .input("orderId", sql.VarChar, orderId)
    .input("sellerId", sql.VarChar, sellerId);

  const sellerFilter = sellerId
    ? "AND product.seller_id = @sellerId"
    : "";

  const result = await request.query(`
    SELECT
      history.id,
      history.order_item_id,
      history.old_status,
      history.new_status,
      history.change_source,
      history.note,
      history.changed_by_user_id,
      changed_by.name AS changed_by_name,
      history.created_at
    FROM OrderItemStatusHistory history
    INNER JOIN OrderItems item ON item.id = history.order_item_id
    INNER JOIN ProductVariants variant ON variant.id = item.variant_id
    INNER JOIN Products product ON product.id = variant.product_id
    LEFT JOIN Users changed_by ON changed_by.id = history.changed_by_user_id
    WHERE item.order_id = @orderId
      ${sellerFilter}
    ORDER BY history.created_at ASC, history.id ASC
  `);

  return result.recordset;
};

const customerItemQuery = `
  SELECT
    item.id,
    item.order_id,
    product.id AS product_id,
    product.seller_id,
    seller.shop_name,
    CAST(COALESCE(NULLIF(item.product_name, ''), product.name, N'Sản phẩm') AS NVARCHAR(255)) AS product_name,
    item.variant_id,
    item.variant_info,
    item.quantity,
    item.unit_price,
    item.total_price,
    item.fulfillment_status,
    item.tracking_code,
    item.cancel_reason,
    image.image_url,
    item.created_at,
    item.updated_at
  FROM OrderItems item
  INNER JOIN ProductVariants variant ON variant.id = item.variant_id
  INNER JOIN Products product ON product.id = variant.product_id
  INNER JOIN Sellers seller ON seller.id = product.seller_id
  OUTER APPLY (
    SELECT TOP 1 product_image.image_url
    FROM ProductImages product_image
    WHERE product_image.product_id = product.id
    ORDER BY product_image.is_primary DESC, product_image.sort_order ASC
  ) image
`;

export const getCustomerOrderItems = async (userId, orderId = null) => {
  const result = await pool.request()
    .input("userId", sql.VarChar, userId)
    .input("orderId", sql.VarChar, orderId)
    .query(`
      ${customerItemQuery}
      INNER JOIN Orders orders ON orders.id = item.order_id
      WHERE orders.user_id = @userId
        AND (@orderId IS NULL OR item.order_id = @orderId)
      ORDER BY item.created_at ASC
    `);

  return result.recordset.map((item) => ({
    ...item,
    fulfillment_status: normalizeFulfillmentStatus(item.fulfillment_status)
  }));
};

export const getCustomerOrderTimeline = async (userId, orderId) => {
  const orderResult = await pool.request()
    .input("userId", sql.VarChar, userId)
    .input("orderId", sql.VarChar, orderId)
    .query(`
      SELECT id, status AS order_status, total, created_at, updated_at
      FROM Orders
      WHERE id = @orderId AND user_id = @userId
    `);

  const order = orderResult.recordset[0];
  if (!order) {
    throw orderStatusError("ORDER_NOT_FOUND", "Không tìm thấy đơn hàng.", 404);
  }

  const items = await getCustomerOrderItems(userId, orderId);
  const historyRows = await getHistoryRows(orderId);

  return mapTimeline(order, items, historyRows);
};

export const getSellerOrderTimeline = async (sellerId, orderId) => {
  const orderResult = await pool.request()
    .input("sellerId", sql.VarChar, sellerId)
    .input("orderId", sql.VarChar, orderId)
    .query(`
      SELECT TOP 1 orders.id, orders.status AS order_status,
             orders.total, orders.created_at, orders.updated_at
      FROM Orders orders
      INNER JOIN OrderItems item ON item.order_id = orders.id
      INNER JOIN ProductVariants variant ON variant.id = item.variant_id
      INNER JOIN Products product ON product.id = variant.product_id
      WHERE orders.id = @orderId AND product.seller_id = @sellerId
    `);

  const order = orderResult.recordset[0];
  if (!order) {
    throw orderStatusError("ORDER_NOT_FOUND", "Không tìm thấy đơn hàng thuộc cửa hàng.", 404);
  }

  const itemsResult = await pool.request()
    .input("orderId", sql.VarChar, orderId)
    .input("sellerId", sql.VarChar, sellerId)
    .query(`
      ${customerItemQuery}
      WHERE item.order_id = @orderId AND product.seller_id = @sellerId
      ORDER BY item.created_at ASC
    `);
  const historyRows = await getHistoryRows(orderId, sellerId);

  return mapTimeline(order, itemsResult.recordset, historyRows, { includeActor: true });
};
