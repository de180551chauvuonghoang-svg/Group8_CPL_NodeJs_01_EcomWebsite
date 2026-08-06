import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import {
  createCODOrder,
  validateCoupon,
  getOrderStatus,
  getUserOrders,
  cancelOrderAndRestoreStock,
} from '../controllers/payment.controller.js';

const router = Router();



// ─── COD ──────────────────────────────────────────────────────────────────────
router.post('/cod/create', protect, createCODOrder);
router.post('/coupons/validate', protect, validateCoupon);

// ─── Orders ───────────────────────────────────────────────────────────────────
// Lấy trạng thái 1 đơn hàng (dùng ở PaymentReturn page sau redirect)
router.get('/order/:orderId', protect, getOrderStatus);
router.post('/order/:orderId/cancel', protect, cancelOrderAndRestoreStock);

// Lấy tất cả đơn hàng của user (dùng ở Profile > tab Đơn hàng)
router.get('/orders', protect, getUserOrders);

export default router;
