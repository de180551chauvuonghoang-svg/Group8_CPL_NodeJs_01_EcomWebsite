import { sql, pool } from "../config/db.js";
import { sellerService } from "./sellerService.js";
import { v4 as uuidv4 } from "uuid";

// A011: ngưỡng "sắp hết hàng" cố định theo quyết định trong ADMIN.md
const LOW_STOCK_THRESHOLD = 5;

export const adminService = {
  // Sản phẩm của 1 seller — tái dùng đúng query seller tự xem sản phẩm của mình
  getSellerProducts: async (sellerId) => sellerService.getSellerProducts(sellerId),

  // Chi tiết 1 sản phẩm: thông tin gốc + toàn bộ ảnh + toàn bộ biến thể (variant)
  getProductDetail: async (productId) => {
    const productRes = await pool.request()
      .input("productId", sql.VarChar, productId)
      .query(`
        SELECT p.id, p.name, p.slug, p.description, p.short_desc, p.base_price,
               p.is_active, p.is_featured, p.created_at, p.updated_at,
               s.id AS seller_id, s.shop_name AS seller_name
        FROM Products p
        LEFT JOIN Sellers s ON p.seller_id = s.id
        WHERE p.id = @productId
      `);
    const product = productRes.recordset[0];
    if (!product) {
      throw new Error("Không tìm thấy sản phẩm này.");
    }

    const imagesRes = await pool.request()
      .input("productId", sql.VarChar, productId)
      .query(`
        SELECT id, image_url, alt_text, sort_order, is_primary
        FROM ProductImages
        WHERE product_id = @productId
        ORDER BY is_primary DESC, sort_order ASC
      `);

    const variantsRes = await pool.request()
      .input("productId", sql.VarChar, productId)
      .query(`
        SELECT pv.id, pv.sku, pv.price, pv.compare_price, pv.stock_qty, pv.image_url, pv.is_active,
               (
                 SELECT STRING_AGG(av.value, ' / ')
                 FROM VariantAttributeValues vav
                 JOIN AttributeValues av ON vav.attribute_value_id = av.id
                 WHERE vav.variant_id = pv.id
               ) AS variant_label
        FROM ProductVariants pv
        WHERE pv.product_id = @productId
        ORDER BY pv.created_at ASC
      `);

    return {
      ...product,
      images: imagesRes.recordset,
      variants: variantsRes.recordset
    };
  },

  // Report doanh thu/đơn hàng theo từng seller
  reportSellers: async () => {
    const result = await pool.request().query(`
      SELECT
        s.id AS seller_id,
        s.shop_name,
        s.status,
        (SELECT COUNT(*) FROM Products WHERE seller_id = s.id) AS total_products,
        ISNULL(rev.total_revenue, 0) AS total_revenue,
        ISNULL(rev.total_orders, 0) AS total_orders
      FROM Sellers s
      OUTER APPLY (
        SELECT SUM(oi.total_price) AS total_revenue, COUNT(DISTINCT oi.order_id) AS total_orders
        FROM OrderItems oi
        JOIN ProductVariants pv ON oi.variant_id = pv.id
        JOIN Products p ON pv.product_id = p.id
        JOIN Orders o ON oi.order_id = o.id
        WHERE p.seller_id = s.id AND o.status != 'cancelled'
      ) rev
      ORDER BY total_revenue DESC
    `);
    return result.recordset;
  },

  // Doanh số bán hàng theo thời gian (line chart)
  // groupBy: 'day' | 'month'. Mặc định 30 ngày gần nhất.
  revenueStats: async ({ from, to, groupBy = "day" } = {}) => {
    const fromDate = from || null;
    const toDate = to || null;
    const dateFormat = groupBy === "month" ? "yyyy-MM" : "yyyy-MM-dd";

    const result = await pool.request()
      .input("from", sql.DateTime2, fromDate)
      .input("to", sql.DateTime2, toDate)
      .query(`
        SELECT
          FORMAT(o.created_at, '${dateFormat}') AS bucket,
          SUM(oi.total_price) AS revenue,
          COUNT(DISTINCT o.id) AS orders_count
        FROM Orders o
        JOIN OrderItems oi ON oi.order_id = o.id
        WHERE o.status != 'cancelled'
          AND (@from IS NULL OR o.created_at >= @from)
          AND (@to IS NULL OR o.created_at <= @to)
        GROUP BY FORMAT(o.created_at, '${dateFormat}')
        ORDER BY bucket ASC
      `);
    return result.recordset;
  },

  // Dòng tiền vào (Payments đã thanh toán) / ra (Refunds đã hoàn tất) theo thời gian
  cashflowStats: async ({ from, to, groupBy = "day" } = {}) => {
    const fromDate = from || null;
    const toDate = to || null;
    const dateFormat = groupBy === "month" ? "yyyy-MM" : "yyyy-MM-dd";

    const inflowRes = await pool.request()
      .input("from", sql.DateTime2, fromDate)
      .input("to", sql.DateTime2, toDate)
      .query(`
        SELECT FORMAT(paid_at, '${dateFormat}') AS bucket, SUM(amount) AS amount
        FROM Payments
        WHERE status = 'paid' AND paid_at IS NOT NULL
          AND (@from IS NULL OR paid_at >= @from)
          AND (@to IS NULL OR paid_at <= @to)
        GROUP BY FORMAT(paid_at, '${dateFormat}')
      `);

    const outflowRes = await pool.request()
      .input("from", sql.DateTime2, fromDate)
      .input("to", sql.DateTime2, toDate)
      .query(`
        SELECT FORMAT(refunded_at, '${dateFormat}') AS bucket, SUM(refund_amount) AS amount
        FROM Refunds
        WHERE status = 'completed' AND refunded_at IS NOT NULL
          AND (@from IS NULL OR refunded_at >= @from)
          AND (@to IS NULL OR refunded_at <= @to)
        GROUP BY FORMAT(refunded_at, '${dateFormat}')
      `);

    const buckets = new Map();
    for (const row of inflowRes.recordset) {
      buckets.set(row.bucket, { bucket: row.bucket, cash_in: Number(row.amount) || 0, cash_out: 0 });
    }
    for (const row of outflowRes.recordset) {
      const existing = buckets.get(row.bucket) || { bucket: row.bucket, cash_in: 0, cash_out: 0 };
      existing.cash_out = Number(row.amount) || 0;
      buckets.set(row.bucket, existing);
    }

    return Array.from(buckets.values()).sort((a, b) => a.bucket.localeCompare(b.bucket));
  },

  // Report tổng chi tiêu/số đơn theo từng user (khách mua hàng)
  reportUsers: async () => {
    const result = await pool.request().query(`
      SELECT
        u.id AS user_id,
        u.name,
        u.email,
        u.role,
        ISNULL(o_agg.total_spent, 0) AS total_spent,
        ISNULL(o_agg.total_orders, 0) AS total_orders
      FROM Users u
      OUTER APPLY (
        SELECT SUM(o.total) AS total_spent, COUNT(*) AS total_orders
        FROM Orders o
        WHERE o.user_id = u.id AND o.status != 'cancelled'
      ) o_agg
      WHERE u.role != 'admin'
      ORDER BY total_spent DESC
    `);
    return result.recordset;
  },
  // Danh sách shop, lọc theo trạng thái (mặc định: đơn chờ duyệt)
  listSellers: async (status) => {
    const request = pool.request();
    let query = `
      SELECT
        s.id, s.shop_name, s.shop_phone, s.shop_address, s.description,
        s.logo_url, s.status, s.created_at,
        u.id AS user_id, u.name AS owner_name, u.email AS owner_email
      FROM Sellers s
      JOIN Users u ON s.user_id = u.id
    `;
    if (status) {
      request.input("status", sql.VarChar, status);
      query += " WHERE s.status = @status";
    }
    query += " ORDER BY s.created_at DESC";

    const result = await request.query(query);
    return result.recordset;
  },

  getSellerById: async (sellerId) => {
    const result = await pool.request()
      .input("sellerId", sql.VarChar, sellerId)
      .query(`
        SELECT s.*, u.name AS owner_name, u.email AS owner_email, u.role AS owner_role
        FROM Sellers s
        JOIN Users u ON s.user_id = u.id
        WHERE s.id = @sellerId
      `);
    return result.recordset[0] || null;
  },

  // Duyệt đơn: shop chuyển 'active', chủ shop được nâng role lên 'seller'
  approveSeller: async (sellerId) => {
    const seller = await adminService.getSellerById(sellerId);
    if (!seller) {
      throw new Error("Không tìm thấy đơn đăng ký shop này.");
    }
    if (seller.status !== "pending") {
      throw new Error("Đơn này không ở trạng thái chờ duyệt.");
    }

    await pool.request()
      .input("sellerId", sql.VarChar, sellerId)
      .query("UPDATE Sellers SET status = 'active', updated_at = GETDATE() WHERE id = @sellerId");

    await pool.request()
      .input("userId", sql.VarChar, seller.user_id)
      .query("UPDATE Users SET role = 'seller', updated_at = GETDATE() WHERE id = @userId");

    return { sellerId, status: "active" };
  },

  // Từ chối đơn: shop chuyển 'rejected', role user giữ nguyên (chưa từng lên seller)
  rejectSeller: async (sellerId) => {
    const seller = await adminService.getSellerById(sellerId);
    if (!seller) {
      throw new Error("Không tìm thấy đơn đăng ký shop này.");
    }
    if (seller.status !== "pending") {
      throw new Error("Đơn này không ở trạng thái chờ duyệt.");
    }

    await pool.request()
      .input("sellerId", sql.VarChar, sellerId)
      .query("UPDATE Sellers SET status = 'rejected', updated_at = GETDATE() WHERE id = @sellerId");

    return { sellerId, status: "rejected" };
  },

  // Khoá shop đang hoạt động vì vi phạm: hạ role user về lại 'customer'
  suspendSeller: async (sellerId) => {
    const seller = await adminService.getSellerById(sellerId);
    if (!seller) {
      throw new Error("Không tìm thấy shop này.");
    }
    if (seller.status !== "active") {
      throw new Error("Chỉ có thể khoá shop đang hoạt động.");
    }

    await pool.request()
      .input("sellerId", sql.VarChar, sellerId)
      .query("UPDATE Sellers SET status = 'suspended', updated_at = GETDATE() WHERE id = @sellerId");

    await pool.request()
      .input("userId", sql.VarChar, seller.user_id)
      .query("UPDATE Users SET role = 'customer', updated_at = GETDATE() WHERE id = @userId");

    return { sellerId, status: "suspended" };
  },

  // Hạ trực tiếp 1 user đang là seller xuống lại customer (tìm shop theo userId rồi suspend)
  demoteSellerToCustomer: async (userId) => {
    const sellerRes = await pool.request()
      .input("userId", sql.VarChar, userId)
      .query("SELECT id FROM Sellers WHERE user_id = @userId");
    const seller = sellerRes.recordset[0];
    if (!seller) {
      throw new Error("Người dùng này không có shop nào để hạ quyền.");
    }

    return adminService.suspendSeller(seller.id);
  },

  // Danh sách user, lọc theo role / trạng thái hoạt động
  // q: tìm theo tên/email/SĐT (A012)
  listUsers: async ({ role, isActive, q } = {}) => {
    const request = pool.request();
    let query = `
      SELECT id, name, email, phone_number, avatar_url, role, is_active, suspend_reason, created_at
      FROM Users
      WHERE 1 = 1
    `;
    if (role) {
      request.input("role", sql.VarChar, role);
      query += " AND role = @role";
    }
    if (isActive !== undefined) {
      request.input("isActive", sql.Bit, isActive);
      query += " AND is_active = @isActive";
    }
    if (q) {
      request.input("q", sql.NVarChar, `%${q}%`);
      query += " AND (name LIKE @q OR email LIKE @q OR phone_number LIKE @q)";
    }
    query += " ORDER BY created_at DESC";

    const result = await request.query(query);
    return result.recordset;
  },

  getUserById: async (userId) => {
    const result = await pool.request()
      .input("userId", sql.VarChar, userId)
      .query("SELECT id, name, email, role, is_active FROM Users WHERE id = @userId");
    return result.recordset[0] || null;
  },

  // Khoá / mở khoá tài khoản user (không áp dụng cho tài khoản admin, tránh tự khoá lẫn nhau)
  // reason: lý do khoá (A010), chỉ lưu khi isActive = false. Mở khoá thì xoá lý do cũ.
  setUserActive: async (userId, isActive, reason) => {
    const user = await adminService.getUserById(userId);
    if (!user) {
      throw new Error("Không tìm thấy người dùng này.");
    }
    if (user.role === "admin") {
      throw new Error("Không thể khoá tài khoản admin khác.");
    }

    await pool.request()
      .input("userId", sql.VarChar, userId)
      .input("isActive", sql.Bit, isActive)
      .input("suspendReason", sql.NVarChar, isActive ? null : (reason || null))
      .query("UPDATE Users SET is_active = @isActive, suspend_reason = @suspendReason, updated_at = GETDATE() WHERE id = @userId");

    return { userId, isActive, reason: isActive ? null : (reason || null) };
  },

  // Đếm số đơn COD bị huỷ của 1 user trong N ngày gần nhất — cảnh báo "boom hàng" (A010)
  getBoomOrderCount: async (userId, days = 30) => {
    const result = await pool.request()
      .input("userId", sql.VarChar, userId)
      .input("days", sql.Int, days)
      .query(`
        SELECT COUNT(*) AS boomCount
        FROM Orders o
        JOIN Payments p ON p.order_id = o.id
        WHERE o.user_id = @userId
          AND o.status = 'cancelled'
          AND p.method = 'cod'
          AND o.created_at >= DATEADD(DAY, -@days, GETDATE())
      `);
    return result.recordset[0]?.boomCount || 0;
  },

  // Danh sách user kèm số lần "boom hàng" trong 30 ngày gần nhất (dùng cho badge cảnh báo)
  listUsersWithBoomCount: async ({ role, isActive, q } = {}) => {
    const users = await adminService.listUsers({ role, isActive, q });
    const result = await pool.request().query(`
      SELECT o.user_id, COUNT(*) AS boomCount
      FROM Orders o
      JOIN Payments p ON p.order_id = o.id
      WHERE o.status = 'cancelled' AND p.method = 'cod'
        AND o.created_at >= DATEADD(DAY, -30, GETDATE())
      GROUP BY o.user_id
    `);
    const boomMap = new Map(result.recordset.map(r => [r.user_id, r.boomCount]));
    return users.map(u => ({ ...u, boom_count: boomMap.get(u.id) || 0 }));
  },

  // ============================================================
  //  A007: DANH MỤC SẢN PHẨM (Categories CRUD)
  // ============================================================

  listCategories: async () => {
    const result = await pool.request().query(`
      SELECT id, name, slug, description, image_url, parent_id, sort_order, is_active, created_at
      FROM Categories
      ORDER BY sort_order ASC, created_at ASC
    `);
    return result.recordset;
  },

  getCategoryById: async (categoryId) => {
    const result = await pool.request()
      .input("categoryId", sql.VarChar, categoryId)
      .query("SELECT * FROM Categories WHERE id = @categoryId");
    return result.recordset[0] || null;
  },

  createCategory: async ({ name, slug, description, image_url, parent_id, sort_order }) => {
    if (!name || !slug) {
      throw new Error("Vui lòng nhập đầy đủ tên và slug danh mục.");
    }
    const id = `cat_${uuidv4()}`;
    await pool.request()
      .input("id", sql.VarChar, id)
      .input("name", sql.NVarChar, name)
      .input("slug", sql.VarChar, slug)
      .input("description", sql.NVarChar, description || null)
      .input("imageUrl", sql.VarChar, image_url || null)
      .input("parentId", sql.VarChar, parent_id || null)
      .input("sortOrder", sql.Int, sort_order || 0)
      .query(`
        INSERT INTO Categories (id, name, slug, description, image_url, parent_id, sort_order, is_active)
        VALUES (@id, @name, @slug, @description, @imageUrl, @parentId, @sortOrder, 1)
      `);
    return adminService.getCategoryById(id);
  },

  updateCategory: async (categoryId, { name, slug, description, image_url, parent_id, sort_order, is_active }) => {
    const existing = await adminService.getCategoryById(categoryId);
    if (!existing) {
      throw new Error("Không tìm thấy danh mục này.");
    }
    if (parent_id === categoryId) {
      throw new Error("Danh mục không thể là danh mục cha của chính nó.");
    }

    await pool.request()
      .input("categoryId", sql.VarChar, categoryId)
      .input("name", sql.NVarChar, name ?? existing.name)
      .input("slug", sql.VarChar, slug ?? existing.slug)
      .input("description", sql.NVarChar, description !== undefined ? description : existing.description)
      .input("imageUrl", sql.VarChar, image_url !== undefined ? image_url : existing.image_url)
      .input("parentId", sql.VarChar, parent_id !== undefined ? parent_id : existing.parent_id)
      .input("sortOrder", sql.Int, sort_order !== undefined ? sort_order : existing.sort_order)
      .input("isActive", sql.Bit, is_active !== undefined ? is_active : existing.is_active)
      .query(`
        UPDATE Categories
        SET name = @name, slug = @slug, description = @description, image_url = @imageUrl,
            parent_id = @parentId, sort_order = @sortOrder, is_active = @isActive
        WHERE id = @categoryId
      `);
    return adminService.getCategoryById(categoryId);
  },

  // Xoá danh mục = soft-delete (is_active = 0), không xoá vật lý — giữ liên kết ProductCategories cũ
  deleteCategory: async (categoryId) => {
    const existing = await adminService.getCategoryById(categoryId);
    if (!existing) {
      throw new Error("Không tìm thấy danh mục này.");
    }
    await pool.request()
      .input("categoryId", sql.VarChar, categoryId)
      .query("UPDATE Categories SET is_active = 0 WHERE id = @categoryId");
    return { categoryId, is_active: false };
  },

  // ============================================================
  //  A008: NHÀ CUNG CẤP / THƯƠNG HIỆU (Brands CRUD)
  // ============================================================

  listBrands: async (status) => {
    const request = pool.request();
    let query = "SELECT id, name, logo_url, description, status, created_at, updated_at FROM Brands";
    if (status) {
      request.input("status", sql.VarChar, status);
      query += " WHERE status = @status";
    }
    query += " ORDER BY name ASC";
    const result = await request.query(query);
    return result.recordset;
  },

  getBrandById: async (brandId) => {
    const result = await pool.request()
      .input("brandId", sql.VarChar, brandId)
      .query("SELECT * FROM Brands WHERE id = @brandId");
    return result.recordset[0] || null;
  },

  createBrand: async ({ name, logo_url, description }) => {
    if (!name) {
      throw new Error("Vui lòng nhập tên thương hiệu.");
    }
    const id = `brand_${uuidv4()}`;
    await pool.request()
      .input("id", sql.VarChar, id)
      .input("name", sql.NVarChar, name)
      .input("logoUrl", sql.VarChar, logo_url || null)
      .input("description", sql.NVarChar, description || null)
      .query(`
        INSERT INTO Brands (id, name, logo_url, description, status)
        VALUES (@id, @name, @logoUrl, @description, 'active')
      `);
    return adminService.getBrandById(id);
  },

  updateBrand: async (brandId, { name, logo_url, description }) => {
    const existing = await adminService.getBrandById(brandId);
    if (!existing) {
      throw new Error("Không tìm thấy thương hiệu này.");
    }
    await pool.request()
      .input("brandId", sql.VarChar, brandId)
      .input("name", sql.NVarChar, name ?? existing.name)
      .input("logoUrl", sql.VarChar, logo_url !== undefined ? logo_url : existing.logo_url)
      .input("description", sql.NVarChar, description !== undefined ? description : existing.description)
      .query(`
        UPDATE Brands
        SET name = @name, logo_url = @logoUrl, description = @description, updated_at = GETDATE()
        WHERE id = @brandId
      `);
    return adminService.getBrandById(brandId);
  },

  // Bật/tắt thương hiệu (ẩn khỏi lựa chọn gán cho sản phẩm mà không xoá dữ liệu)
  setBrandStatus: async (brandId, status) => {
    const existing = await adminService.getBrandById(brandId);
    if (!existing) {
      throw new Error("Không tìm thấy thương hiệu này.");
    }
    await pool.request()
      .input("brandId", sql.VarChar, brandId)
      .input("status", sql.VarChar, status)
      .query("UPDATE Brands SET status = @status, updated_at = GETDATE() WHERE id = @brandId");
    return { brandId, status };
  },

  // ============================================================
  //  Admin Orders module (nền tảng cho A002 / A003 / A012)
  // ============================================================

  listOrders: async ({ status, from, to, q } = {}) => {
    const request = pool.request();
    let query = `
      SELECT
        o.id, o.status, o.subtotal, o.discount_amount, o.shipping_fee, o.total,
        o.shipping_name, o.shipping_phone, o.created_at,
        u.id AS user_id, u.name AS user_name, u.email AS user_email,
        p.method AS payment_method, p.status AS payment_status
      FROM Orders o
      JOIN Users u ON o.user_id = u.id
      LEFT JOIN Payments p ON p.order_id = o.id
      WHERE 1 = 1
    `;
    if (status) {
      request.input("status", sql.VarChar, status);
      query += " AND o.status = @status";
    }
    if (from) {
      request.input("from", sql.DateTime2, from);
      query += " AND o.created_at >= @from";
    }
    if (to) {
      request.input("to", sql.DateTime2, to);
      query += " AND o.created_at <= @to";
    }
    if (q) {
      request.input("q", sql.NVarChar, `%${q}%`);
      query += ` AND (
        o.id LIKE @q OR o.shipping_phone LIKE @q OR u.name LIKE @q OR u.email LIKE @q
        OR EXISTS (SELECT 1 FROM OrderItems oi WHERE oi.order_id = o.id AND oi.product_name LIKE @q)
      )`;
    }
    query += " ORDER BY o.created_at DESC";

    const result = await request.query(query);
    return result.recordset;
  },

  getOrderDetail: async (orderId) => {
    const orderRes = await pool.request()
      .input("orderId", sql.VarChar, orderId)
      .query(`
        SELECT o.*, u.name AS user_name, u.email AS user_email
        FROM Orders o
        JOIN Users u ON o.user_id = u.id
        WHERE o.id = @orderId
      `);
    const order = orderRes.recordset[0];
    if (!order) {
      throw new Error("Không tìm thấy đơn hàng này.");
    }

    const itemsRes = await pool.request()
      .input("orderId", sql.VarChar, orderId)
      .query(`
        SELECT id, variant_id, quantity, unit_price, total_price, product_name, variant_info, fulfillment_status
        FROM OrderItems
        WHERE order_id = @orderId
      `);

    const paymentRes = await pool.request()
      .input("orderId", sql.VarChar, orderId)
      .query("SELECT * FROM Payments WHERE order_id = @orderId");

    return {
      ...order,
      items: itemsRes.recordset,
      payment: paymentRes.recordset[0] || null
    };
  },

  // ============================================================
  //  A011: QUẢN LÝ KHO HÀNG & TỒN KHO
  // ============================================================

  listInventory: async ({ lowStockOnly } = {}) => {
    const request = pool.request();
    let query = `
      SELECT pv.id AS variant_id, pv.sku, pv.stock_qty, pv.price, pv.image_url,
             p.id AS product_id, p.name AS product_name,
             s.shop_name AS seller_name
      FROM ProductVariants pv
      JOIN Products p ON pv.product_id = p.id
      LEFT JOIN Sellers s ON p.seller_id = s.id
      WHERE pv.is_active = 1
    `;
    if (lowStockOnly) {
      request.input("threshold", sql.Int, LOW_STOCK_THRESHOLD);
      query += " AND pv.stock_qty <= @threshold";
    }
    query += " ORDER BY pv.stock_qty ASC";
    const result = await request.query(query);
    return result.recordset;
  },

  // Điều chỉnh tồn kho tay: changeQty dương = nhập thêm, âm = xuất/điều chỉnh giảm
  adjustInventory: async (variantId, { changeQty, reason, adminId }) => {
    const qty = Number(changeQty);
    if (!qty) {
      throw new Error("Số lượng điều chỉnh phải khác 0.");
    }
    const variantRes = await pool.request()
      .input("variantId", sql.VarChar, variantId)
      .query("SELECT id, stock_qty FROM ProductVariants WHERE id = @variantId");
    const variant = variantRes.recordset[0];
    if (!variant) {
      throw new Error("Không tìm thấy biến thể sản phẩm này.");
    }
    const newQty = variant.stock_qty + qty;
    if (newQty < 0) {
      throw new Error("Số lượng tồn kho sau điều chỉnh không được âm.");
    }

    await pool.request()
      .input("variantId", sql.VarChar, variantId)
      .input("stockQty", sql.Int, newQty)
      .query("UPDATE ProductVariants SET stock_qty = @stockQty, updated_at = GETDATE() WHERE id = @variantId");

    const logId = `invlog_${uuidv4()}`;
    await pool.request()
      .input("id", sql.VarChar, logId)
      .input("variantId", sql.VarChar, variantId)
      .input("changeQty", sql.Int, qty)
      .input("reason", sql.NVarChar, reason || "adjustment")
      .input("createdBy", sql.VarChar, adminId || null)
      .query(`
        INSERT INTO InventoryLogs (id, variant_id, change_qty, reason, created_by)
        VALUES (@id, @variantId, @changeQty, @reason, @createdBy)
      `);

    return { variantId, stock_qty: newQty };
  },

  getInventoryLogs: async (variantId) => {
    const result = await pool.request()
      .input("variantId", sql.VarChar, variantId)
      .query(`
        SELECT il.id, il.change_qty, il.reason, il.reference_id, il.created_at, u.name AS created_by_name
        FROM InventoryLogs il
        LEFT JOIN Users u ON il.created_by = u.id
        WHERE il.variant_id = @variantId
        ORDER BY il.created_at DESC
      `);
    return result.recordset;
  },

  getLowStockCount: async () => {
    const result = await pool.request()
      .input("threshold", sql.Int, LOW_STOCK_THRESHOLD)
      .query("SELECT COUNT(*) AS cnt FROM ProductVariants WHERE is_active = 1 AND stock_qty <= @threshold");
    return result.recordset[0]?.cnt || 0;
  },

  // ============================================================
  //  A014: DASHBOARD TỔNG QUAN MỞ RỘNG
  // ============================================================

  getNewOrdersCount: async () => {
    const result = await pool.request().query(`
      SELECT COUNT(*) AS cnt FROM Orders WHERE CAST(created_at AS DATE) = CAST(GETDATE() AS DATE)
    `);
    return result.recordset[0]?.cnt || 0;
  },

  // ============================================================
  //  A002: BÁO CÁO MỞ RỘNG (top sản phẩm bán chạy, tỷ lệ hủy theo seller)
  // ============================================================

  getTopSellingProducts: async ({ from, to, limit = 10 } = {}) => {
    const request = pool.request();
    request.input("limit", sql.Int, Number(limit) || 10);
    let query = `
      SELECT TOP (@limit)
        p.id AS product_id, p.name AS product_name,
        SUM(oi.quantity) AS total_sold,
        SUM(oi.total_price) AS total_revenue
      FROM OrderItems oi
      JOIN Orders o ON oi.order_id = o.id
      JOIN ProductVariants pv ON oi.variant_id = pv.id
      JOIN Products p ON pv.product_id = p.id
      WHERE o.status != 'cancelled'
    `;
    if (from) {
      request.input("from", sql.DateTime2, from);
      query += " AND o.created_at >= @from";
    }
    if (to) {
      request.input("to", sql.DateTime2, to);
      query += " AND o.created_at <= @to";
    }
    query += " GROUP BY p.id, p.name ORDER BY total_sold DESC";
    const result = await request.query(query);
    return result.recordset;
  },

  // Tỷ lệ hủy đơn tính theo từng seller (đơn tính DISTINCT vì 1 đơn có thể có nhiều item cùng seller)
  getCancellationRateBySeller: async ({ from, to } = {}) => {
    const request = pool.request();
    let query = `
      SELECT
        s.id AS seller_id, s.shop_name,
        COUNT(DISTINCT o.id) AS total_orders,
        COUNT(DISTINCT CASE WHEN o.status = 'cancelled' THEN o.id END) AS cancelled_orders
      FROM Sellers s
      JOIN Products p ON p.seller_id = s.id
      JOIN ProductVariants pv ON pv.product_id = p.id
      JOIN OrderItems oi ON oi.variant_id = pv.id
      JOIN Orders o ON oi.order_id = o.id
      WHERE 1 = 1
    `;
    if (from) {
      request.input("from", sql.DateTime2, from);
      query += " AND o.created_at >= @from";
    }
    if (to) {
      request.input("to", sql.DateTime2, to);
      query += " AND o.created_at <= @to";
    }
    query += " GROUP BY s.id, s.shop_name ORDER BY s.shop_name ASC";
    const result = await request.query(query);
    return result.recordset.map(r => ({
      ...r,
      cancellation_rate: r.total_orders > 0 ? Number(((r.cancelled_orders / r.total_orders) * 100).toFixed(1)) : 0
    }));
  },

  // ============================================================
  //  A003: THEO DÕI GIAO DỊCH THANH TOÁN
  // ============================================================

  // Badge cảnh báo mức MVP: "treo lâu" (pending > 24h) và "giá trị bất thường" (> 3 lần trung bình 30 ngày)
  listPayments: async ({ method, status, from, to } = {}) => {
    const request = pool.request();
    let query = `
      SELECT p.id, p.order_id, p.method, p.status, p.amount, p.transaction_ref, p.paid_at, p.created_at,
             u.name AS user_name, u.email AS user_email
      FROM Payments p
      JOIN Orders o ON p.order_id = o.id
      JOIN Users u ON o.user_id = u.id
      WHERE 1 = 1
    `;
    if (method) {
      request.input("method", sql.VarChar, method);
      query += " AND p.method = @method";
    }
    if (status) {
      request.input("status", sql.VarChar, status);
      query += " AND p.status = @status";
    }
    if (from) {
      request.input("from", sql.DateTime2, from);
      query += " AND p.created_at >= @from";
    }
    if (to) {
      request.input("to", sql.DateTime2, to);
      query += " AND p.created_at <= @to";
    }
    query += " ORDER BY p.created_at DESC";
    const result = await request.query(query);

    const avgRes = await pool.request().query(`
      SELECT AVG(CAST(amount AS FLOAT)) AS avgAmount
      FROM Payments WHERE created_at >= DATEADD(DAY, -30, GETDATE())
    `);
    const avgAmount = avgRes.recordset[0]?.avgAmount || 0;
    const now = Date.now();

    return result.recordset.map(p => ({
      ...p,
      is_stale_pending: p.status === "pending" && now - new Date(p.created_at).getTime() > 24 * 60 * 60 * 1000,
      is_amount_outlier: avgAmount > 0 && Number(p.amount) > avgAmount * 3
    }));
  },

  // Admin tự xác nhận đã nhận tiền (đối soát thủ công — hiện chưa có gateway nào tự động confirm)
  confirmPaymentPaid: async (paymentId) => {
    const result = await pool.request()
      .input("paymentId", sql.VarChar, paymentId)
      .query("SELECT * FROM Payments WHERE id = @paymentId");
    const payment = result.recordset[0];
    if (!payment) {
      throw new Error("Không tìm thấy giao dịch này.");
    }
    if (payment.status !== "pending") {
      throw new Error("Chỉ có thể xác nhận giao dịch đang ở trạng thái chờ.");
    }

    await pool.request()
      .input("paymentId", sql.VarChar, paymentId)
      .query("UPDATE Payments SET status = 'paid', paid_at = GETDATE() WHERE id = @paymentId");

    return { paymentId, status: "paid" };
  },

  // ============================================================
  //  A009: CHI TIẾT TÀI KHOẢN KHÁCH HÀNG
  // ============================================================

  getUserDetail: async (userId) => {
    const userRes = await pool.request()
      .input("userId", sql.VarChar, userId)
      .query(`
        SELECT id, name, email, phone_number, avatar_url, role, is_active, suspend_reason, created_at
        FROM Users WHERE id = @userId
      `);
    const user = userRes.recordset[0];
    if (!user) {
      throw new Error("Không tìm thấy người dùng này.");
    }

    const addressesRes = await pool.request()
      .input("userId", sql.VarChar, userId)
      .query("SELECT * FROM UserAddresses WHERE user_id = @userId ORDER BY is_default DESC");

    const ordersRes = await pool.request()
      .input("userId", sql.VarChar, userId)
      .query(`
        SELECT id, status, total, created_at
        FROM Orders WHERE user_id = @userId
        ORDER BY created_at DESC
      `);

    const summaryRes = await pool.request()
      .input("userId", sql.VarChar, userId)
      .query(`
        SELECT
          ISNULL(SUM(CASE WHEN status != 'cancelled' THEN total ELSE 0 END), 0) AS total_spent,
          COUNT(*) AS total_orders
        FROM Orders WHERE user_id = @userId
      `);

    const boomCount = await adminService.getBoomOrderCount(userId);

    return {
      ...user,
      addresses: addressesRes.recordset,
      orders: ordersRes.recordset,
      total_spent: summaryRes.recordset[0]?.total_spent || 0,
      total_orders: summaryRes.recordset[0]?.total_orders || 0,
      boom_count: boomCount
    };
  },

  // ============================================================
  //  A004: BANNER KHUYẾN MÃI + COUPON (đơn giảm giá)
  // ============================================================

  listBanners: async ({ activeOnly } = {}) => {
    const request = pool.request();
    let query = "SELECT * FROM Banners WHERE 1 = 1";
    if (activeOnly) {
      query += ` AND is_active = 1
        AND (starts_at IS NULL OR starts_at <= GETDATE())
        AND (ends_at IS NULL OR ends_at >= GETDATE())`;
    }
    query += " ORDER BY sort_order ASC, created_at DESC";
    const result = await request.query(query);
    return result.recordset;
  },

  getBannerById: async (bannerId) => {
    const result = await pool.request()
      .input("bannerId", sql.VarChar, bannerId)
      .query("SELECT * FROM Banners WHERE id = @bannerId");
    return result.recordset[0] || null;
  },

  createBanner: async ({ title, image_url, link_url, position, sort_order, starts_at, ends_at }) => {
    if (!title || !image_url) {
      throw new Error("Vui lòng nhập tiêu đề và ảnh banner.");
    }
    const id = `banner_${uuidv4()}`;
    await pool.request()
      .input("id", sql.VarChar, id)
      .input("title", sql.NVarChar, title)
      .input("imageUrl", sql.VarChar, image_url)
      .input("linkUrl", sql.VarChar, link_url || null)
      .input("position", sql.VarChar, position || "home_hero")
      .input("sortOrder", sql.Int, sort_order || 0)
      .input("startsAt", sql.DateTime2, starts_at || null)
      .input("endsAt", sql.DateTime2, ends_at || null)
      .query(`
        INSERT INTO Banners (id, title, image_url, link_url, position, sort_order, is_active, starts_at, ends_at)
        VALUES (@id, @title, @imageUrl, @linkUrl, @position, @sortOrder, 1, @startsAt, @endsAt)
      `);
    return adminService.getBannerById(id);
  },

  updateBanner: async (bannerId, { title, image_url, link_url, position, sort_order, is_active, starts_at, ends_at }) => {
    const existing = await adminService.getBannerById(bannerId);
    if (!existing) {
      throw new Error("Không tìm thấy banner này.");
    }
    await pool.request()
      .input("bannerId", sql.VarChar, bannerId)
      .input("title", sql.NVarChar, title ?? existing.title)
      .input("imageUrl", sql.VarChar, image_url ?? existing.image_url)
      .input("linkUrl", sql.VarChar, link_url !== undefined ? link_url : existing.link_url)
      .input("position", sql.VarChar, position ?? existing.position)
      .input("sortOrder", sql.Int, sort_order !== undefined ? sort_order : existing.sort_order)
      .input("isActive", sql.Bit, is_active !== undefined ? is_active : existing.is_active)
      .input("startsAt", sql.DateTime2, starts_at !== undefined ? starts_at : existing.starts_at)
      .input("endsAt", sql.DateTime2, ends_at !== undefined ? ends_at : existing.ends_at)
      .query(`
        UPDATE Banners
        SET title = @title, image_url = @imageUrl, link_url = @linkUrl, position = @position,
            sort_order = @sortOrder, is_active = @isActive, starts_at = @startsAt, ends_at = @endsAt,
            updated_at = GETDATE()
        WHERE id = @bannerId
      `);
    return adminService.getBannerById(bannerId);
  },

  deleteBanner: async (bannerId) => {
    const existing = await adminService.getBannerById(bannerId);
    if (!existing) {
      throw new Error("Không tìm thấy banner này.");
    }
    await pool.request()
      .input("bannerId", sql.VarChar, bannerId)
      .query("UPDATE Banners SET is_active = 0 WHERE id = @bannerId");
    return { bannerId, is_active: false };
  },

  // Coupons: bảng đã có sẵn (dùng chung với checkout), chỉ thêm CRUD phía Admin
  listCoupons: async () => {
    const result = await pool.request().query(`
      SELECT id, seller_id, code, description, discount_type, discount_value, min_order_amount,
             max_discount_amt, usage_limit, used_count, user_limit, starts_at, expires_at, is_active, created_at
      FROM Coupons
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
    `);
    return result.recordset;
  },

  getCouponById: async (couponId) => {
    const result = await pool.request()
      .input("couponId", sql.VarChar, couponId)
      .query("SELECT * FROM Coupons WHERE id = @couponId AND deleted_at IS NULL");
    return result.recordset[0] || null;
  },

  createCoupon: async ({ code, description, discount_type, discount_value, min_order_amount, max_discount_amt, usage_limit, user_limit, starts_at, expires_at }) => {
    if (!code || !discount_value) {
      throw new Error("Vui lòng nhập mã và giá trị giảm giá.");
    }
    const id = `coupon_${uuidv4()}`;
    await pool.request()
      .input("id", sql.VarChar, id)
      .input("code", sql.VarChar, code.toUpperCase().trim())
      .input("description", sql.NVarChar, description || null)
      .input("discountType", sql.VarChar, discount_type || "percentage")
      .input("discountValue", sql.BigInt, discount_value)
      .input("minOrderAmount", sql.BigInt, min_order_amount || null)
      .input("maxDiscountAmt", sql.BigInt, max_discount_amt || null)
      .input("usageLimit", sql.Int, usage_limit || null)
      .input("userLimit", sql.Int, user_limit ?? 1)
      .input("startsAt", sql.DateTime2, starts_at || null)
      .input("expiresAt", sql.DateTime2, expires_at || null)
      .query(`
        INSERT INTO Coupons (id, code, description, discount_type, discount_value, min_order_amount,
          max_discount_amt, usage_limit, used_count, user_limit, starts_at, expires_at, is_active)
        VALUES (@id, @code, @description, @discountType, @discountValue, @minOrderAmount,
          @maxDiscountAmt, @usageLimit, 0, @userLimit, @startsAt, @expiresAt, 1)
      `);
    return adminService.getCouponById(id);
  },

  updateCoupon: async (couponId, payload) => {
    const existing = await adminService.getCouponById(couponId);
    if (!existing) {
      throw new Error("Không tìm thấy voucher này.");
    }
    const {
      description, discount_type, discount_value, min_order_amount, max_discount_amt,
      usage_limit, user_limit, starts_at, expires_at, is_active
    } = payload;

    await pool.request()
      .input("couponId", sql.VarChar, couponId)
      .input("description", sql.NVarChar, description !== undefined ? description : existing.description)
      .input("discountType", sql.VarChar, discount_type ?? existing.discount_type)
      .input("discountValue", sql.BigInt, discount_value ?? existing.discount_value)
      .input("minOrderAmount", sql.BigInt, min_order_amount !== undefined ? min_order_amount : existing.min_order_amount)
      .input("maxDiscountAmt", sql.BigInt, max_discount_amt !== undefined ? max_discount_amt : existing.max_discount_amt)
      .input("usageLimit", sql.Int, usage_limit !== undefined ? usage_limit : existing.usage_limit)
      .input("userLimit", sql.Int, user_limit !== undefined ? user_limit : existing.user_limit)
      .input("startsAt", sql.DateTime2, starts_at !== undefined ? starts_at : existing.starts_at)
      .input("expiresAt", sql.DateTime2, expires_at !== undefined ? expires_at : existing.expires_at)
      .input("isActive", sql.Bit, is_active !== undefined ? is_active : existing.is_active)
      .query(`
        UPDATE Coupons
        SET description = @description, discount_type = @discountType, discount_value = @discountValue,
            min_order_amount = @minOrderAmount, max_discount_amt = @maxDiscountAmt, usage_limit = @usageLimit,
            user_limit = @userLimit, starts_at = @startsAt, expires_at = @expiresAt, is_active = @isActive
        WHERE id = @couponId
      `);
    return adminService.getCouponById(couponId);
  },

  deleteCoupon: async (couponId) => {
    const existing = await adminService.getCouponById(couponId);
    if (!existing) {
      throw new Error("Không tìm thấy voucher này.");
    }
    await pool.request()
      .input("couponId", sql.VarChar, couponId)
      .query("UPDATE Coupons SET deleted_at = GETDATE(), is_active = 0 WHERE id = @couponId");
    return { couponId, deleted: true };
  },

  // ============================================================
  //  A005: NỘI DUNG EMAIL / THÔNG BÁO TỰ ĐỘNG
  // ============================================================

  listNotificationTemplates: async () => {
    const result = await pool.request().query(`
      SELECT id, code, subject, html_body, is_active, created_at, updated_at
      FROM NotificationTemplates ORDER BY code ASC
    `);
    return result.recordset;
  },

  getNotificationTemplateByCode: async (code) => {
    const result = await pool.request()
      .input("code", sql.VarChar, code)
      .query("SELECT * FROM NotificationTemplates WHERE code = @code");
    return result.recordset[0] || null;
  },

  getNotificationTemplateById: async (id) => {
    const result = await pool.request()
      .input("id", sql.VarChar, id)
      .query("SELECT * FROM NotificationTemplates WHERE id = @id");
    return result.recordset[0] || null;
  },

  upsertNotificationTemplate: async ({ code, subject, html_body, is_active }) => {
    if (!code || !subject || !html_body) {
      throw new Error("Vui lòng nhập đầy đủ mã mẫu, tiêu đề và nội dung.");
    }
    const existing = await adminService.getNotificationTemplateByCode(code);
    if (existing) {
      await pool.request()
        .input("id", sql.VarChar, existing.id)
        .input("subject", sql.NVarChar, subject)
        .input("htmlBody", sql.NVarChar, html_body)
        .input("isActive", sql.Bit, is_active !== undefined ? is_active : existing.is_active)
        .query(`
          UPDATE NotificationTemplates
          SET subject = @subject, html_body = @htmlBody, is_active = @isActive, updated_at = GETDATE()
          WHERE id = @id
        `);
      return adminService.getNotificationTemplateById(existing.id);
    }

    const id = `tmpl_${uuidv4()}`;
    await pool.request()
      .input("id", sql.VarChar, id)
      .input("code", sql.VarChar, code)
      .input("subject", sql.NVarChar, subject)
      .input("htmlBody", sql.NVarChar, html_body)
      .query(`
        INSERT INTO NotificationTemplates (id, code, subject, html_body, is_active)
        VALUES (@id, @code, @subject, @htmlBody, 1)
      `);
    return adminService.getNotificationTemplateById(id);
  },

  // ============================================================
  //  A006: NHẬT KÝ HOẠT ĐỘNG (Audit Log) — chỉ log hành động nhạy cảm
  // ============================================================

  // Best-effort: lỗi ghi log không được làm hỏng thao tác chính đang thực hiện
  logAudit: async ({ adminId, action, entityType, entityId, before, after }) => {
    try {
      const id = `audit_${uuidv4()}`;
      await pool.request()
        .input("id", sql.VarChar, id)
        .input("adminId", sql.VarChar, adminId)
        .input("action", sql.VarChar, action)
        .input("entityType", sql.VarChar, entityType)
        .input("entityId", sql.VarChar, entityId || null)
        .input("beforeData", sql.NVarChar, before ? JSON.stringify(before) : null)
        .input("afterData", sql.NVarChar, after ? JSON.stringify(after) : null)
        .query(`
          INSERT INTO AuditLogs (id, admin_id, action, entity_type, entity_id, before_data, after_data)
          VALUES (@id, @adminId, @action, @entityType, @entityId, @beforeData, @afterData)
        `);
    } catch (err) {
      console.error("[⚠️ AUDIT LOG FAILED]", err.message);
    }
  },

  listAuditLogs: async ({ adminId, action, from, to } = {}) => {
    const request = pool.request();
    let query = `
      SELECT al.id, al.action, al.entity_type, al.entity_id, al.before_data, al.after_data, al.created_at,
             u.name AS admin_name, u.email AS admin_email
      FROM AuditLogs al
      JOIN Users u ON al.admin_id = u.id
      WHERE 1 = 1
    `;
    if (adminId) {
      request.input("adminId", sql.VarChar, adminId);
      query += " AND al.admin_id = @adminId";
    }
    if (action) {
      request.input("action", sql.VarChar, action);
      query += " AND al.action = @action";
    }
    if (from) {
      request.input("from", sql.DateTime2, from);
      query += " AND al.created_at >= @from";
    }
    if (to) {
      request.input("to", sql.DateTime2, to);
      query += " AND al.created_at <= @to";
    }
    query += " ORDER BY al.created_at DESC";
    const result = await request.query(query);
    return result.recordset;
  }
};
