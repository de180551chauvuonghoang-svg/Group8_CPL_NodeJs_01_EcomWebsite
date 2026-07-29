import { v4 as uuidv4 } from "uuid";
import { pool, sql } from "../config/db.js";
import { createNotification } from "./notificationService.js";

export const INVENTORY_TYPES = Object.freeze({
  SALE: "sale",
  ORDER_CANCELLED: "order_cancelled",
  RESTOCK: "restock",
  MANUAL_ADJUSTMENT: "manual_adjustment",
  RETURN_REFUND: "return_refund"
});

const SELLER_ADJUSTMENT_TYPES = new Set([
  INVENTORY_TYPES.RESTOCK,
  INVENTORY_TYPES.MANUAL_ADJUSTMENT
]);
const MAX_PAGE_SIZE = 100;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const inventoryError = (code, message, statusCode = 400) => {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  error.status = "fail";
  return error;
};

const parsePositiveInteger = (value, fallback, fieldName) => {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw inventoryError("INVALID_PAGINATION", `${fieldName} phải là số nguyên dương.`);
  }
  return parsed;
};

const parsePagination = ({ page, limit }) => {
  const parsedPage = parsePositiveInteger(page, 1, "page");
  const parsedLimit = Math.min(parsePositiveInteger(limit, 20, "limit"), MAX_PAGE_SIZE);
  return {
    page: parsedPage,
    limit: parsedLimit,
    offset: (parsedPage - 1) * parsedLimit
  };
};

const parseDate = (value, fieldName) => {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) {
    throw inventoryError("INVALID_DATE_FILTER", `${fieldName} phải có định dạng YYYY-MM-DD.`);
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw inventoryError("INVALID_DATE_FILTER", `${fieldName} không phải ngày hợp lệ.`);
  }
  return value;
};

export const validateInventoryReason = (reason) => {
  if (typeof reason !== "string") {
    throw inventoryError("INVENTORY_REASON_REQUIRED", "Vui lòng nhập lý do điều chỉnh tồn kho.");
  }
  const normalized = reason.trim();
  if (normalized.length < 3 || normalized.length > 255) {
    throw inventoryError(
      "INVALID_INVENTORY_REASON",
      "Lý do điều chỉnh tồn kho phải có từ 3 đến 255 ký tự."
    );
  }
  return normalized;
};

export const recordInventoryLog = async (db, {
  variantId,
  oldQuantity,
  changeQuantity,
  newQuantity,
  type,
  referenceId = null,
  reason = null,
  createdBy = null
}) => {
  if (
    !Number.isInteger(oldQuantity) || oldQuantity < 0 ||
    !Number.isInteger(changeQuantity) || changeQuantity === 0 ||
    !Number.isInteger(newQuantity) || newQuantity < 0 ||
    oldQuantity + changeQuantity !== newQuantity
  ) {
    throw inventoryError("INVALID_INVENTORY_CHANGE", "Dữ liệu thay đổi tồn kho không hợp lệ.");
  }
  if (!Object.values(INVENTORY_TYPES).includes(type)) {
    throw inventoryError("INVALID_INVENTORY_TYPE", "Loại thay đổi tồn kho không hợp lệ.");
  }

  const id = `inv_${uuidv4().replaceAll("-", "")}`;
  await db.request()
    .input("id", sql.VarChar, id)
    .input("variantId", sql.VarChar, variantId)
    .input("oldQuantity", sql.Int, oldQuantity)
    .input("changeQuantity", sql.Int, changeQuantity)
    .input("newQuantity", sql.Int, newQuantity)
    .input("type", sql.VarChar, type)
    .input("referenceId", sql.VarChar, referenceId)
    .input("reason", sql.NVarChar, reason)
    .input("createdBy", sql.VarChar, createdBy)
    .query(`
      INSERT INTO InventoryLogs (
        id, variant_id, old_quantity, change_quantity, new_quantity,
        type, reference_id, reason, created_by, created_at
      ) VALUES (
        @id, @variantId, @oldQuantity, @changeQuantity, @newQuantity,
        @type, @referenceId, @reason, @createdBy, GETDATE()
      )
    `);

  return {
    id,
    variant_id: variantId,
    old_quantity: oldQuantity,
    change_quantity: changeQuantity,
    new_quantity: newQuantity,
    type,
    reference_id: referenceId,
    reason,
    created_by: createdBy
  };
};

export const inventoryService = {
  getLowStock: async (sellerId, query = {}) => {
    const { page, limit, offset } = parsePagination(query);
    const result = await pool.request()
      .input("sellerId", sql.VarChar, sellerId)
      .input("offset", sql.Int, offset)
      .input("limit", sql.Int, limit)
      .query(`
        SELECT COUNT(*) AS total_count
        FROM ProductVariants variant
        INNER JOIN Products product ON product.id = variant.product_id
        WHERE product.seller_id = @sellerId
          AND ISNULL(product.is_active, 1) = 1
          AND variant.is_active = 1
          AND variant.is_default = 1
          AND variant.stock_qty <= variant.low_stock_threshold;

        SELECT
          variant.id AS variant_id,
          variant.product_id,
          product.name AS product_name,
          variant.sku,
          variant.stock_qty,
          variant.low_stock_threshold,
          COALESCE(variant.image_url, image.image_url) AS image_url,
          variant.is_active,
          variant.updated_at
        FROM ProductVariants variant
        INNER JOIN Products product ON product.id = variant.product_id
        OUTER APPLY (
          SELECT TOP 1 product_image.image_url
          FROM ProductImages product_image
          WHERE product_image.product_id = product.id
          ORDER BY product_image.is_primary DESC, product_image.sort_order ASC
        ) image
        WHERE product.seller_id = @sellerId
          AND ISNULL(product.is_active, 1) = 1
          AND variant.is_active = 1
          AND variant.is_default = 1
          AND variant.stock_qty <= variant.low_stock_threshold
        ORDER BY variant.stock_qty ASC, variant.updated_at DESC, variant.id ASC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
      `);

    const total = Number(result.recordsets[0][0]?.total_count || 0);
    return {
      variants: result.recordsets[1].map((variant) => ({
        ...variant,
        stock_qty: Number(variant.stock_qty),
        low_stock_threshold: Number(variant.low_stock_threshold),
        is_active: Boolean(variant.is_active),
        stock_status: Number(variant.stock_qty) === 0 ? "out_of_stock" : "low_stock"
      })),
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit)
      }
    };
  },

  getLogs: async (sellerId, query = {}) => {
    const { page, limit, offset } = parsePagination(query);
    const type = query.type || null;
    if (type && !Object.values(INVENTORY_TYPES).includes(type)) {
      throw inventoryError("INVALID_INVENTORY_TYPE", "Loại thay đổi tồn kho không hợp lệ.");
    }
    if (
      query.variantId !== undefined &&
      (typeof query.variantId !== "string" || !query.variantId.trim())
    ) {
      throw inventoryError("INVALID_VARIANT_ID", "Mã phiên bản sản phẩm không hợp lệ.");
    }

    const variantId = query.variantId?.trim() || null;
    const from = parseDate(query.from, "from");
    const to = parseDate(query.to, "to");
    if (from && to && from > to) {
      throw inventoryError("INVALID_DATE_RANGE", "Ngày bắt đầu không được sau ngày kết thúc.");
    }

    const result = await pool.request()
      .input("sellerId", sql.VarChar, sellerId)
      .input("variantId", sql.VarChar, variantId)
      .input("type", sql.VarChar, type)
      .input("from", sql.VarChar, from)
      .input("to", sql.VarChar, to)
      .input("offset", sql.Int, offset)
      .input("limit", sql.Int, limit)
      .query(`
        SELECT COUNT(*) AS total_count
        FROM InventoryLogs inventory
        INNER JOIN ProductVariants variant ON variant.id = inventory.variant_id
        INNER JOIN Products product ON product.id = variant.product_id
        WHERE product.seller_id = @sellerId
          AND (@variantId IS NULL OR inventory.variant_id = @variantId)
          AND (@type IS NULL OR inventory.type = @type)
          AND (@from IS NULL OR inventory.created_at >= CONVERT(DATE, @from, 23))
          AND (@to IS NULL OR inventory.created_at < DATEADD(DAY, 1, CONVERT(DATE, @to, 23)));

        SELECT
          inventory.id,
          inventory.variant_id,
          variant.product_id,
          product.name AS product_name,
          variant.sku,
          inventory.old_quantity,
          inventory.change_quantity,
          inventory.new_quantity,
          inventory.type,
          inventory.reference_id,
          inventory.reason,
          inventory.created_by,
          actor.name AS created_by_name,
          inventory.created_at
        FROM InventoryLogs inventory
        INNER JOIN ProductVariants variant ON variant.id = inventory.variant_id
        INNER JOIN Products product ON product.id = variant.product_id
        LEFT JOIN Users actor ON actor.id = inventory.created_by
        WHERE product.seller_id = @sellerId
          AND (@variantId IS NULL OR inventory.variant_id = @variantId)
          AND (@type IS NULL OR inventory.type = @type)
          AND (@from IS NULL OR inventory.created_at >= CONVERT(DATE, @from, 23))
          AND (@to IS NULL OR inventory.created_at < DATEADD(DAY, 1, CONVERT(DATE, @to, 23)))
        ORDER BY inventory.created_at DESC, inventory.id DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
      `);

    const total = Number(result.recordsets[0][0]?.total_count || 0);
    return {
      logs: result.recordsets[1].map((log) => ({
        ...log,
        old_quantity: Number(log.old_quantity),
        change_quantity: Number(log.change_quantity),
        new_quantity: Number(log.new_quantity)
      })),
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit)
      }
    };
  },

  adjustStock: async (sellerId, sellerUserId, payload = {}) => {
    if (typeof payload.variantId !== "string" || !payload.variantId.trim()) {
      throw inventoryError("VARIANT_ID_REQUIRED", "Vui lòng chọn phiên bản sản phẩm.");
    }
    const changeQuantity = payload.changeQuantity;
    if (!Number.isInteger(changeQuantity) || changeQuantity === 0) {
      throw inventoryError(
        "INVALID_CHANGE_QUANTITY",
        "Số lượng điều chỉnh phải là số nguyên khác 0."
      );
    }
    const type = payload.type || INVENTORY_TYPES.MANUAL_ADJUSTMENT;
    if (!SELLER_ADJUSTMENT_TYPES.has(type)) {
      throw inventoryError(
        "INVALID_SELLER_INVENTORY_TYPE",
        "Seller chỉ được chọn restock hoặc manual_adjustment."
      );
    }
    if (type === INVENTORY_TYPES.RESTOCK && changeQuantity < 0) {
      throw inventoryError("INVALID_RESTOCK_QUANTITY", "Số lượng nhập kho phải lớn hơn 0.");
    }
    const reason = validateInventoryReason(payload.reason);

    const transaction = new sql.Transaction(pool);
    let transactionStarted = false;
    try {
      await transaction.begin();
      transactionStarted = true;

      const variantResult = await transaction.request()
        .input("sellerId", sql.VarChar, sellerId)
        .input("variantId", sql.VarChar, payload.variantId.trim())
        .query(`
          SELECT variant.id, variant.product_id, variant.sku, variant.stock_qty,
                 variant.low_stock_threshold, product.name AS product_name
          FROM ProductVariants variant WITH (UPDLOCK, HOLDLOCK)
          INNER JOIN Products product ON product.id = variant.product_id
          WHERE variant.id = @variantId
            AND product.seller_id = @sellerId
            AND variant.is_default = 1
            AND variant.is_active = 1
        `);
      const variant = variantResult.recordset[0];
      if (!variant) {
        throw inventoryError(
          "VARIANT_NOT_FOUND",
          "Không tìm thấy phiên bản sản phẩm thuộc cửa hàng.",
          404
        );
      }

      const oldQuantity = Number(variant.stock_qty);
      const newQuantity = oldQuantity + changeQuantity;
      if (newQuantity < 0) {
        throw inventoryError(
          "INSUFFICIENT_STOCK",
          "Điều chỉnh này làm tồn kho nhỏ hơn 0.",
          409
        );
      }

      await transaction.request()
        .input("variantId", sql.VarChar, variant.id)
        .input("newQuantity", sql.Int, newQuantity)
        .query(`
          UPDATE ProductVariants
          SET stock_qty = @newQuantity, updated_at = GETDATE()
          WHERE id = @variantId
        `);

      const log = await recordInventoryLog(transaction, {
        variantId: variant.id,
        oldQuantity,
        changeQuantity,
        newQuantity,
        type,
        referenceId: variant.product_id,
        reason,
        createdBy: sellerUserId
      });

      if (
        oldQuantity > Number(variant.low_stock_threshold)
        && newQuantity <= Number(variant.low_stock_threshold)
      ) {
        await createNotification(transaction, {
          userId: sellerUserId,
          type: newQuantity === 0 ? "out_of_stock" : "low_stock",
          title: newQuantity === 0
            ? "S\u1ea3n ph\u1ea9m \u0111\u00e3 h\u1ebft h\u00e0ng"
            : "S\u1ea3n ph\u1ea9m s\u1eafp h\u1ebft h\u00e0ng",
          message: `${variant.product_name} ch\u1ec9 c\u00f2n ${newQuantity} s\u1ea3n ph\u1ea9m.`,
          entityType: "product",
          entityId: variant.product_id,
          data: {
            productId: variant.product_id,
            variantId: variant.id,
            stock: newQuantity,
            threshold: Number(variant.low_stock_threshold)
          },
          dedupeKey: `low-stock:${variant.id}:${log.id}`
        });
      }

      await transaction.commit();
      transactionStarted = false;
      return {
        variant: {
          id: variant.id,
          product_id: variant.product_id,
          product_name: variant.product_name,
          sku: variant.sku,
          stock_qty: newQuantity,
          low_stock_threshold: Number(variant.low_stock_threshold),
          stock_status: newQuantity === 0
            ? "out_of_stock"
            : newQuantity <= Number(variant.low_stock_threshold) ? "low_stock" : "in_stock"
        },
        log
      };
    } catch (error) {
      if (transactionStarted) {
        try {
          await transaction.rollback();
        } catch (_) {
          // Preserve the original inventory error.
        }
      }
      throw error;
    }
  },

  updateStockAlert: async (sellerId, productId, variantId, thresholdValue) => {
    const threshold = thresholdValue;
    if (!Number.isInteger(threshold) || threshold < 0 || threshold > 1000000) {
      throw inventoryError(
        "INVALID_LOW_STOCK_THRESHOLD",
        "Ngưỡng sắp hết hàng phải là số nguyên từ 0 đến 1.000.000."
      );
    }

    const result = await pool.request()
      .input("sellerId", sql.VarChar, sellerId)
      .input("productId", sql.VarChar, productId)
      .input("variantId", sql.VarChar, variantId)
      .input("threshold", sql.Int, threshold)
      .query(`
        UPDATE variant
        SET low_stock_threshold = @threshold,
            updated_at = GETDATE()
        OUTPUT
          INSERTED.id AS variant_id,
          INSERTED.product_id,
          INSERTED.stock_qty,
          INSERTED.low_stock_threshold,
          INSERTED.updated_at
        FROM ProductVariants variant
        INNER JOIN Products product ON product.id = variant.product_id
        WHERE variant.id = @variantId
          AND product.id = @productId
          AND product.seller_id = @sellerId
          AND variant.is_default = 1
      `);
    const variant = result.recordset[0];
    if (!variant) {
      throw inventoryError(
        "VARIANT_NOT_FOUND",
        "Không tìm thấy phiên bản sản phẩm thuộc cửa hàng.",
        404
      );
    }
    return {
      ...variant,
      stock_qty: Number(variant.stock_qty),
      low_stock_threshold: Number(variant.low_stock_threshold)
    };
  }
};
