import { adminService } from "../services/adminService.js";
import { otpService } from "../services/otpService.js";

const VALID_STATUSES = ["pending", "active", "rejected", "suspended"];

// Danh sách đơn/shop, lọc theo ?status=pending|active|rejected|suspended
export const getSellers = async (req, res, next) => {
  try {
    const { status } = req.query;
    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        status: "fail",
        message: `status không hợp lệ. Chỉ chấp nhận: ${VALID_STATUSES.join(", ")}`
      });
    }

    const sellers = await adminService.listSellers(status);
    res.status(200).json({
      status: "success",
      results: sellers.length,
      data: { sellers }
    });
  } catch (err) {
    next(err);
  }
};

// Duyệt đơn đăng ký shop
export const approveSeller = async (req, res, next) => {
  try {
    const result = await adminService.approveSeller(req.params.id);
    await adminService.logAudit({
      adminId: req.user.id, action: "approve_seller", entityType: "seller", entityId: req.params.id, after: result
    });
    res.status(200).json({
      status: "success",
      message: "Đã duyệt shop này.",
      data: result
    });
  } catch (err) {
    res.status(400).json({ status: "fail", message: err.message });
  }
};

// Từ chối đơn đăng ký shop
export const rejectSeller = async (req, res, next) => {
  try {
    const result = await adminService.rejectSeller(req.params.id);
    await adminService.logAudit({
      adminId: req.user.id, action: "reject_seller", entityType: "seller", entityId: req.params.id, after: result
    });
    res.status(200).json({
      status: "success",
      message: "Đã từ chối đơn đăng ký shop này.",
      data: result
    });
  } catch (err) {
    res.status(400).json({ status: "fail", message: err.message });
  }
};

// Khoá shop đang hoạt động (vi phạm chính sách)
export const suspendSeller = async (req, res, next) => {
  try {
    const result = await adminService.suspendSeller(req.params.id);
    await adminService.logAudit({
      adminId: req.user.id, action: "suspend_seller", entityType: "seller", entityId: req.params.id, after: result
    });
    res.status(200).json({
      status: "success",
      message: "Đã khoá shop này.",
      data: result
    });
  } catch (err) {
    res.status(400).json({ status: "fail", message: err.message });
  }
};

// Danh sách user, lọc theo ?role= / ?isActive=true|false / ?q= (A012) — kèm số lần "boom hàng" 30 ngày gần nhất (A010)
export const getUsers = async (req, res, next) => {
  try {
    const { role, isActive, q } = req.query;
    const users = await adminService.listUsersWithBoomCount({
      role,
      isActive: isActive === undefined ? undefined : isActive === "true",
      q
    });
    res.status(200).json({
      status: "success",
      results: users.length,
      data: { users }
    });
  } catch (err) {
    next(err);
  }
};

// Khoá / mở khoá tài khoản user. Bắt buộc nhập lý do (reason) khi khoá — A010
export const setUserStatus = async (req, res, next) => {
  try {
    const { isActive, reason } = req.body;
    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        status: "fail",
        message: "isActive phải là boolean (true/false)."
      });
    }
    if (isActive === false && !reason?.trim()) {
      return res.status(400).json({
        status: "fail",
        message: "Vui lòng nhập lý do khoá tài khoản."
      });
    }

    const result = await adminService.setUserActive(req.params.id, isActive, reason);
    await adminService.logAudit({
      adminId: req.user.id,
      action: isActive ? "unlock_user" : "lock_user",
      entityType: "user",
      entityId: req.params.id,
      after: result
    });
    res.status(200).json({
      status: "success",
      message: isActive ? "Đã mở khoá tài khoản." : "Đã khoá tài khoản.",
      data: result
    });
  } catch (err) {
    res.status(400).json({ status: "fail", message: err.message });
  }
};

// A013: Admin khởi tạo yêu cầu đặt lại mật khẩu cho khách hàng (gửi OTP/link qua email,
// tái dùng nguyên otpService — khách tự đặt mật khẩu mới qua trang ResetPassword hiện có)
export const resetUserPassword = async (req, res, next) => {
  try {
    const user = await adminService.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ status: "fail", message: "Không tìm thấy người dùng này." });
    }

    const result = await otpService.createOTP(user.email);
    await adminService.logAudit({
      adminId: req.user.id, action: "reset_user_password", entityType: "user", entityId: req.params.id
    });
    res.status(200).json({
      status: "success",
      message: `Đã gửi mã đặt lại mật khẩu tới email ${user.email}.`,
      data: { mock: result.mock }
    });
  } catch (err) {
    next(err);
  }
};

// Hạ trực tiếp 1 user đang là seller xuống lại customer
export const demoteSellerUser = async (req, res, next) => {
  try {
    const result = await adminService.demoteSellerToCustomer(req.params.id);
    res.status(200).json({
      status: "success",
      message: "Đã hạ tài khoản này xuống lại customer.",
      data: result
    });
  } catch (err) {
    res.status(400).json({ status: "fail", message: err.message });
  }
};

// Danh sách sản phẩm của 1 seller
export const getSellerProducts = async (req, res, next) => {
  try {
    const products = await adminService.getSellerProducts(req.params.id);
    res.status(200).json({
      status: "success",
      results: products.length,
      data: { products }
    });
  } catch (err) {
    next(err);
  }
};

// Chi tiết 1 sản phẩm (ảnh + biến thể)
export const getProductDetail = async (req, res, next) => {
  try {
    const product = await adminService.getProductDetail(req.params.id);
    res.status(200).json({
      status: "success",
      data: { product }
    });
  } catch (err) {
    res.status(404).json({ status: "fail", message: err.message });
  }
};

// Report doanh thu/đơn hàng theo từng seller
export const getSellerReport = async (req, res, next) => {
  try {
    const sellers = await adminService.reportSellers();
    res.status(200).json({
      status: "success",
      results: sellers.length,
      data: { sellers }
    });
  } catch (err) {
    next(err);
  }
};

// Report tổng chi tiêu/số đơn theo từng user
export const getUserReport = async (req, res, next) => {
  try {
    const users = await adminService.reportUsers();
    res.status(200).json({
      status: "success",
      results: users.length,
      data: { users }
    });
  } catch (err) {
    next(err);
  }
};

const parseStatsQuery = (query) => {
  const groupBy = query.groupBy === "month" ? "month" : "day";
  return { from: query.from, to: query.to, groupBy };
};

// Doanh số bán hàng theo thời gian — cho line chart
export const getRevenueStats = async (req, res, next) => {
  try {
    const series = await adminService.revenueStats(parseStatsQuery(req.query));
    res.status(200).json({
      status: "success",
      data: { series }
    });
  } catch (err) {
    next(err);
  }
};

// Dòng tiền vào/ra theo thời gian
export const getCashflowStats = async (req, res, next) => {
  try {
    const series = await adminService.cashflowStats(parseStatsQuery(req.query));
    res.status(200).json({
      status: "success",
      data: { series }
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================
//  A007: DANH MỤC SẢN PHẨM (Categories CRUD)
// ============================================================

export const getCategories = async (req, res, next) => {
  try {
    const categories = await adminService.listCategories();
    res.status(200).json({
      status: "success",
      results: categories.length,
      data: { categories }
    });
  } catch (err) {
    next(err);
  }
};

export const createCategory = async (req, res, next) => {
  try {
    const category = await adminService.createCategory(req.body);
    await adminService.logAudit({
      adminId: req.user.id, action: "create_category", entityType: "category", entityId: category.id, after: category
    });
    res.status(201).json({
      status: "success",
      message: "Đã tạo danh mục mới.",
      data: { category }
    });
  } catch (err) {
    res.status(400).json({ status: "fail", message: err.message });
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    const before = await adminService.getCategoryById(req.params.id);
    const category = await adminService.updateCategory(req.params.id, req.body);
    await adminService.logAudit({
      adminId: req.user.id, action: "update_category", entityType: "category", entityId: req.params.id, before, after: category
    });
    res.status(200).json({
      status: "success",
      message: "Đã cập nhật danh mục.",
      data: { category }
    });
  } catch (err) {
    res.status(400).json({ status: "fail", message: err.message });
  }
};

// Soft-delete: chỉ tắt is_active, không xoá vật lý (giữ liên kết sản phẩm cũ)
export const deleteCategory = async (req, res, next) => {
  try {
    const result = await adminService.deleteCategory(req.params.id);
    await adminService.logAudit({
      adminId: req.user.id, action: "delete_category", entityType: "category", entityId: req.params.id, after: result
    });
    res.status(200).json({
      status: "success",
      message: "Đã xoá (ẩn) danh mục này.",
      data: result
    });
  } catch (err) {
    res.status(400).json({ status: "fail", message: err.message });
  }
};

// ============================================================
//  A008: NHÀ CUNG CẤP / THƯƠNG HIỆU (Brands CRUD)
// ============================================================

export const getBrands = async (req, res, next) => {
  try {
    const { status } = req.query;
    const brands = await adminService.listBrands(status);
    res.status(200).json({
      status: "success",
      results: brands.length,
      data: { brands }
    });
  } catch (err) {
    next(err);
  }
};

export const createBrand = async (req, res, next) => {
  try {
    const brand = await adminService.createBrand(req.body);
    await adminService.logAudit({
      adminId: req.user.id, action: "create_brand", entityType: "brand", entityId: brand.id, after: brand
    });
    res.status(201).json({
      status: "success",
      message: "Đã thêm thương hiệu mới.",
      data: { brand }
    });
  } catch (err) {
    res.status(400).json({ status: "fail", message: err.message });
  }
};

export const updateBrand = async (req, res, next) => {
  try {
    const brand = await adminService.updateBrand(req.params.id, req.body);
    await adminService.logAudit({
      adminId: req.user.id, action: "update_brand", entityType: "brand", entityId: req.params.id, after: brand
    });
    res.status(200).json({
      status: "success",
      message: "Đã cập nhật thương hiệu.",
      data: { brand }
    });
  } catch (err) {
    res.status(400).json({ status: "fail", message: err.message });
  }
};

export const setBrandStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({
        status: "fail",
        message: "status chỉ chấp nhận 'active' hoặc 'inactive'."
      });
    }
    const result = await adminService.setBrandStatus(req.params.id, status);
    await adminService.logAudit({
      adminId: req.user.id, action: "set_brand_status", entityType: "brand", entityId: req.params.id, after: result
    });
    res.status(200).json({
      status: "success",
      message: status === "active" ? "Đã bật thương hiệu." : "Đã ẩn thương hiệu.",
      data: result
    });
  } catch (err) {
    res.status(400).json({ status: "fail", message: err.message });
  }
};

// ============================================================
//  Admin Orders module (nền tảng cho A002 / A003 / A012)
// ============================================================

// Danh sách đơn hàng toàn hệ thống, lọc theo status/khoảng ngày/từ khoá tìm kiếm
export const getOrders = async (req, res, next) => {
  try {
    const { status, from, to, q } = req.query;
    const orders = await adminService.listOrders({ status, from, to, q });
    res.status(200).json({
      status: "success",
      results: orders.length,
      data: { orders }
    });
  } catch (err) {
    next(err);
  }
};

// Chi tiết 1 đơn hàng: sản phẩm + thanh toán
export const getOrderDetail = async (req, res, next) => {
  try {
    const order = await adminService.getOrderDetail(req.params.id);
    res.status(200).json({
      status: "success",
      data: { order }
    });
  } catch (err) {
    res.status(404).json({ status: "fail", message: err.message });
  }
};

// ============================================================
//  A011: QUẢN LÝ KHO HÀNG & TỒN KHO
// ============================================================

export const getInventory = async (req, res, next) => {
  try {
    const { lowStockOnly } = req.query;
    const inventory = await adminService.listInventory({ lowStockOnly: lowStockOnly === "true" });
    res.status(200).json({
      status: "success",
      results: inventory.length,
      data: { inventory }
    });
  } catch (err) {
    next(err);
  }
};

export const adjustInventory = async (req, res, next) => {
  try {
    const { changeQty, reason } = req.body;
    const result = await adminService.adjustInventory(req.params.variantId, {
      changeQty, reason, adminId: req.user.id
    });
    await adminService.logAudit({
      adminId: req.user.id, action: "adjust_inventory", entityType: "product_variant", entityId: req.params.variantId, after: result
    });
    res.status(200).json({
      status: "success",
      message: "Đã điều chỉnh tồn kho.",
      data: result
    });
  } catch (err) {
    res.status(400).json({ status: "fail", message: err.message });
  }
};

export const getInventoryLogs = async (req, res, next) => {
  try {
    const logs = await adminService.getInventoryLogs(req.params.variantId);
    res.status(200).json({
      status: "success",
      results: logs.length,
      data: { logs }
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================
//  A014: DASHBOARD TỔNG QUAN MỞ RỘNG
// ============================================================

export const getDashboardSummary = async (req, res, next) => {
  try {
    const [newOrdersToday, lowStockCount, lowStockProducts] = await Promise.all([
      adminService.getNewOrdersCount(),
      adminService.getLowStockCount(),
      adminService.listInventory({ lowStockOnly: true })
    ]);
    res.status(200).json({
      status: "success",
      data: {
        newOrdersToday,
        lowStockCount,
        lowStockProducts: lowStockProducts.slice(0, 10)
      }
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================
//  A002: BÁO CÁO MỞ RỘNG
// ============================================================

export const getTopProducts = async (req, res, next) => {
  try {
    const { from, to, limit } = req.query;
    const products = await adminService.getTopSellingProducts({ from, to, limit });
    res.status(200).json({
      status: "success",
      results: products.length,
      data: { products }
    });
  } catch (err) {
    next(err);
  }
};

export const getCancellationRates = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const sellers = await adminService.getCancellationRateBySeller({ from, to });
    res.status(200).json({
      status: "success",
      results: sellers.length,
      data: { sellers }
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================
//  A003: THEO DÕI GIAO DỊCH THANH TOÁN
// ============================================================

export const getPayments = async (req, res, next) => {
  try {
    const { method, status, from, to } = req.query;
    const payments = await adminService.listPayments({ method, status, from, to });
    res.status(200).json({
      status: "success",
      results: payments.length,
      data: { payments }
    });
  } catch (err) {
    next(err);
  }
};

// Admin tự xác nhận đã nhận tiền (đối soát thủ công)
export const confirmPayment = async (req, res, next) => {
  try {
    const result = await adminService.confirmPaymentPaid(req.params.id);
    await adminService.logAudit({
      adminId: req.user.id, action: "confirm_payment", entityType: "payment", entityId: req.params.id, after: result
    });
    res.status(200).json({
      status: "success",
      message: "Đã xác nhận thanh toán.",
      data: result
    });
  } catch (err) {
    res.status(400).json({ status: "fail", message: err.message });
  }
};

// ============================================================
//  A009: CHI TIẾT TÀI KHOẢN KHÁCH HÀNG
// ============================================================

export const getUserDetail = async (req, res, next) => {
  try {
    const user = await adminService.getUserDetail(req.params.id);
    res.status(200).json({
      status: "success",
      data: { user }
    });
  } catch (err) {
    res.status(404).json({ status: "fail", message: err.message });
  }
};

// ============================================================
//  A004: BANNER KHUYẾN MÃI
// ============================================================

export const getBanners = async (req, res, next) => {
  try {
    const banners = await adminService.listBanners({});
    res.status(200).json({
      status: "success",
      results: banners.length,
      data: { banners }
    });
  } catch (err) {
    next(err);
  }
};

export const createBanner = async (req, res, next) => {
  try {
    const banner = await adminService.createBanner(req.body);
    await adminService.logAudit({
      adminId: req.user.id, action: "create_banner", entityType: "banner", entityId: banner.id, after: banner
    });
    res.status(201).json({
      status: "success",
      message: "Đã tạo banner mới.",
      data: { banner }
    });
  } catch (err) {
    res.status(400).json({ status: "fail", message: err.message });
  }
};

export const updateBanner = async (req, res, next) => {
  try {
    const banner = await adminService.updateBanner(req.params.id, req.body);
    await adminService.logAudit({
      adminId: req.user.id, action: "update_banner", entityType: "banner", entityId: req.params.id, after: banner
    });
    res.status(200).json({
      status: "success",
      message: "Đã cập nhật banner.",
      data: { banner }
    });
  } catch (err) {
    res.status(400).json({ status: "fail", message: err.message });
  }
};

export const deleteBanner = async (req, res, next) => {
  try {
    const result = await adminService.deleteBanner(req.params.id);
    await adminService.logAudit({
      adminId: req.user.id, action: "delete_banner", entityType: "banner", entityId: req.params.id, after: result
    });
    res.status(200).json({
      status: "success",
      message: "Đã ẩn banner này.",
      data: result
    });
  } catch (err) {
    res.status(400).json({ status: "fail", message: err.message });
  }
};

// ============================================================
//  A004: VOUCHER / MÃ GIẢM GIÁ (Coupons CRUD)
// ============================================================

export const getCoupons = async (req, res, next) => {
  try {
    const coupons = await adminService.listCoupons();
    res.status(200).json({
      status: "success",
      results: coupons.length,
      data: { coupons }
    });
  } catch (err) {
    next(err);
  }
};

export const createCoupon = async (req, res, next) => {
  try {
    const coupon = await adminService.createCoupon(req.body);
    await adminService.logAudit({
      adminId: req.user.id, action: "create_coupon", entityType: "coupon", entityId: coupon.id, after: coupon
    });
    res.status(201).json({
      status: "success",
      message: "Đã tạo voucher mới.",
      data: { coupon }
    });
  } catch (err) {
    res.status(400).json({ status: "fail", message: err.message });
  }
};

export const updateCoupon = async (req, res, next) => {
  try {
    const coupon = await adminService.updateCoupon(req.params.id, req.body);
    await adminService.logAudit({
      adminId: req.user.id, action: "update_coupon", entityType: "coupon", entityId: req.params.id, after: coupon
    });
    res.status(200).json({
      status: "success",
      message: "Đã cập nhật voucher.",
      data: { coupon }
    });
  } catch (err) {
    res.status(400).json({ status: "fail", message: err.message });
  }
};

export const deleteCoupon = async (req, res, next) => {
  try {
    const result = await adminService.deleteCoupon(req.params.id);
    await adminService.logAudit({
      adminId: req.user.id, action: "delete_coupon", entityType: "coupon", entityId: req.params.id, after: result
    });
    res.status(200).json({
      status: "success",
      message: "Đã xoá voucher.",
      data: result
    });
  } catch (err) {
    res.status(400).json({ status: "fail", message: err.message });
  }
};

// ============================================================
//  A005: NỘI DUNG EMAIL / THÔNG BÁO TỰ ĐỘNG
// ============================================================

export const getNotificationTemplates = async (req, res, next) => {
  try {
    const templates = await adminService.listNotificationTemplates();
    res.status(200).json({
      status: "success",
      results: templates.length,
      data: { templates }
    });
  } catch (err) {
    next(err);
  }
};

// Upsert theo `code` — tạo mới nếu chưa có mẫu, cập nhật nếu đã có
export const saveNotificationTemplate = async (req, res, next) => {
  try {
    const template = await adminService.upsertNotificationTemplate(req.body);
    await adminService.logAudit({
      adminId: req.user.id, action: "save_notification_template", entityType: "notification_template", entityId: template.id, after: template
    });
    res.status(200).json({
      status: "success",
      message: "Đã lưu mẫu thông báo.",
      data: { template }
    });
  } catch (err) {
    res.status(400).json({ status: "fail", message: err.message });
  }
};

// ============================================================
//  A006: NHẬT KÝ HOẠT ĐỘNG (Audit Log)
// ============================================================

export const getAuditLogs = async (req, res, next) => {
  try {
    const { adminId, action, from, to } = req.query;
    const logs = await adminService.listAuditLogs({ adminId, action, from, to });
    res.status(200).json({
      status: "success",
      results: logs.length,
      data: { logs }
    });
  } catch (err) {
    next(err);
  }
};
