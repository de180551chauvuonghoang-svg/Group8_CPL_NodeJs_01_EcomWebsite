import { v4 as uuidv4 } from "uuid";
import { pool, sql } from "../config/db.js";
import { INVENTORY_TYPES, recordInventoryLog } from "./inventoryService.js";
import { createNotification } from "./notificationService.js";
import {
  acquireSellerWalletLock,
  reverseSaleForReturn
} from "./sellerWalletService.js";
import {
  paginationMeta,
  parsePagination,
  parseSearch,
  parseSort,
  queryError
} from "../utils/queryUtils.js";

const STATUS_ALIASES = Object.freeze({
  requested: "requested",
  approved: "accepted",
  accepted: "accepted",
  rejected: "rejected",
  received: "item_returned",
  item_returned: "item_returned",
  refunded: "refunded"
});

const toPublicStatus = (status) => ({
  accepted: "approved",
  item_returned: "received"
}[status] || status);

const parseStatusFilter = (value) => {
  const status = String(value || "all").trim().toLowerCase();
  if (status === "all") return status;
  if (!STATUS_ALIASES[status]) {
    throw queryError("INVALID_RETURN_STATUS", "Trang thai tra hang khong hop le.");
  }
  return STATUS_ALIASES[status];
};

const parseQuantity = (value) => {
  const quantity = Number(value);
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw queryError("INVALID_RETURN_QUANTITY", "quantity phai la so nguyen lon hon 0.");
  }
  return quantity;
};

const parseReason = (value) => {
  const reason = typeof value === "string" ? value.trim() : "";
  if (reason.length < 10 || reason.length > 1000) {
    throw queryError("INVALID_RETURN_REASON", "Ly do tra hang phai co tu 10 den 1000 ky tu.");
  }
  return reason;
};

const toReturn = (row) => {
  const internalStatus = row.status;
  return {
    ...row,
    status: toPublicStatus(internalStatus),
    internal_status: internalStatus,
    quantity: Number(row.quantity),
    unit_price: row.unit_price === undefined ? undefined : Number(row.unit_price),
    total_price: row.total_price === undefined ? undefined : Number(row.total_price)
  };
};

const toReturnHistory = (row) => ({
  ...row,
  old_status: toPublicStatus(row.old_status),
  new_status: toPublicStatus(row.new_status),
  internal_old_status: row.old_status,
  internal_new_status: row.new_status
});

export const createReturnRequest = async (userId, orderItemId, payload) => {
  const quantity = parseQuantity(payload?.quantity);
  const reason = parseReason(payload?.reason);
  const transaction = new sql.Transaction(pool);
  let started = false;
  try {
    await transaction.begin();
    started = true;
    const itemResult = await transaction.request()
      .input("userId", sql.VarChar, userId)
      .input("orderItemId", sql.VarChar, orderItemId)
      .query(`
        SELECT item.id, item.order_id, item.quantity AS purchased_quantity,
               item.product_name, item.fulfillment_status,
               orders.created_at AS order_created_at,
               product.id AS product_id, product.seller_id,
               seller.user_id AS seller_user_id,
               COALESCE(delivered.created_at, item.updated_at) AS delivered_at
        FROM OrderItems item WITH (UPDLOCK, HOLDLOCK)
        INNER JOIN Orders orders ON orders.id = item.order_id
        INNER JOIN ProductVariants ordered_variant ON ordered_variant.id = item.variant_id
        INNER JOIN Products product ON product.id = ordered_variant.product_id
        INNER JOIN Sellers seller ON seller.id = product.seller_id
        OUTER APPLY (
          SELECT TOP 1 history.created_at
          FROM OrderItemStatusHistory history
          WHERE history.order_item_id = item.id AND history.new_status = 'delivered'
          ORDER BY history.created_at DESC
        ) delivered
        WHERE item.id = @orderItemId AND orders.user_id = @userId
      `);
    const item = itemResult.recordset[0];
    if (!item) {
      throw queryError("ORDER_ITEM_NOT_FOUND", "Khong tim thay san pham trong don hang cua ban.", 404);
    }
    if (item.fulfillment_status !== "delivered") {
      throw queryError("ORDER_ITEM_NOT_DELIVERED", "Chi duoc yeu cau tra hang sau khi giao thanh cong.", 409);
    }
    if (!item.delivered_at) {
      throw queryError("DELIVERY_TIME_NOT_FOUND", "Khong xac dinh duoc thoi diem giao hang.", 409);
    }
    const windowResult = await transaction.request()
      .input("deliveredAt", sql.DateTime2, item.delivered_at)
      .query("SELECT CASE WHEN @deliveredAt >= DATEADD(DAY, -7, GETDATE()) THEN 1 ELSE 0 END AS eligible");
    if (!windowResult.recordset[0].eligible) {
      throw queryError("RETURN_WINDOW_EXPIRED", "Da qua thoi han yeu cau tra hang 7 ngay.", 409);
    }

    const usedResult = await transaction.request()
      .input("orderItemId", sql.VarChar, orderItemId)
      .query(`
        SELECT COALESCE(SUM(quantity), 0) AS used_quantity
        FROM ReturnRequests WITH (UPDLOCK, HOLDLOCK)
        WHERE order_item_id = @orderItemId
          AND status IN ('requested', 'accepted', 'item_returned', 'refunded')
      `);
    const usedQuantity = Number(usedResult.recordset[0].used_quantity || 0);
    if (usedQuantity + quantity > Number(item.purchased_quantity)) {
      throw queryError("RETURN_QUANTITY_EXCEEDED", "Tong so luong tra vuot qua so luong da mua.", 409);
    }

    const returnId = `ret_${uuidv4().replace(/-/g, "")}`;
    await transaction.request()
      .input("id", sql.VarChar, returnId)
      .input("orderItemId", sql.VarChar, orderItemId)
      .input("userId", sql.VarChar, userId)
      .input("sellerId", sql.VarChar, item.seller_id)
      .input("quantity", sql.Int, quantity)
      .input("reason", sql.NVarChar, reason)
      .query(`
        INSERT INTO ReturnRequests (
          id, order_item_id, customer_user_id, seller_id,
          quantity, reason, status, requested_at, updated_at
        ) VALUES (
          @id, @orderItemId, @userId, @sellerId,
          @quantity, @reason, 'requested', GETDATE(), GETDATE()
        )
      `);
    await transaction.request()
      .input("id", sql.VarChar, `rsh_${uuidv4().replace(/-/g, "")}`)
      .input("returnId", sql.VarChar, returnId)
      .input("userId", sql.VarChar, userId)
      .input("note", sql.NVarChar, reason)
      .query(`
        INSERT INTO ReturnStatusHistory (
          id, return_request_id, old_status, new_status,
          changed_by_user_id, note, created_at
        ) VALUES (@id, @returnId, NULL, 'requested', @userId, @note, GETDATE())
      `);
    await createNotification(transaction, {
      userId: item.seller_user_id,
      type: "return_requested",
      title: "Y\u00eau c\u1ea7u tr\u1ea3 h\u00e0ng m\u1edbi",
      message: `${item.product_name}: ${quantity} s\u1ea3n ph\u1ea9m.`,
      entityType: "return",
      entityId: returnId,
      data: { returnId, orderId: item.order_id, orderItemId, productId: item.product_id },
      dedupeKey: `return-requested:${returnId}`
    });

    const created = await transaction.request()
      .input("id", sql.VarChar, returnId)
      .query("SELECT * FROM ReturnRequests WHERE id = @id");
    await transaction.commit();
    started = false;
    return toReturn(created.recordset[0]);
  } catch (error) {
    if (started) {
      try { await transaction.rollback(); } catch (_) { /* preserve original error */ }
    }
    throw error;
  }
};

export const getCustomerReturns = async (userId, query = {}) => {
  const { page, limit, offset } = parsePagination(query);
  const status = parseStatusFilter(query.status);
  const result = await pool.request()
    .input("userId", sql.VarChar, userId)
    .input("status", sql.VarChar, status)
    .input("offset", sql.Int, offset)
    .input("limit", sql.Int, limit)
    .query(`
      SELECT COUNT(*) OVER() AS total_count,
             request.*, item.order_id, item.product_name, item.unit_price,
             product.id AS product_id, seller.shop_name,
             image.image_url AS product_image_url
      FROM ReturnRequests request
      INNER JOIN OrderItems item ON item.id = request.order_item_id
      INNER JOIN ProductVariants variant ON variant.id = item.variant_id
      INNER JOIN Products product ON product.id = variant.product_id
      INNER JOIN Sellers seller ON seller.id = request.seller_id
      OUTER APPLY (
        SELECT TOP 1 image_url FROM ProductImages
        WHERE product_id = product.id
        ORDER BY is_primary DESC, sort_order, id
      ) image
      WHERE request.customer_user_id = @userId
        AND (@status = 'all' OR request.status = @status)
      ORDER BY request.requested_at DESC, request.id DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);
  const total = Number(result.recordset[0]?.total_count || 0);
  return {
    returns: result.recordset.map(({ total_count, ...row }) => toReturn(row)),
    pagination: paginationMeta(page, limit, total)
  };
};

export const getSellerReturns = async (sellerId, query = {}) => {
  const { page, limit, offset } = parsePagination(query);
  const status = parseStatusFilter(query.status);
  const search = parseSearch(query.search);
  const { orderSql } = parseSort(query, {
    requested_at: "request.requested_at",
    status: "request.status",
    product_name: "item.product_name",
    customer_name: "customer.name"
  }, { defaultSortBy: "requested_at", defaultSortOrder: "desc" });
  const result = await pool.request()
    .input("sellerId", sql.VarChar, sellerId)
    .input("status", sql.VarChar, status)
    .input("search", sql.NVarChar, search || null)
    .input("offset", sql.Int, offset)
    .input("limit", sql.Int, limit)
    .query(`
      SELECT COUNT(*) OVER() AS total_count,
             request.*, item.order_id, item.product_name, item.unit_price,
             product.id AS product_id, customer.name AS customer_name,
             customer.email AS customer_email
      FROM ReturnRequests request
      INNER JOIN OrderItems item ON item.id = request.order_item_id
      INNER JOIN ProductVariants variant ON variant.id = item.variant_id
      INNER JOIN Products product ON product.id = variant.product_id
      INNER JOIN Users customer ON customer.id = request.customer_user_id
      WHERE request.seller_id = @sellerId
        AND (@status = 'all' OR request.status = @status)
        AND (@search IS NULL OR item.order_id LIKE '%' + @search + '%'
          OR item.product_name LIKE '%' + @search + '%'
          OR customer.name LIKE '%' + @search + '%')
      ORDER BY ${orderSql}, request.id DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);
  const total = Number(result.recordset[0]?.total_count || 0);
  return {
    returns: result.recordset.map(({ total_count, ...row }) => toReturn(row)),
    pagination: paginationMeta(page, limit, total)
  };
};

export const getSellerReturnDetail = async (sellerId, returnId) => {
  const result = await pool.request()
    .input("sellerId", sql.VarChar, sellerId)
    .input("returnId", sql.VarChar, returnId)
    .query(`
      SELECT request.*, item.order_id, item.product_name, item.variant_info,
             item.quantity AS purchased_quantity, item.unit_price, item.total_price,
             product.id AS product_id, customer.name AS customer_name,
             customer.email AS customer_email
      FROM ReturnRequests request
      INNER JOIN OrderItems item ON item.id = request.order_item_id
      INNER JOIN ProductVariants variant ON variant.id = item.variant_id
      INNER JOIN Products product ON product.id = variant.product_id
      INNER JOIN Users customer ON customer.id = request.customer_user_id
      WHERE request.id = @returnId AND request.seller_id = @sellerId;

      SELECT history.*
      FROM ReturnStatusHistory history
      INNER JOIN ReturnRequests request ON request.id = history.return_request_id
      WHERE history.return_request_id = @returnId AND request.seller_id = @sellerId
      ORDER BY history.created_at, history.id;
    `);
  if (!result.recordsets[0][0]) {
    throw queryError("RETURN_NOT_FOUND", "Khong tim thay yeu cau tra hang.", 404);
  }
  return {
    return: toReturn(result.recordsets[0][0]),
    history: result.recordsets[1].map(toReturnHistory)
  };
};

export const updateSellerReturn = async (sellerId, sellerUserId, returnId, payload) => {
  const requestedStatus = String(payload?.status || "").trim().toLowerCase();
  if (requestedStatus === "refunded") {
    throw queryError(
      "REFUND_REQUIRES_PAYMENT_PROCESSING",
      "Seller khong the tu danh dau da hoan tien khi chua co giao dich hoan tien thanh cong.",
      409
    );
  }
  const nextStatus = STATUS_ALIASES[requestedStatus];
  if (!["accepted", "rejected", "item_returned"].includes(nextStatus)) {
    throw queryError("INVALID_RETURN_STATUS", "Trang thai cap nhat khong hop le.");
  }
  const sellerResponse = typeof payload?.sellerResponse === "string"
    ? payload.sellerResponse.trim()
    : "";
  if (sellerResponse.length > 1000 || (nextStatus === "rejected" && sellerResponse.length < 3)) {
    throw queryError("INVALID_SELLER_RESPONSE", "Tu choi bat buoc co ly do 3-1000 ky tu.");
  }
  const transaction = new sql.Transaction(pool);
  let started = false;
  try {
    await transaction.begin();
    started = true;
    await acquireSellerWalletLock(transaction, sellerId);
    const currentResult = await transaction.request()
      .input("sellerId", sql.VarChar, sellerId)
      .input("returnId", sql.VarChar, returnId)
      .query(`
        SELECT request.*, item.order_id, item.product_name,
               product.id AS product_id,
               default_variant.id AS default_variant_id
        FROM ReturnRequests request WITH (UPDLOCK, HOLDLOCK)
        INNER JOIN OrderItems item ON item.id = request.order_item_id
        INNER JOIN ProductVariants ordered_variant ON ordered_variant.id = item.variant_id
        INNER JOIN Products product ON product.id = ordered_variant.product_id
        INNER JOIN ProductVariants default_variant
          ON default_variant.product_id = product.id AND default_variant.is_default = 1
        INNER JOIN Users customer ON customer.id = request.customer_user_id
        WHERE request.id = @returnId AND request.seller_id = @sellerId
      `);
    const current = currentResult.recordset[0];
    if (!current) {
      throw queryError("RETURN_NOT_FOUND", "Khong tim thay yeu cau tra hang.", 404);
    }
    const allowed = current.status === "requested"
      ? ["accepted", "rejected"]
      : current.status === "accepted" ? ["item_returned"] : [];
    if (!allowed.includes(nextStatus)) {
      throw queryError(
        "INVALID_RETURN_TRANSITION",
        `Khong the chuyen tu ${toPublicStatus(current.status)} sang ${toPublicStatus(nextStatus)}.`,
        409
      );
    }

    if (nextStatus === "item_returned") {
      const stockResult = await transaction.request()
        .input("variantId", sql.VarChar, current.default_variant_id)
        .input("quantity", sql.Int, Number(current.quantity))
        .query(`
          UPDATE ProductVariants
          SET stock_qty = stock_qty + @quantity, updated_at = GETDATE()
          OUTPUT DELETED.stock_qty AS old_quantity, INSERTED.stock_qty AS new_quantity
          WHERE id = @variantId
        `);
      if (stockResult.rowsAffected[0] !== 1) {
        throw queryError("DEFAULT_VARIANT_NOT_FOUND", "Khong tim thay ton kho san pham.", 409);
      }
      const stock = stockResult.recordset[0];
      await recordInventoryLog(transaction, {
        variantId: current.default_variant_id,
        oldQuantity: Number(stock.old_quantity),
        changeQuantity: Number(current.quantity),
        newQuantity: Number(stock.new_quantity),
        type: INVENTORY_TYPES.RETURN_REFUND,
        referenceId: returnId,
        reason: sellerResponse || `Return ${returnId}`,
        createdBy: sellerUserId
      });
    }

    await transaction.request()
      .input("returnId", sql.VarChar, returnId)
      .input("status", sql.VarChar, nextStatus)
      .input("response", sql.NVarChar, sellerResponse || null)
      .query(`
        UPDATE ReturnRequests
        SET status = @status,
            seller_response = COALESCE(@response, seller_response),
            responded_at = CASE WHEN @status IN ('accepted', 'rejected') THEN GETDATE() ELSE responded_at END,
            returned_at = CASE WHEN @status = 'item_returned' THEN GETDATE() ELSE returned_at END,
            updated_at = GETDATE()
        WHERE id = @returnId
      `);
    if (nextStatus === "item_returned") {
      await reverseSaleForReturn(transaction, {
        sellerId,
        returnId,
        orderItemId: current.order_item_id,
        quantity: Number(current.quantity)
      });
    }
    await transaction.request()
      .input("id", sql.VarChar, `rsh_${uuidv4().replace(/-/g, "")}`)
      .input("returnId", sql.VarChar, returnId)
      .input("oldStatus", sql.VarChar, current.status)
      .input("newStatus", sql.VarChar, nextStatus)
      .input("userId", sql.VarChar, sellerUserId)
      .input("note", sql.NVarChar, sellerResponse || null)
      .query(`
        INSERT INTO ReturnStatusHistory (
          id, return_request_id, old_status, new_status,
          changed_by_user_id, note, created_at
        ) VALUES (@id, @returnId, @oldStatus, @newStatus, @userId, @note, GETDATE())
      `);
    await createNotification(transaction, {
      userId: current.customer_user_id,
      type: "return_status",
      title: "C\u1eadp nh\u1eadt y\u00eau c\u1ea7u tr\u1ea3 h\u00e0ng",
      message: `${current.product_name}: ${toPublicStatus(nextStatus)}.`,
      entityType: "return",
      entityId: returnId,
      data: { returnId, orderId: current.order_id, status: toPublicStatus(nextStatus) },
      dedupeKey: `return-status:${returnId}:${nextStatus}`
    });
    const updated = await transaction.request()
      .input("returnId", sql.VarChar, returnId)
      .query("SELECT * FROM ReturnRequests WHERE id = @returnId");
    await transaction.commit();
    started = false;
    return toReturn(updated.recordset[0]);
  } catch (error) {
    if (started) {
      try { await transaction.rollback(); } catch (_) { /* preserve original error */ }
    }
    throw error;
  }
};
