import express from "express";
import { protect, restrictTo } from "../middlewares/auth.middleware.js";
import {
  getSellers,
  approveSeller,
  rejectSeller,
  suspendSeller,
  getUsers,
  setUserStatus,
  demoteSellerUser,
  resetUserPassword,
  getSellerProducts,
  getProductDetail,
  getSellerReport,
  getUserReport,
  getRevenueStats,
  getCashflowStats,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getBrands,
  createBrand,
  updateBrand,
  setBrandStatus,
  getOrders,
  getOrderDetail,
  getInventory,
  adjustInventory,
  getInventoryLogs,
  getDashboardSummary,
  getTopProducts,
  getCancellationRates,
  getPayments,
  confirmPayment,
  getUserDetail,
  getBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getNotificationTemplates,
  saveNotificationTemplate,
  getAuditLogs
} from "../controllers/admin.controller.js";

const router = express.Router();

router.use(protect);
router.use(restrictTo("admin"));

router.get("/sellers", getSellers);
router.patch("/sellers/:id/approve", approveSeller);
router.patch("/sellers/:id/reject", rejectSeller);
router.patch("/sellers/:id/suspend", suspendSeller);

router.get("/users", getUsers);
router.patch("/users/:id/status", setUserStatus);
router.patch("/users/:id/demote-seller", demoteSellerUser);
router.post("/users/:id/reset-password", resetUserPassword);

router.get("/sellers/:id/products", getSellerProducts);
router.get("/products/:id", getProductDetail);

router.get("/reports/sellers", getSellerReport);
router.get("/reports/users", getUserReport);

router.get("/stats/revenue", getRevenueStats);
router.get("/stats/cashflow", getCashflowStats);

// A007: Danh mục sản phẩm
router.get("/categories", getCategories);
router.post("/categories", createCategory);
router.patch("/categories/:id", updateCategory);
router.delete("/categories/:id", deleteCategory);

// A008: Nhà cung cấp / thương hiệu
router.get("/brands", getBrands);
router.post("/brands", createBrand);
router.patch("/brands/:id", updateBrand);
router.patch("/brands/:id/status", setBrandStatus);

// Admin Orders module
router.get("/orders", getOrders);
router.get("/orders/:id", getOrderDetail);

// A011: Kho hàng & tồn kho
router.get("/inventory", getInventory);
router.post("/inventory/:variantId/adjust", adjustInventory);
router.get("/inventory/:variantId/logs", getInventoryLogs);

// A014: Dashboard tổng quan mở rộng
router.get("/dashboard/summary", getDashboardSummary);

// A002: Báo cáo mở rộng
router.get("/reports/top-products", getTopProducts);
router.get("/reports/cancellation-rate", getCancellationRates);

// A003: Giao dịch thanh toán
router.get("/payments", getPayments);
router.patch("/payments/:id/confirm", confirmPayment);

// A009: Chi tiết tài khoản khách hàng
router.get("/users/:id/detail", getUserDetail);

// A004: Banner khuyến mãi
router.get("/banners", getBanners);
router.post("/banners", createBanner);
router.patch("/banners/:id", updateBanner);
router.delete("/banners/:id", deleteBanner);

// A004: Voucher / mã giảm giá
router.get("/coupons", getCoupons);
router.post("/coupons", createCoupon);
router.patch("/coupons/:id", updateCoupon);
router.delete("/coupons/:id", deleteCoupon);

// A005: Nội dung email / thông báo tự động
router.get("/notification-templates", getNotificationTemplates);
router.put("/notification-templates", saveNotificationTemplate);

// A006: Nhật ký hoạt động (Audit Log)
router.get("/audit-logs", getAuditLogs);

export default router;
