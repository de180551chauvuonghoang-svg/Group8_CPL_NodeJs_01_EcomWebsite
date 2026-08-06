import { sql, pool } from "../config/db.js";
import { v4 as uuidv4 } from "uuid";
import {
  assertFulfillmentTransition,
  deriveOrderDisplayStatus,
  normalizeFulfillmentStatus,
  orderStatusError,
} from "./orderStatusService.js";
import { INVENTORY_TYPES, recordInventoryLog } from "./inventoryService.js";
import { createNotification } from "./notificationService.js";
import { recalculateOrderAfterCancellation } from "./checkoutService.js";
import { recordDeliveredSale } from "./sellerWalletService.js";
import { getSellerDashboardStats } from "./sellerDashboardService.js";
import { sellerCouponService } from "./sellerCouponService.js";
import {
  paginationMeta,
  parsePagination,
  parseSearch,
  parseSort,
  queryError,
} from "../utils/queryUtils.js";

const SELLER_CATEGORY_IDS = Object.freeze([
  "cat_electronics",
  "cat_accessories",
  "cat_kitchen",
  "cat_wearables",
  "cat_audio",
]);
const SELLER_CATEGORY_ID_SQL = SELLER_CATEGORY_IDS.map(
  (categoryId) => `'${categoryId}'`,
).join(", ");

const sellerApplicationError = (code, message, statusCode) => {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  error.status = "fail";
  return error;
};

const assertOwnedApplicationImage = (userId, publicId, purpose) => {
  if (!publicId) return null;
  const normalizedPublicId = String(publicId).trim();
  const safeUserId = String(userId).replace(/[^a-zA-Z0-9_-]/g, "_");
  const expectedPrefix = `volitify/${safeUserId}/${purpose}/`;
  if (!normalizedPublicId.startsWith(expectedPrefix)) {
    throw sellerApplicationError(
      "APPLICATION_IMAGE_NOT_OWNED",
      "Ảnh hồ sơ đăng ký không thuộc tài khoản hiện tại.",
      403,
    );
  }
  return normalizedPublicId;
};

export const sellerService = {
  // Gửi đơn Seller; chỉ Admin mới được đổi role sau khi duyệt.
  registerSeller: async ({
    userId,
    shopName,
    shopPhone,
    shopAddress,
    description,
    logoUrl,
    logoPublicId,
    coverUrl,
    coverPublicId,
    pickupAddress,
    identityName,
    identityNumber,
    bankName,
    bankAccountNo,
    bankAccountHolder,
  }) => {
    const normalizedShopName = String(shopName).trim();
    const normalizedShopAddress = String(shopAddress).trim();
    const ownedLogoPublicId = assertOwnedApplicationImage(
      userId,
      logoPublicId,
      "shop_logo",
    );
    const ownedCoverPublicId = assertOwnedApplicationImage(
      userId,
      coverPublicId,
      "shop_cover",
    );
    const sellerId = `sel_${uuidv4().replace(/-/g, "").slice(0, 24)}`;
    const transaction = new sql.Transaction(pool);
    let started = false;

    try {
      await transaction.begin();
      started = true;

      const existingResult = await transaction
        .request()
        .input("userId", sql.VarChar, userId).query(`
          SELECT *
          FROM Sellers WITH (UPDLOCK, HOLDLOCK)
          WHERE user_id = @userId
        `);
      const existing = existingResult.recordset[0] || null;

      if (existing?.status === "pending") {
        throw sellerApplicationError(
          "SELLER_APPLICATION_PENDING",
          "Yeu cau mo cua hang dang cho duyet.",
          409,
        );
      }
      if (existing?.status === "active") {
        throw sellerApplicationError(
          "SELLER_ALREADY_ACTIVE",
          "Cua hang da duoc kich hoat.",
          409,
        );
      }
      if (existing?.status === "suspended") {
        throw sellerApplicationError(
          "SELLER_SUSPENDED",
          "Cua hang dang bi tam ngung va khong the gui lai don.",
          403,
        );
      }
      if (existing && existing.status !== "rejected") {
        throw sellerApplicationError(
          "INVALID_SELLER_APPLICATION_STATUS",
          "Trang thai yeu cau mo cua hang khong hop le.",
          409,
        );
      }

      const duplicateName = await transaction
        .request()
        .input("shopName", sql.NVarChar, normalizedShopName)
        .input("existingSellerId", sql.VarChar, existing?.id || null).query(`
          SELECT TOP 1 id
          FROM Sellers WITH (UPDLOCK, HOLDLOCK)
          WHERE shop_name = @shopName
            AND (@existingSellerId IS NULL OR id <> @existingSellerId)
        `);
      if (duplicateName.recordset[0]) {
        throw sellerApplicationError(
          "SHOP_NAME_TAKEN",
          "Ten cua hang da duoc su dung. Vui long chon ten khac.",
          409,
        );
      }

      const request = transaction
        .request()
        .input("id", sql.VarChar, existing?.id || sellerId)
        .input("userId", sql.VarChar, userId)
        .input("shopName", sql.NVarChar, normalizedShopName)
        .input("shopPhone", sql.VarChar, shopPhone)
        .input("shopAddress", sql.NVarChar, normalizedShopAddress)
        .input(
          "pickupAddress",
          sql.NVarChar,
          pickupAddress || normalizedShopAddress,
        )
        .input("logoUrl", sql.VarChar, logoUrl || null)
        .input("logoPublicId", sql.VarChar, ownedLogoPublicId)
        .input("coverUrl", sql.VarChar, coverUrl || null)
        .input("coverPublicId", sql.VarChar, ownedCoverPublicId)
        .input("description", sql.NVarChar, description || null)
        .input("identityName", sql.NVarChar, identityName || null)
        .input("identityNumber", sql.VarChar, identityNumber || null)
        .input("bankName", sql.NVarChar, bankName || null)
        .input("bankAccountNo", sql.VarChar, bankAccountNo || null)
        .input("bankAccountHolder", sql.NVarChar, bankAccountHolder || null);

      if (existing) {
        await request.query(`
          UPDATE Sellers
          SET shop_name = @shopName,
              shop_phone = @shopPhone,
              shop_address = @shopAddress,
              pickup_address = @pickupAddress,
              logo_url = @logoUrl,
              logo_public_id = @logoPublicId,
              cover_url = @coverUrl,
              cover_public_id = @coverPublicId,
              description = @description,
              identity_name = @identityName,
              identity_number = @identityNumber,
              bank_name = @bankName,
              bank_account_no = @bankAccountNo,
              bank_account_holder = @bankAccountHolder,
              status = 'pending',
              updated_at = GETDATE()
          WHERE id = @id AND status = 'rejected'
        `);
      } else {
        await request.query(`
          INSERT INTO Sellers (
            id, user_id, shop_name, shop_phone, shop_address, pickup_address,
            logo_url, logo_public_id, cover_url, cover_public_id, description,
            identity_name, identity_number, bank_name, bank_account_no,
            bank_account_holder, status, created_at, updated_at
          ) VALUES (
            @id, @userId, @shopName, @shopPhone, @shopAddress, @pickupAddress,
            @logoUrl, @logoPublicId, @coverUrl, @coverPublicId, @description,
            @identityName, @identityNumber, @bankName, @bankAccountNo,
            @bankAccountHolder, 'pending', GETDATE(), GETDATE()
          )
        `);
      }

      await transaction.commit();
      started = false;
      return {
        sellerId: existing?.id || sellerId,
        status: "pending",
        resubmitted: Boolean(existing),
      };
    } catch (error) {
      if (started) {
        try {
          await transaction.rollback();
        } catch (_) {
          /* preserve original error */
        }
      }
      if ([2601, 2627].includes(error.number)) {
        throw sellerApplicationError(
          "SHOP_NAME_TAKEN",
          "Ten cua hang da duoc su dung. Vui long chon ten khac.",
          409,
        );
      }
      throw error;
    }
  },

  getSellerApplicationByUserId: async (userId) => {
    const result = await pool.request().input("userId", sql.VarChar, userId)
      .query(`
        SELECT id, shop_name, status, created_at, updated_at
        FROM Sellers
        WHERE user_id = @userId
      `);
    const application = result.recordset[0];
    if (!application) return null;
    return {
      sellerId: application.id,
      shopName: application.shop_name,
      status: application.status,
      createdAt: application.created_at,
      updatedAt: application.updated_at,
    };
  },

  // Lấy thông tin seller theo userId
  getSellerByUserId: async (userId) => {
    const result = await pool
      .request()
      .input("userId", sql.VarChar, userId)
      .query("SELECT * FROM Sellers WHERE user_id = @userId");
    return result.recordset[0];
  },

  // Lấy thông tin seller theo sellerId
  updateSellerProfile: async (userId, data) => {
    const seller = await sellerService.getSellerByUserId(userId);
    if (!seller) {
      throw new Error("Không tìm thấy thông tin cửa hàng.");
    }

    await pool
      .request()
      .input("sellerId", sql.VarChar, seller.id)
      .input("shopName", sql.NVarChar, data.shopName || seller.shop_name)
      .input("shopPhone", sql.VarChar, data.shopPhone || seller.shop_phone)
      .input(
        "shopAddress",
        sql.NVarChar,
        data.shopAddress || seller.shop_address,
      )
      .input(
        "pickupAddress",
        sql.NVarChar,
        data.pickupAddress ||
          seller.pickup_address ||
          data.shopAddress ||
          seller.shop_address,
      )
      .input("logoUrl", sql.VarChar, data.logoUrl || seller.logo_url || null)
      .input(
        "logoPublicId",
        sql.VarChar,
        data.logoPublicId ?? seller.logo_public_id ?? null,
      )
      .input("coverUrl", sql.VarChar, data.coverUrl || seller.cover_url || null)
      .input(
        "coverPublicId",
        sql.VarChar,
        data.coverPublicId ?? seller.cover_public_id ?? null,
      )
      .input(
        "description",
        sql.NVarChar,
        data.description ?? seller.description,
      )
      .input(
        "identityName",
        sql.NVarChar,
        data.identityName || seller.identity_name || null,
      )
      .input(
        "identityNumber",
        sql.VarChar,
        data.identityNumber || seller.identity_number || null,
      )
      .input(
        "bankName",
        sql.NVarChar,
        data.bankName || seller.bank_name || null,
      )
      .input(
        "bankAccountNo",
        sql.VarChar,
        data.bankAccountNo || seller.bank_account_no || null,
      )
      .input(
        "bankAccountHolder",
        sql.NVarChar,
        data.bankAccountHolder || seller.bank_account_holder || null,
      ).query(`
        UPDATE Sellers
        SET shop_name = @shopName,
            shop_phone = @shopPhone,
            shop_address = @shopAddress,
            pickup_address = @pickupAddress,
            logo_url = @logoUrl,
            logo_public_id = @logoPublicId,
            cover_url = @coverUrl,
            cover_public_id = @coverPublicId,
            description = @description,
            identity_name = @identityName,
            identity_number = @identityNumber,
            bank_name = @bankName,
            bank_account_no = @bankAccountNo,
            bank_account_holder = @bankAccountHolder,
            updated_at = GETDATE()
        WHERE id = @sellerId
      `);

    return sellerService.getSellerByUserId(userId);
  },

  getSellerById: async (sellerId) => {
    const result = await pool
      .request()
      .input("sellerId", sql.VarChar, sellerId)
      .query("SELECT * FROM Sellers WHERE id = @sellerId");
    return result.recordset[0];
  },

  getPublicShop: async (sellerId) => {
    const shopRes = await pool
      .request()
      .input("sellerId", sql.VarChar, sellerId).query(`
        SELECT id, user_id, shop_name, shop_phone, shop_address, logo_url, cover_url,
               description, status, created_at
        FROM Sellers
        WHERE id = @sellerId AND status = 'active'
      `);

    const shop = shopRes.recordset[0];
    if (!shop) return null;

    const productsRes = await pool
      .request()
      .input("sellerId", sql.VarChar, sellerId).query(`
        SELECT TOP 24 p.id, p.name, p.description,
               COALESCE(fs.sale_price, pv.price, p.base_price) AS price,
               CASE WHEN fs.id IS NOT NULL THEN COALESCE(fs.original_price, pv.price, p.base_price) ELSE NULL END AS originalPrice,
               CASE WHEN fs.id IS NOT NULL THEN CAST(1 AS BIT) ELSE CAST(0 AS BIT) END AS isFlashSale,
               fs.ends_at AS flashSaleEndsAt,
               COALESCE(pv.stock_qty, 0) AS stock,
               pv.id AS variantId,
               pv.sku,
               COALESCE(pv.image_url, pi.image_url, '') AS image,
               cat.name AS category
        FROM Products p
        OUTER APPLY (
          SELECT TOP 1 id, sku, price, stock_qty, image_url
          FROM ProductVariants
          WHERE product_id = p.id AND is_default = 1 AND is_active = 1
          ORDER BY id ASC
        ) pv
        OUTER APPLY (
          SELECT TOP 1 image_url
          FROM ProductImages
          WHERE product_id = p.id
          ORDER BY is_primary DESC, sort_order ASC, id ASC
        ) pi
        OUTER APPLY (
          SELECT TOP 1 c.name
          FROM ProductCategories pc
          JOIN Categories c ON pc.category_id = c.id
          WHERE pc.product_id = p.id
          ORDER BY c.name ASC
        ) cat
        OUTER APPLY (
          SELECT TOP 1 id, sale_price, original_price, ends_at
          FROM ProductFlashSales
          WHERE product_id = p.id
            AND (variant_id IS NULL OR variant_id = pv.id)
            AND status = 'active'
            AND starts_at <= GETDATE()
            AND ends_at >= GETDATE()
          ORDER BY CASE WHEN variant_id = pv.id THEN 0 ELSE 1 END, ends_at ASC
        ) fs
        WHERE p.seller_id = @sellerId AND p.is_active = 1
        ORDER BY CASE WHEN fs.id IS NOT NULL THEN 0 ELSE 1 END, p.created_at DESC
      `);

    const statsRes = await pool
      .request()
      .input("sellerId", sql.VarChar, sellerId).query(`
        SELECT
          (SELECT COUNT(*) FROM Products WHERE seller_id = @sellerId AND is_active = 1) AS total_products,
          (SELECT COUNT(*) FROM ShopFollowers WHERE seller_id = @sellerId) AS follower_count
      `);

    return {
      shop,
      products: productsRes.recordset.map((product) => ({
        ...product,
        price: Number(product.price || 0),
        originalPrice:
          product.originalPrice === null
            ? null
            : Number(product.originalPrice || 0),
        isFlashSale: Boolean(product.isFlashSale),
        stock: Number(product.stock || 0),
        seller_id: sellerId,
        seller_user_id: shop.user_id,
      })),
      stats: {
        total_products: Number(statsRes.recordset[0].total_products || 0),
        follower_count: Number(statsRes.recordset[0].follower_count || 0),
      },
    };
  },

  // Lấy danh sách sản phẩm của Seller
  getSellerProducts: async (sellerId, query = {}) => {
    const { page, limit, offset } = parsePagination(query);
    const search = parseSearch(query.search);
    const status = String(query.status || "all").toLowerCase();
    const allowedStatuses = [
      "all",
      "active",
      "inactive",
      "low_stock",
      "out_of_stock",
    ];
    if (!allowedStatuses.includes(status)) {
      throw queryError(
        "INVALID_PRODUCT_STATUS",
        "Trạng thái sản phẩm không hợp lệ.",
      );
    }
    const categoryId = query.categoryId
      ? String(query.categoryId).trim()
      : null;
    const { orderSql } = parseSort(query, {
      created_at: "product.created_at",
      name: "product.name",
      price: "product.base_price",
      stock: "variant.stock_qty",
    });

    const productsResult = await pool
      .request()
      .input("sellerId", sql.VarChar, sellerId)
      .input("search", sql.NVarChar, search || null)
      .input("status", sql.VarChar, status)
      .input("categoryId", sql.VarChar, categoryId)
      .input("offset", sql.Int, offset)
      .input("limit", sql.Int, limit).query(`
        SELECT
          product.*,
          variant.sku,
          variant.id AS variant_id,
          variant.price AS variant_price,
          variant.stock_qty,
          variant.low_stock_threshold,
          variant.updated_at AS variant_updated_at,
          COALESCE(variant.image_url, image.image_url) AS image_url,
          (
            SELECT product_image.id, product_image.image_url AS url,
                   product_image.public_id AS publicId,
                   product_image.is_primary AS isPrimary,
                   product_image.sort_order AS sortOrder
            FROM ProductImages product_image
            WHERE product_image.product_id = product.id
            ORDER BY product_image.is_primary DESC, product_image.sort_order, product_image.id
            FOR JSON PATH
          ) AS images_json,
          category.id AS category_id,
          category.name AS category_name,
          COUNT(*) OVER() AS total_count
        FROM Products product
        INNER JOIN ProductVariants variant
          ON variant.product_id = product.id AND variant.is_default = 1
        OUTER APPLY (
          SELECT TOP 1 product_image.image_url
          FROM ProductImages product_image
          WHERE product_image.product_id = product.id
          ORDER BY product_image.is_primary DESC, product_image.sort_order, product_image.id
        ) image
        OUTER APPLY (
          SELECT TOP 1 categories.id, categories.name
          FROM ProductCategories product_category
          INNER JOIN Categories categories ON categories.id = product_category.category_id
          WHERE product_category.product_id = product.id
          ORDER BY categories.name, categories.id
        ) category
        WHERE product.seller_id = @sellerId
          AND (@search IS NULL OR product.name LIKE '%' + @search + '%' OR variant.sku LIKE '%' + @search + '%')
          AND (@categoryId IS NULL OR category.id = @categoryId)
          AND (
            @status = 'all'
            OR (@status = 'active' AND product.is_active = 1)
            OR (@status = 'inactive' AND product.is_active = 0)
            OR (@status = 'out_of_stock' AND variant.stock_qty = 0)
            OR (@status = 'low_stock' AND variant.stock_qty > 0 AND variant.stock_qty <= variant.low_stock_threshold)
          )
        ORDER BY ${orderSql}, product.id
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `);
    const total = Number(productsResult.recordset[0]?.total_count || 0);
    const products = productsResult.recordset.map(
      ({ total_count, ...product }) => {
        const defaultVariant = {
          id: product.variant_id,
          product_id: product.id,
          sku: product.sku,
          price: Number(product.variant_price),
          stock_qty: Number(product.stock_qty),
          low_stock_threshold: Number(product.low_stock_threshold),
          image_url: product.image_url,
          is_active: Boolean(product.is_active),
          is_default: true,
          updated_at: product.variant_updated_at,
        };
        return {
          ...product,
          images_json: undefined,
          images: product.images_json
            ? JSON.parse(product.images_json).map((imageItem) => ({
                ...imageItem,
                isPrimary: Boolean(imageItem.isPrimary),
              }))
            : [],
          base_price: Number(product.base_price),
          stock_qty: Number(product.stock_qty),
          is_active: Boolean(product.is_active),
          default_variant: defaultVariant,
          variants: [defaultVariant],
        };
      },
    );

    return { products, pagination: paginationMeta(page, limit, total) };
  },

  // Lấy danh sách đơn hàng có chứa sản phẩm của Seller
  getSellerOrders: async (sellerId, query = {}) => {
    const { page, limit, offset } = parsePagination(query);
    const search = parseSearch(query.search);
    const status = String(query.status || "all").toLowerCase();
    const allowedStatuses = [
      "all",
      "pending_fulfillment",
      "ready_to_ship",
      "shipping",
      "delivered",
      "cancelled",
    ];
    if (!allowedStatuses.includes(status)) {
      throw queryError(
        "INVALID_ORDER_STATUS",
        "Trạng thái đơn hàng không hợp lệ.",
      );
    }
    const { orderSql } = parseSort(query, {
      created_at: "summary.created_at",
      total: "summary.seller_total",
      status: "summary.display_status",
    });

    const ordersRes = await pool
      .request()
      .input("sellerId", sql.VarChar, sellerId)
      .input("search", sql.NVarChar, search || null)
      .input("status", sql.VarChar, status)
      .input("offset", sql.Int, offset)
      .input("limit", sql.Int, limit).query(`
        WITH SellerOrderSummary AS (
          SELECT
            orders.*,
            SUM(item.total_price) AS seller_total,
            CASE
              WHEN SUM(CASE WHEN item.fulfillment_status <> 'cancelled' THEN 1 ELSE 0 END) = 0 THEN 'cancelled'
              WHEN SUM(CASE WHEN item.fulfillment_status <> 'cancelled' THEN 1 ELSE 0 END)
                 = SUM(CASE WHEN item.fulfillment_status = 'delivered' THEN 1 ELSE 0 END) THEN 'delivered'
              WHEN SUM(CASE WHEN item.fulfillment_status IN ('shipping', 'shipped') THEN 1 ELSE 0 END) > 0 THEN 'shipping'
              WHEN SUM(CASE WHEN item.fulfillment_status = 'ready_to_ship' THEN 1 ELSE 0 END) > 0 THEN 'ready_to_ship'
              ELSE 'pending_fulfillment'
            END AS display_status
          FROM Orders orders
          INNER JOIN OrderItems item ON item.order_id = orders.id
          INNER JOIN ProductVariants variant ON variant.id = item.variant_id
          INNER JOIN Products product ON product.id = variant.product_id
          WHERE product.seller_id = @sellerId
            AND (
              @search IS NULL
              OR orders.id LIKE '%' + @search + '%'
              OR orders.shipping_name LIKE '%' + @search + '%'
              OR item.product_name LIKE '%' + @search + '%'
            )
          GROUP BY
            orders.id, orders.user_id, orders.coupon_id, orders.status,
            orders.subtotal, orders.discount_amount, orders.shipping_fee, orders.total,
            orders.shipping_name, orders.shipping_phone, orders.shipping_address,
            orders.shipping_city, orders.shipping_country, orders.note,
            orders.created_at, orders.updated_at
        )
        SELECT summary.*, COUNT(*) OVER() AS total_count
        FROM SellerOrderSummary summary
        WHERE @status = 'all' OR summary.display_status = @status
        ORDER BY ${orderSql}, summary.id
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `);
    const total = Number(ordersRes.recordset[0]?.total_count || 0);
    const orders = ordersRes.recordset.map(({ total_count, ...order }) => ({
      ...order,
      seller_total: Number(order.seller_total),
    }));

    // Lấy các OrderItems thuộc seller này cho từng đơn hàng
    for (let order of orders) {
      const itemsRes = await pool
        .request()
        .input("orderId", sql.VarChar, order.id)
        .input("sellerId", sql.VarChar, sellerId).query(`
          SELECT
            oi.id,
            oi.order_id,
            oi.variant_id,
            oi.quantity,
            oi.unit_price,
            oi.total_price,
            CAST(COALESCE(NULLIF(oi.product_name, ''), p.name, N'Sản phẩm') AS NVARCHAR(255)) AS product_name,
            oi.variant_info,
            oi.fulfillment_status,
            oi.tracking_code,
            oi.shipping_label_url,
            oi.cancel_reason,
            oi.created_at,
            pv.sku,
            pv.image_url,
            p.id AS product_id
          FROM OrderItems oi
          JOIN ProductVariants pv ON oi.variant_id = pv.id
          JOIN Products p ON pv.product_id = p.id
          WHERE oi.order_id = @orderId AND p.seller_id = @sellerId
      `);
      order.items = itemsRes.recordset.map((item) => ({
        ...item,
        fulfillment_status: normalizeFulfillmentStatus(item.fulfillment_status),
      }));
      order.display_status = deriveOrderDisplayStatus(
        order.items,
        order.status,
      );
    }

    return { orders, pagination: paginationMeta(page, limit, total) };
  },

  updateSellerOrderItem: async (
    sellerId,
    sellerUserId,
    orderItemId,
    { fulfillmentStatus, trackingCode, shippingLabelUrl, cancelReason },
  ) => {
    const optionalFields = [
      ["trackingCode", trackingCode, 100],
      ["shippingLabelUrl", shippingLabelUrl, 2083],
      ["cancelReason", cancelReason, 255],
    ];
    for (const [field, value, maxLength] of optionalFields) {
      if (
        value != null &&
        (typeof value !== "string" || value.trim().length > maxLength)
      ) {
        throw orderStatusError(
          "INVALID_ORDER_ITEM_UPDATE",
          `${field} không hợp lệ hoặc vượt quá ${maxLength} ký tự.`,
        );
      }
    }

    const transaction = new sql.Transaction(pool);
    let transactionStarted = false;

    try {
      await transaction.begin();
      transactionStarted = true;

      const ownerCheck = await transaction
        .request()
        .input("sellerId", sql.VarChar, sellerId)
        .input("orderItemId", sql.VarChar, orderItemId).query(`
          SELECT item.id, item.order_id, item.variant_id, item.quantity,
                 item.product_name, item.fulfillment_status, item.cancel_reason,
                 orders.user_id AS customer_user_id,
                 product.id AS product_id,
                 default_variant.id AS stock_variant_id
          FROM OrderItems item WITH (UPDLOCK, ROWLOCK)
          INNER JOIN Orders orders ON orders.id = item.order_id
          INNER JOIN ProductVariants variant ON item.variant_id = variant.id
          INNER JOIN Products product ON variant.product_id = product.id
          INNER JOIN ProductVariants default_variant
            ON default_variant.product_id = product.id AND default_variant.is_default = 1
          WHERE item.id = @orderItemId AND product.seller_id = @sellerId
        `);

      const orderItem = ownerCheck.recordset[0];
      if (!orderItem) {
        throw orderStatusError(
          "ORDER_ITEM_NOT_FOUND",
          "Không tìm thấy dòng đơn hàng thuộc cửa hàng.",
          404,
        );
      }

      const transition = assertFulfillmentTransition(
        orderItem.fulfillment_status,
        fulfillmentStatus,
      );
      let orderPricing = null;
      const normalizedCancelReason = cancelReason?.trim() || null;

      if (
        transition.changed &&
        transition.next === "cancelled" &&
        !normalizedCancelReason
      ) {
        throw orderStatusError(
          "CANCEL_REASON_REQUIRED",
          "Vui lòng nhập lý do hủy đơn hàng.",
        );
      }

      await transaction
        .request()
        .input("orderItemId", sql.VarChar, orderItemId)
        .input("status", sql.VarChar, transition.next)
        .input("trackingCode", sql.VarChar, trackingCode?.trim() || null)
        .input(
          "shippingLabelUrl",
          sql.VarChar,
          shippingLabelUrl?.trim() || null,
        )
        .input("cancelReason", sql.NVarChar, normalizedCancelReason).query(`
          UPDATE OrderItems
          SET fulfillment_status = @status,
              tracking_code = COALESCE(@trackingCode, tracking_code),
              shipping_label_url = COALESCE(@shippingLabelUrl, shipping_label_url),
              cancel_reason = CASE
                WHEN @status = 'cancelled' THEN COALESCE(@cancelReason, cancel_reason)
                ELSE cancel_reason
              END,
              updated_at = GETDATE()
          WHERE id = @orderItemId
        `);

      if (transition.changed) {
        await transaction
          .request()
          .input("id", sql.VarChar, uuidv4())
          .input("orderItemId", sql.VarChar, orderItemId)
          .input("oldStatus", sql.VarChar, transition.current)
          .input("newStatus", sql.VarChar, transition.next)
          .input("userId", sql.VarChar, sellerUserId)
          .input("note", sql.NVarChar, normalizedCancelReason).query(`
            INSERT INTO OrderItemStatusHistory (
              id, order_item_id, old_status, new_status,
              changed_by_user_id, change_source, note, created_at
            ) VALUES (
              @id, @orderItemId, @oldStatus, @newStatus,
              @userId, 'seller', @note, GETDATE()
            )
          `);

        if (transition.next === "cancelled") {
          const stockUpdate = await transaction
            .request()
            .input("variantId", sql.VarChar, orderItem.stock_variant_id)
            .input("quantity", sql.Int, orderItem.quantity).query(`
              UPDATE ProductVariants
              SET stock_qty = stock_qty + @quantity,
                  updated_at = GETDATE()
              OUTPUT
                DELETED.stock_qty AS old_quantity,
                INSERTED.stock_qty AS new_quantity
              WHERE id = @variantId
            `);

          const stockChange = stockUpdate.recordset[0];
          await recordInventoryLog(transaction, {
            variantId: orderItem.stock_variant_id,
            oldQuantity: Number(stockChange.old_quantity),
            changeQuantity: Number(orderItem.quantity),
            newQuantity: Number(stockChange.new_quantity),
            type: INVENTORY_TYPES.ORDER_CANCELLED,
            referenceId: orderItemId,
            reason: normalizedCancelReason,
            createdBy: sellerUserId,
          });
          orderPricing = await recalculateOrderAfterCancellation(
            transaction,
            orderItem.order_id,
          );
        }

        if (transition.next === "delivered") {
          await recordDeliveredSale(transaction, {
            sellerId,
            orderItemId,
          });
        }

        await createNotification(transaction, {
          userId: orderItem.customer_user_id,
          type: "order_status",
          title:
            "C\u1eadp nh\u1eadt tr\u1ea1ng th\u00e1i \u0111\u01a1n h\u00e0ng",
          message: `${orderItem.product_name}: ${transition.next}.`,
          entityType: "order",
          entityId: orderItem.order_id,
          data: {
            orderId: orderItem.order_id,
            orderItemId,
            productId: orderItem.product_id,
            status: transition.next,
          },
          dedupeKey: `order-status:${orderItemId}:${transition.next}`,
        });
      }

      await transaction.commit();
      transactionStarted = false;

      return {
        id: orderItemId,
        fulfillment_status: transition.next,
        changed: transition.changed,
        tracking_code: trackingCode?.trim() || null,
        shipping_label_url: shippingLabelUrl?.trim() || null,
        cancel_reason:
          normalizedCancelReason || orderItem.cancel_reason || null,
        pricing: orderPricing,
      };
    } catch (error) {
      if (transactionStarted) {
        try {
          await transaction.rollback();
        } catch (_) {
          // Preserve the original status update error.
        }
      }
      throw error;
    }
  },

  // Lấy thống kê Dashboard cho Seller
  getSellerDashboardStats,

  getSellerCategories: async () => {
    const result = await pool.request().query(`
      SELECT id, name, slug
      FROM Categories
      WHERE is_active = 1
        AND id IN (${SELLER_CATEGORY_ID_SQL})
      ORDER BY CASE id
        WHEN 'cat_electronics' THEN 1
        WHEN 'cat_accessories' THEN 2
        WHEN 'cat_kitchen' THEN 3
        WHEN 'cat_wearables' THEN 4
        WHEN 'cat_audio' THEN 5
        ELSE 99
      END
    `);
    return result.recordset;
  },

  assertSellerCategoryAvailable: async (categoryId, db = pool) => {
    const normalizedCategoryId =
      typeof categoryId === "string" ? categoryId.trim() : "";
    if (!SELLER_CATEGORY_IDS.includes(normalizedCategoryId)) {
      throw queryError(
        "INVALID_SELLER_CATEGORY",
        "Danh muc khong hop le hoac khong duoc ho tro cho Seller.",
      );
    }
    const result = await db
      .request()
      .input("categoryId", sql.VarChar, normalizedCategoryId).query(`
        SELECT id
        FROM Categories WITH (HOLDLOCK)
        WHERE id = @categoryId AND is_active = 1
      `);
    if (!result.recordset[0]) {
      throw queryError(
        "SELLER_CATEGORY_INACTIVE",
        "Danh muc da bi tat va khong the dung cho san pham moi hoac cap nhat.",
      );
    }
    return normalizedCategoryId;
  },

  ...sellerCouponService,
};
