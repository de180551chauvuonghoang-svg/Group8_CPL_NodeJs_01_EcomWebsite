import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import {
  createMoMoPayment,
  handleMoMoIPN,
  createCODOrder,
  getOrderStatus,
  getUserOrders,
} from '../controllers/payment.controller.js';

const router = Router();

// ─── MoMo ─────────────────────────────────────────────────────────────────────
// Yêu cầu thanh toán → trả về payUrl để frontend redirect sang MoMo
router.post('/momo/create', protect, createMoMoPayment);

// Webhook IPN: MoMo gọi server để cập nhật trạng thái — KHÔNG cần auth
// (MoMo server gọi trực tiếp, không có JWT)
router.post('/momo/ipn', handleMoMoIPN);

// ─── COD ──────────────────────────────────────────────────────────────────────
router.post('/cod/create', protect, createCODOrder);

// ─── Orders ───────────────────────────────────────────────────────────────────
// Lấy trạng thái 1 đơn hàng (dùng ở PaymentReturn page sau redirect)
router.get('/order/:orderId', protect, getOrderStatus);

// Lấy tất cả đơn hàng của user (dùng ở Profile > tab Đơn hàng)
router.get('/orders', protect, getUserOrders);

export default router;
