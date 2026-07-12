import express from "express";
import { protect, restrictTo } from "../middlewares/auth.middleware.js";
import {
  registerSeller,
  getPublicShop,
  getSellerProfile,
  updateSellerProfile,
  getSellerDashboardStats,
  getSellerProducts,
  createSellerProduct,
  updateSellerProduct,
  deleteSellerProduct,
  getSellerOrders,
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

const router = express.Router();

router.post("/register", protect, registerSeller);
router.get("/shops/:id", getPublicShop);

router.use(protect);
router.use(restrictTo("seller"));

router.route("/profile")
  .get(getSellerProfile)
  .put(updateSellerProfile);

router.get("/dashboard-stats", getSellerDashboardStats);
router.get("/categories", getSellerCategories);

router.route("/products")
  .get(getSellerProducts)
  .post(createSellerProduct);

router.route("/products/:id")
  .put(updateSellerProduct)
  .delete(deleteSellerProduct);

router.get("/orders", getSellerOrders);
router.patch("/orders/items/:itemId", updateSellerOrderItem);

router.route("/coupons")
  .get(getSellerCoupons)
  .post(createSellerCoupon);

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
