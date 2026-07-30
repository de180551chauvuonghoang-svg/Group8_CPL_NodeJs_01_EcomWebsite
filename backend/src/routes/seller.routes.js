import express from "express";
import { protect, restrictTo } from "../middlewares/auth.middleware.js";
import { requireActiveSeller } from "../middlewares/seller.middleware.js";
import {
  registerSeller,
  getSellerApplication,
  getPublicShop,
  getSellerProfile,
  updateSellerProfile,
  getSellerDashboardStats,
  getSellerProducts,
  createSellerProduct,
  updateSellerProduct,
  deleteSellerProduct,
  getSellerOrders,
  getSellerOrderTimeline,
  updateSellerOrderItem,
  getSellerCategories,
  getSellerCoupons,
  createSellerCoupon,
  updateSellerCoupon,
  deleteSellerCoupon,
  getChatHistory,
  getRecentChats,
  markChatAsRead
} from "../controllers/seller.controller.js";
import {
  createFlashSale,
  getFlashSales,
  updateFlashSale,
  deleteFlashSale
} from "../controllers/flashSale.controller.js";
import {
  adjustInventory,
  getInventoryLogs,
  getLowStockInventory,
  updateVariantStockAlert
} from "../controllers/inventory.controller.js";
import { getSellerDashboardAnalytics } from "../controllers/sellerAnalytics.controller.js";
import { getSellerCouponStats } from "../controllers/couponStats.controller.js";
import { getSellerDashboardTasks } from "../controllers/sellerDashboardTask.controller.js";
import { showSellerFollowerStats } from "../controllers/shopFollow.controller.js";
import {
  changeSellerReturnStatus,
  listSellerReturns,
  showSellerReturn
} from "../controllers/return.controller.js";
import {
  listSellerFinanceTransactions,
  showSellerFinanceSummary
} from "../controllers/sellerFinance.controller.js";

const router = express.Router();

/**
 * @openapi
 * /api/seller/register:
 *   post:
 *     summary: Gửi yêu cầu mở cửa hàng để Admin duyệt
 *     description: Không đổi role và không cấp seller JWT. Đơn rejected được phép gửi lại.
 *     tags: [Seller Application]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [shopName, shopPhone, shopAddress]
 *             properties:
 *               shopName: { type: string, example: Volitify Store }
 *               shopPhone: { type: string, pattern: '^0\\d{9}$', example: '0987654321' }
 *               shopAddress: { type: string, example: 123 Nguyen Van Linh, Da Nang }
 *               pickupAddress: { type: string, nullable: true }
 *               description: { type: string, nullable: true }
 *               identityName: { type: string, nullable: true }
 *               identityNumber: { type: string, pattern: '^\\d{12}$', nullable: true }
 *               bankName: { type: string, nullable: true }
 *               bankAccountNo: { type: string, pattern: '^\\d{6,20}$', nullable: true }
 *               bankAccountHolder: { type: string, nullable: true }
 *     responses:
 *       200:
 *         description: Đơn được lưu ở trạng thái pending; response không có accessToken
 *       400: { description: Dữ liệu đăng ký không hợp lệ }
 *       403: { description: SELLER_SUSPENDED }
 *       409: { description: SELLER_APPLICATION_PENDING, SELLER_ALREADY_ACTIVE hoặc SHOP_NAME_TAKEN }
 *
 * /api/seller/application:
 *   get:
 *     summary: Lấy trạng thái đơn mở cửa hàng của tài khoản hiện tại
 *     description: data.application là null nếu chưa đăng ký; không trả CCCD hoặc thông tin ngân hàng.
 *     tags: [Seller Application]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Trạng thái pending, active, rejected, suspended hoặc null
 */
router.post("/register", protect, registerSeller);
router.get("/application", protect, getSellerApplication);
router.get("/shops/:id", getPublicShop);

router.use(protect);
// Status is checked first so pending/rejected/suspended applications receive a stable error code.
router.use(requireActiveSeller);
router.use(restrictTo("seller"));

router.route("/profile")
  .get(getSellerProfile)
  .put(updateSellerProfile);

router.get("/dashboard-stats", getSellerDashboardStats);
router.get("/dashboard-tasks", getSellerDashboardTasks);
router.get("/followers/stats", showSellerFollowerStats);
router.get("/finance/summary", showSellerFinanceSummary);
router.get("/finance/transactions", listSellerFinanceTransactions);

/**
 * @openapi
 * /api/seller/dashboard-analytics:
 *   get:
 *     summary: Lấy dữ liệu biểu đồ seller theo ngày, tháng hoặc năm
 *     tags: [Seller Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, month, year]
 *           default: day
 *       - in: query
 *         name: from
 *         description: Phải gửi cùng to nếu dùng khoảng tùy chỉnh
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         description: Phải gửi cùng from nếu dùng khoảng tùy chỉnh
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Summary và series đã lấp đủ bucket thời gian
 *       400:
 *         description: Period hoặc khoảng ngày không hợp lệ
 *       403:
 *         description: Tài khoản không có quyền seller
 */
router.get("/dashboard-analytics", getSellerDashboardAnalytics);
router.get("/categories", getSellerCategories);

/**
 * @openapi
 * /api/seller/inventory/low-stock:
 *   get:
 *     summary: Lấy các variant đã chạm ngưỡng sắp hết hàng
 *     tags: [Seller Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200: { description: Danh sách low-stock/out-of-stock thuộc shop }
 */
router.get("/inventory/low-stock", getLowStockInventory);

/**
 * @openapi
 * /api/seller/inventory/logs:
 *   get:
 *     summary: Lấy lịch sử thay đổi tồn kho của shop
 *     tags: [Seller Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: variantId
 *         schema: { type: string }
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [sale, order_cancelled, restock, manual_adjustment, return_refund]
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200: { description: Lịch sử tồn kho đã lọc và phân trang }
 */
router.get("/inventory/logs", getInventoryLogs);

/**
 * @openapi
 * /api/seller/inventory/adjust:
 *   post:
 *     summary: Seller nhập kho hoặc điều chỉnh tồn kho thủ công
 *     tags: [Seller Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [variantId, changeQuantity, reason]
 *             properties:
 *               variantId: { type: string }
 *               changeQuantity: { type: integer, description: Số dương để tăng, số âm để giảm }
 *               type:
 *                 type: string
 *                 enum: [restock, manual_adjustment]
 *                 default: manual_adjustment
 *               reason: { type: string, minLength: 3, maxLength: 255 }
 *     responses:
 *       200: { description: Tồn kho và log được cập nhật trong cùng transaction }
 *       404: { description: Variant không thuộc shop }
 *       409: { description: Điều chỉnh làm tồn kho nhỏ hơn 0 }
 */
router.post("/inventory/adjust", adjustInventory);

/**
 * @openapi
 * /api/seller/products/{productId}/variants/{variantId}/stock-alert:
 *   patch:
 *     summary: Cập nhật ngưỡng cảnh báo tồn kho của variant
 *     tags: [Seller Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: variantId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [lowStockThreshold]
 *             properties:
 *               lowStockThreshold: { type: integer, minimum: 0, maximum: 1000000 }
 *     responses:
 *       200: { description: Cập nhật ngưỡng thành công }
 *       404: { description: Product/variant không thuộc shop }
 */
router.patch(
  "/products/:productId/variants/:variantId/stock-alert",
  updateVariantStockAlert
);

router.route("/products")
  .get(getSellerProducts)
  .post(createSellerProduct);

router.route("/products/:id")
  .put(updateSellerProduct)
  .delete(deleteSellerProduct);

router.get("/orders", getSellerOrders);
router.get("/orders/:orderId/timeline", getSellerOrderTimeline);
router.patch("/orders/items/:itemId", updateSellerOrderItem);

router.get("/returns", listSellerReturns);
router.get("/returns/:returnId", showSellerReturn);
router.patch("/returns/:returnId", changeSellerReturnStatus);

router.route("/coupons")
  .get(getSellerCoupons)
  .post(createSellerCoupon);

/**
 * @openapi
 * /api/seller/coupons/stats:
 *   get:
 *     summary: Get seller voucher usage and attributed order metrics
 *     tags: [Seller Coupons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         description: Usage date start; must be sent together with to
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         description: Usage date end; must be sent together with from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, active, scheduled, expired, disabled, exhausted]
 *           default: all
 *       - in: query
 *         name: couponId
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         schema: { type: string, maxLength: 100 }
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [created_at, code, redemptions, attributed_order_value, discount_amount, usage_rate]
 *           default: redemptions
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc], default: desc }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200:
 *         description: Voucher summary, per-voucher metrics, and pagination
 *       400:
 *         description: Invalid filter, date range, or pagination
 *       403:
 *         description: Seller role is required
 */
router.get("/coupons/stats", getSellerCouponStats);

router.route("/coupons/:id")
  .patch(updateSellerCoupon)
  .delete(deleteSellerCoupon);

router.route("/flash-sales")
  .get(getFlashSales)
  .post(createFlashSale);

router.route("/flash-sales/:id")
  .patch(updateFlashSale)
  .delete(deleteFlashSale);

router.get("/chat/recent", getRecentChats);
router.get("/chat/history/:partnerId", getChatHistory);
router.post("/chat/read/:senderId", markChatAsRead);

export default router;
