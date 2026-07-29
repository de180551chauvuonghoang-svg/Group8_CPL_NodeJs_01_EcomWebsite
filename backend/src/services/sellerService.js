import { sql, pool } from "../config/db.js";

const toLocalDateString = (date) => [
  date.getFullYear(),
  String(date.getMonth() + 1).padStart(2, "0"),
  String(date.getDate()).padStart(2, "0")
].join("-");

const normalizeCouponDateTime = (value, fieldName, { endOfDay = false } = {}) => {
  if (!value) {
    throw new Error(`${fieldName} la bat buoc.`);
  }

  const raw = String(value);
  const dateOnly = raw.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    throw new Error(`${fieldName} khong hop le.`);
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return `${dateOnly} ${endOfDay ? "23:59:59" : "00:00:00"}`;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${fieldName} khong hop le.`);
  }

  const datePart = toLocalDateString(parsed);
  const timePart = [
    String(parsed.getHours()).padStart(2, "0"),
    String(parsed.getMinutes()).padStart(2, "0"),
    String(parsed.getSeconds()).padStart(2, "0")
  ].join(":");
  return `${datePart} ${timePart}`;
};

const validateCouponPayload = (data) => {
  const discountType = data.discountType || "percentage";
  const discountValue = Number(data.discountValue || 0);
  const usageLimit = data.usageLimit === undefined || data.usageLimit === null || data.usageLimit === ""
    ? null
    : Number(data.usageLimit);
  const startsAt = normalizeCouponDateTime(data.startsAt, "startsAt");
  const expiresAt = normalizeCouponDateTime(data.expiresAt, "expiresAt", { endOfDay: true });

  if (!["percentage", "fixed"].includes(discountType)) {
    throw new Error("Loai giam gia voucher khong hop le.");
  }
  if (discountValue <= 0) {
    throw new Error("Gia tri giam gia phai lon hon 0.");
  }
  if (discountType === "percentage" && discountValue > 100) {
    throw new Error("Voucher phan tram khong duoc vuot qua 100%.");
  }
  if (usageLimit !== null && (!Number.isInteger(usageLimit) || usageLimit <= 0)) {
    throw new Error("Gioi han luot dung phai lon hon 0.");
  }
  if (new Date(startsAt) >= new Date(expiresAt)) {
    throw new Error("startsAt phai nho hon expiresAt.");
  }

  return {
    discountType,
    discountValue,
    usageLimit,
    startsAt,
    expiresAt
  };
};

const recycleDeletedCouponCode = async (code) => {
  await pool.request()
    .input("code", sql.VarChar, code)
    .query(`
      UPDATE Coupons
      SET code = CONCAT(LEFT(code, 25), '__deleted__', id)
      WHERE code = @code
        AND deleted_at IS NOT NULL
    `);
};

export const sellerService = {
  // Đăng ký làm người bán — tạo shop ở trạng thái 'pending', chờ admin duyệt
  registerSeller: async ({
    userId,
    shopName,
    shopPhone,
    shopAddress,
    description,
    logoUrl,
    coverUrl,
    pickupAddress,
    identityName,
    identityNumber,
    bankName,
    bankAccountNo,
    bankAccountHolder
  }) => {
    const sellerId = `sel_${Math.random().toString(36).substr(2, 9)}`;

    const existingSeller = await pool.request()
      .input("userId", sql.VarChar, userId)
      .query("SELECT id, status FROM Sellers WHERE user_id = @userId");

    const existing = existingSeller.recordset[0];

    // Đơn đang chờ duyệt hoặc shop đang hoạt động: không cho nộp lại.
    if (existing && ["pending", "active"].includes(existing.status)) {
      const userRes = await pool.request()
        .input("userId", sql.VarChar, userId)
        .query("SELECT id, name, email, role, phone_number, avatar_url, bio, is_active FROM Users WHERE id = @userId");

      return {
        user: userRes.recordset[0],
        sellerId: existing.id,
        sellerStatus: existing.status
      };
    }

    // Shop đã bị từ chối/khoá trước đó vẫn được phép nộp lại — cập nhật
    // thông tin mới và đưa trạng thái về 'pending' để admin duyệt lại.
    const targetSellerId = existing ? existing.id : sellerId;

    // 1. Kiểm tra xem shop_name đã tồn tại chưa (bỏ qua chính bản ghi đang nộp lại)
    const nameCheck = await pool.request()
      .input("shopName", sql.NVarChar, shopName)
      .input("selfId", sql.VarChar, targetSellerId)
      .query("SELECT id FROM Sellers WHERE shop_name = @shopName AND id != @selfId");

    if (nameCheck.recordset.length > 0) {
      throw new Error("Tên cửa hàng đã được sử dụng. Vui lòng chọn tên khác!");
    }

    if (existing) {
      // 2a. Nộp lại đơn: cập nhật bản ghi Sellers cũ về trạng thái 'pending'
      await pool.request()
        .input("id", sql.VarChar, targetSellerId)
        .input("shopName", sql.NVarChar, shopName)
        .input("shopPhone", sql.VarChar, shopPhone)
        .input("shopAddress", sql.NVarChar, shopAddress)
        .input("pickupAddress", sql.NVarChar, pickupAddress || shopAddress)
        .input("logoUrl", sql.VarChar, logoUrl || null)
        .input("coverUrl", sql.VarChar, coverUrl || null)
        .input("description", sql.NVarChar, description || null)
        .input("identityName", sql.NVarChar, identityName || null)
        .input("identityNumber", sql.VarChar, identityNumber || null)
        .input("bankName", sql.NVarChar, bankName || null)
        .input("bankAccountNo", sql.VarChar, bankAccountNo || null)
        .input("bankAccountHolder", sql.NVarChar, bankAccountHolder || null)
        .query(`
          UPDATE Sellers
          SET shop_name = @shopName,
              shop_phone = @shopPhone,
              shop_address = @shopAddress,
              pickup_address = @pickupAddress,
              logo_url = @logoUrl,
              cover_url = @coverUrl,
              description = @description,
              identity_name = @identityName,
              identity_number = @identityNumber,
              bank_name = @bankName,
              bank_account_no = @bankAccountNo,
              bank_account_holder = @bankAccountHolder,
              status = 'pending',
              updated_at = GETDATE()
          WHERE id = @id
        `);
    } else {
      // 2b. Đăng ký lần đầu: thêm bản ghi mới vào bảng Sellers
      await pool.request()
        .input("id", sql.VarChar, targetSellerId)
        .input("userId", sql.VarChar, userId)
        .input("shopName", sql.NVarChar, shopName)
        .input("shopPhone", sql.VarChar, shopPhone)
        .input("shopAddress", sql.NVarChar, shopAddress)
        .input("pickupAddress", sql.NVarChar, pickupAddress || shopAddress)
        .input("logoUrl", sql.VarChar, logoUrl || null)
        .input("coverUrl", sql.VarChar, coverUrl || null)
        .input("description", sql.NVarChar, description || null)
        .input("identityName", sql.NVarChar, identityName || null)
        .input("identityNumber", sql.VarChar, identityNumber || null)
        .input("bankName", sql.NVarChar, bankName || null)
        .input("bankAccountNo", sql.VarChar, bankAccountNo || null)
        .input("bankAccountHolder", sql.NVarChar, bankAccountHolder || null)
        .query(`
          INSERT INTO Sellers (
            id, user_id, shop_name, shop_phone, shop_address, pickup_address,
            logo_url, cover_url, description, identity_name, identity_number,
            bank_name, bank_account_no, bank_account_holder, status, created_at, updated_at
          )
          VALUES (
            @id, @userId, @shopName, @shopPhone, @shopAddress, @pickupAddress,
            @logoUrl, @coverUrl, @description, @identityName, @identityNumber,
            @bankName, @bankAccountNo, @bankAccountHolder, 'pending', GETDATE(), GETDATE()
          )
        `);
    }

    // 3. Role KHÔNG được nâng lên 'seller' ở đây nữa — chỉ admin duyệt đơn
    // (xem adminService.approveSeller) mới nâng role, để tránh admin tự
    // mất quyền admin khi đăng ký shop và tránh cấp quyền seller trước khi duyệt.
    const userRes = await pool.request()
      .input("userId", sql.VarChar, userId)
      .query("SELECT id, name, email, role, phone_number, avatar_url, bio, is_active FROM Users WHERE id = @userId");

    return {
      user: userRes.recordset[0],
      sellerId: targetSellerId,
      sellerStatus: "pending"
    };
  },

  // Lấy thông tin seller theo userId
  getSellerByUserId: async (userId) => {
    const result = await pool.request()
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

    await pool.request()
      .input("sellerId", sql.VarChar, seller.id)
      .input("shopName", sql.NVarChar, data.shopName || seller.shop_name)
      .input("shopPhone", sql.VarChar, data.shopPhone || seller.shop_phone)
      .input("shopAddress", sql.NVarChar, data.shopAddress || seller.shop_address)
      .input("pickupAddress", sql.NVarChar, data.pickupAddress || seller.pickup_address || data.shopAddress || seller.shop_address)
      .input("logoUrl", sql.VarChar, data.logoUrl || seller.logo_url || null)
      .input("coverUrl", sql.VarChar, data.coverUrl || seller.cover_url || null)
      .input("description", sql.NVarChar, data.description ?? seller.description)
      .input("identityName", sql.NVarChar, data.identityName || seller.identity_name || null)
      .input("identityNumber", sql.VarChar, data.identityNumber || seller.identity_number || null)
      .input("bankName", sql.NVarChar, data.bankName || seller.bank_name || null)
      .input("bankAccountNo", sql.VarChar, data.bankAccountNo || seller.bank_account_no || null)
      .input("bankAccountHolder", sql.NVarChar, data.bankAccountHolder || seller.bank_account_holder || null)
      .query(`
        UPDATE Sellers
        SET shop_name = @shopName,
            shop_phone = @shopPhone,
            shop_address = @shopAddress,
            pickup_address = @pickupAddress,
            logo_url = @logoUrl,
            cover_url = @coverUrl,
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
    const result = await pool.request()
      .input("sellerId", sql.VarChar, sellerId)
      .query("SELECT * FROM Sellers WHERE id = @sellerId");
    return result.recordset[0];
  },

  getPublicShop: async (sellerId) => {
    const shopRes = await pool.request()
      .input("sellerId", sql.VarChar, sellerId)
      .query(`
        SELECT id, user_id, shop_name, shop_phone, shop_address, logo_url, cover_url,
               description, status, created_at
        FROM Sellers
        WHERE id = @sellerId AND status = 'active'
      `);

    const shop = shopRes.recordset[0];
    if (!shop) return null;

    const productsRes = await pool.request()
      .input("sellerId", sql.VarChar, sellerId)
      .query(`
        SELECT TOP 24 p.id, p.name, p.description,
               COALESCE(fs.sale_price, pv.price, p.base_price) AS price,
               CASE WHEN fs.id IS NOT NULL THEN COALESCE(fs.original_price, pv.price, p.base_price) ELSE NULL END AS originalPrice,
               CASE WHEN fs.id IS NOT NULL THEN CAST(1 AS BIT) ELSE CAST(0 AS BIT) END AS isFlashSale,
               fs.ends_at AS flashSaleEndsAt,
               COALESCE(pv.stock_qty, 0) AS stock,
               COALESCE(pv.image_url, pi.image_url, '') AS image,
               cat.name AS category
        FROM Products p
        OUTER APPLY (
          SELECT TOP 1 id, price, stock_qty, image_url
          FROM ProductVariants
          WHERE product_id = p.id
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
        ORDER BY p.created_at DESC
      `);

    const statsRes = await pool.request()
      .input("sellerId", sql.VarChar, sellerId)
      .query(`
        SELECT COUNT(*) AS total_products
        FROM Products
        WHERE seller_id = @sellerId AND is_active = 1
      `);

    return {
      shop,
      products: productsRes.recordset.map(product => ({
        ...product,
        price: Number(product.price || 0),
        originalPrice: product.originalPrice === null ? null : Number(product.originalPrice || 0),
        isFlashSale: Boolean(product.isFlashSale),
        stock: Number(product.stock || 0),
        seller_id: sellerId,
        seller_user_id: shop.user_id
      })),
      stats: statsRes.recordset[0]
    };
  },

  // Lấy danh sách sản phẩm của Seller
  getSellerProducts: async (sellerId) => {
    const result = await pool.request()
      .input("sellerId", sql.VarChar, sellerId)
      .query(`
        SELECT p.*,
               (SELECT TOP 1 image_url FROM ProductImages WHERE product_id = p.id ORDER BY is_primary DESC, sort_order ASC) AS image_url,
               (SELECT ISNULL(SUM(stock_qty), 0) FROM ProductVariants WHERE product_id = p.id) AS stock_qty,
               (SELECT TOP 1 c.id FROM ProductCategories pc JOIN Categories c ON pc.category_id = c.id WHERE pc.product_id = p.id) AS category_id,
               (SELECT TOP 1 c.name FROM ProductCategories pc JOIN Categories c ON pc.category_id = c.id WHERE pc.product_id = p.id) AS category_name,
               br.name AS brand_name
        FROM Products p
        LEFT JOIN Brands br ON p.brand_id = br.id
        WHERE p.seller_id = @sellerId
        ORDER BY p.created_at DESC
      `);
    return result.recordset;
  },

  // Lấy danh sách đơn hàng có chứa sản phẩm của Seller
  getSellerOrders: async (sellerId) => {
    // Lấy các đơn hàng
    const ordersRes = await pool.request()
      .input("sellerId", sql.VarChar, sellerId)
      .query(`
        SELECT DISTINCT o.*
        FROM Orders o
        JOIN OrderItems oi ON o.id = oi.order_id
        JOIN ProductVariants pv ON oi.variant_id = pv.id
        JOIN Products p ON pv.product_id = p.id
        WHERE p.seller_id = @sellerId
        ORDER BY o.created_at DESC
      `);
      
    const orders = ordersRes.recordset;
    
    // Lấy các OrderItems thuộc seller này cho từng đơn hàng
    for (let order of orders) {
      const itemsRes = await pool.request()
        .input("orderId", sql.VarChar, order.id)
        .input("sellerId", sql.VarChar, sellerId)
        .query(`
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
      order.items = itemsRes.recordset;
    }
    
    return orders;
  },

  updateSellerOrderItem: async (sellerId, orderItemId, { fulfillmentStatus, trackingCode, shippingLabelUrl, cancelReason }) => {
    const allowed = ["pending_fulfillment", "ready_to_ship", "shipping", "delivered", "cancelled"];
    if (!allowed.includes(fulfillmentStatus)) {
      throw new Error("Trạng thái đơn hàng không hợp lệ.");
    }

    const ownerCheck = await pool.request()
      .input("sellerId", sql.VarChar, sellerId)
      .input("orderItemId", sql.VarChar, orderItemId)
      .query(`
        SELECT oi.id, oi.fulfillment_status
        FROM OrderItems oi
        JOIN ProductVariants pv ON oi.variant_id = pv.id
        JOIN Products p ON pv.product_id = p.id
        WHERE oi.id = @orderItemId AND p.seller_id = @sellerId
      `);

    if (ownerCheck.recordset.length === 0) {
      throw new Error("Không tìm thấy dòng đơn hàng thuộc shop của bạn.");
    }

    if (ownerCheck.recordset[0].fulfillment_status === "shipping" && fulfillmentStatus === "cancelled") {
      throw new Error("Không thể hủy đơn đã chuyển sang trạng thái đang giao.");
    }

    await pool.request()
      .input("orderItemId", sql.VarChar, orderItemId)
      .input("status", sql.VarChar, fulfillmentStatus)
      .input("trackingCode", sql.VarChar, trackingCode || null)
      .input("shippingLabelUrl", sql.VarChar, shippingLabelUrl || null)
      .input("cancelReason", sql.NVarChar, cancelReason || null)
      .query(`
        UPDATE OrderItems
        SET fulfillment_status = @status,
            tracking_code = COALESCE(@trackingCode, tracking_code),
            shipping_label_url = COALESCE(@shippingLabelUrl, shipping_label_url),
            cancel_reason = CASE WHEN @status = 'cancelled' THEN @cancelReason ELSE cancel_reason END
        WHERE id = @orderItemId
      `);

    return true;
  },

  // Lấy thống kê Dashboard cho Seller
  getSellerDashboardStats: async (sellerId) => {
    // 1. Tổng số sản phẩm
    const productCountRes = await pool.request()
      .input("sellerId", sql.VarChar, sellerId)
      .query("SELECT COUNT(*) AS total_products FROM Products WHERE seller_id = @sellerId");
      
    // 2. Tổng doanh thu & Số đơn hàng từ các sản phẩm thuộc seller
    const salesRes = await pool.request()
      .input("sellerId", sql.VarChar, sellerId)
      .query(`
        SELECT 
          ISNULL(SUM(oi.total_price), 0) AS total_revenue,
          COUNT(DISTINCT oi.order_id) AS total_orders
        FROM OrderItems oi
        JOIN ProductVariants pv ON oi.variant_id = pv.id
        JOIN Products p ON pv.product_id = p.id
        JOIN Orders o ON oi.order_id = o.id
        WHERE p.seller_id = @sellerId AND o.status != 'cancelled'
      `);

    const pendingRes = await pool.request()
      .input("sellerId", sql.VarChar, sellerId)
      .query(`
        SELECT COUNT(*) AS pending_orders
        FROM OrderItems oi
        JOIN ProductVariants pv ON oi.variant_id = pv.id
        JOIN Products p ON pv.product_id = p.id
        WHERE p.seller_id = @sellerId AND oi.fulfillment_status IN ('pending_fulfillment', 'ready_to_ship')
      `);

    const lowStockRes = await pool.request()
      .input("sellerId", sql.VarChar, sellerId)
      .query(`
        SELECT COUNT(*) AS low_stock
        FROM ProductVariants pv
        JOIN Products p ON pv.product_id = p.id
        WHERE p.seller_id = @sellerId AND pv.stock_qty BETWEEN 1 AND 5
      `);

    const topProductsRes = await pool.request()
      .input("sellerId", sql.VarChar, sellerId)
      .query(`
        SELECT TOP 5 p.id, p.name, SUM(oi.quantity) AS sold_qty, SUM(oi.total_price) AS revenue
        FROM OrderItems oi
        JOIN ProductVariants pv ON oi.variant_id = pv.id
        JOIN Products p ON pv.product_id = p.id
        JOIN Orders o ON oi.order_id = o.id
        WHERE p.seller_id = @sellerId AND o.status != 'cancelled'
        GROUP BY p.id, p.name
        ORDER BY sold_qty DESC
      `);

    return {
      totalProducts: productCountRes.recordset[0].total_products,
      totalRevenue: salesRes.recordset[0].total_revenue,
      totalOrders: salesRes.recordset[0].total_orders,
      pendingOrders: pendingRes.recordset[0].pending_orders,
      lowStock: lowStockRes.recordset[0].low_stock,
      topProducts: topProductsRes.recordset
    };
  },

  getSellerBrands: async () => {
    const result = await pool.request().query(`
      SELECT id, name
      FROM Brands
      WHERE status = 'active'
      ORDER BY name ASC
    `);
    return result.recordset;
  },

  getSellerCategories: async () => {
    const result = await pool.request().query(`
      SELECT id, name, slug
      FROM Categories
      WHERE is_active = 1
      ORDER BY sort_order ASC, name ASC
    `);
    return result.recordset;
  },

  getSellerCoupons: async (sellerId) => {
    const result = await pool.request()
      .input("sellerId", sql.VarChar, sellerId)
      .query(`
        SELECT *
        FROM Coupons
        WHERE seller_id = @sellerId
          AND deleted_at IS NULL
        ORDER BY created_at DESC
      `);
    return result.recordset;
  },

  createSellerCoupon: async (sellerId, data) => {
    const couponId = `coup_${Math.random().toString(36).substr(2, 9)}`;
    const code = String(data.code || "").trim().toUpperCase();
    if (!code) throw new Error("Mã voucher là bắt buộc.");
    const { discountType, discountValue, usageLimit, startsAt, expiresAt } = validateCouponPayload(data);

    await recycleDeletedCouponCode(code);

    const duplicate = await pool.request()
      .input("code", sql.VarChar, code)
      .query(`
        SELECT TOP 1 id
        FROM Coupons
        WHERE code = @code
          AND deleted_at IS NULL
      `);

    if (duplicate.recordset.length > 0) {
      throw new Error("Ma voucher da ton tai.");
    }

    await pool.request()
      .input("id", sql.VarChar, couponId)
      .input("sellerId", sql.VarChar, sellerId)
      .input("code", sql.VarChar, code)
      .input("description", sql.NVarChar, data.description || null)
      .input("discountType", sql.VarChar, discountType)
      .input("discountValue", sql.Decimal(18, 2), discountValue)
      .input("minOrderAmount", sql.Decimal(18, 2), data.minOrderAmount ? Number(data.minOrderAmount) : null)
      .input("maxDiscountAmt", sql.Decimal(18, 2), data.maxDiscountAmt ? Number(data.maxDiscountAmt) : null)
      .input("usageLimit", sql.Int, usageLimit)
      .input("startsAt", sql.VarChar, startsAt)
      .input("expiresAt", sql.VarChar, expiresAt)
      .query(`
        INSERT INTO Coupons (
          id, seller_id, code, description, discount_type, discount_value,
          min_order_amount, max_discount_amt, usage_limit, starts_at, expires_at, is_active
        )
        VALUES (
          @id, @sellerId, @code, @description, @discountType, @discountValue,
          @minOrderAmount, @maxDiscountAmt, @usageLimit,
          CONVERT(datetime2, @startsAt), CONVERT(datetime2, @expiresAt), 1
        )
      `);
    return { id: couponId, code };
  },

  updateSellerCoupon: async (sellerId, couponId, data) => {
    const check = await pool.request()
      .input("sellerId", sql.VarChar, sellerId)
      .input("couponId", sql.VarChar, couponId)
      .query("SELECT id, starts_at, expires_at FROM Coupons WHERE id = @couponId AND seller_id = @sellerId AND deleted_at IS NULL");

    if (check.recordset.length === 0) {
      throw new Error("Không tìm thấy voucher thuộc shop của bạn.");
    }

    const request = pool.request()
      .input("sellerId", sql.VarChar, sellerId)
      .input("couponId", sql.VarChar, couponId);
    const updates = [];

    if (data.isActive !== undefined) {
      updates.push("is_active = @isActive");
      request.input("isActive", sql.Bit, Boolean(data.isActive));
    }

    let nextStartsAt = check.recordset[0].starts_at;
    let nextExpiresAt = check.recordset[0].expires_at;
    if (data.startsAt !== undefined) {
      nextStartsAt = normalizeCouponDateTime(data.startsAt, "startsAt");
      updates.push("starts_at = CONVERT(datetime2, @startsAt)");
      request.input("startsAt", sql.VarChar, nextStartsAt);
    }

    if (data.expiresAt !== undefined) {
      nextExpiresAt = normalizeCouponDateTime(data.expiresAt, "expiresAt", { endOfDay: true });
      updates.push("expires_at = CONVERT(datetime2, @expiresAt)");
      request.input("expiresAt", sql.VarChar, nextExpiresAt);
    }

    if (new Date(nextStartsAt) >= new Date(nextExpiresAt)) {
      throw new Error("startsAt phai nho hon expiresAt.");
    }

    if (updates.length === 0) {
      return true;
    }

    await request.query(`
      UPDATE Coupons
      SET ${updates.join(", ")}
      WHERE id = @couponId AND seller_id = @sellerId
    `);
    return true;
  },

  deleteSellerCoupon: async (sellerId, couponId) => {
    const coupon = await pool.request()
      .input("sellerId", sql.VarChar, sellerId)
      .input("couponId", sql.VarChar, couponId)
      .query(`
        SELECT id, code
        FROM Coupons
        WHERE id = @couponId AND seller_id = @sellerId AND deleted_at IS NULL
      `);

    if (coupon.recordset.length === 0) {
      throw new Error("Khong tim thay voucher thuoc shop cua ban.");
    }

    const deletedCode = `${String(coupon.recordset[0].code || "").slice(0, 25)}__deleted__${couponId}`;

    const result = await pool.request()
      .input("sellerId", sql.VarChar, sellerId)
      .input("couponId", sql.VarChar, couponId)
      .input("deletedCode", sql.VarChar, deletedCode)
      .query(`
        UPDATE Coupons
        SET is_active = 0,
            code = @deletedCode,
            deleted_at = GETDATE()
        WHERE id = @couponId AND seller_id = @sellerId AND deleted_at IS NULL
      `);

    if (result.rowsAffected[0] === 0) {
      throw new Error("Khong tim thay voucher thuoc shop cua ban.");
    }

    return true;
  }
};
