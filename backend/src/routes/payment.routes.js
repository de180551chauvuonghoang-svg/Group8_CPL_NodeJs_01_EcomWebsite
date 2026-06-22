import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import {
  createCODOrder,
  getOrderStatus,
  getUserOrders,
} from '../controllers/payment.controller.js';

const router = Router();



// ─── COD ──────────────────────────────────────────────────────────────────────
router.post('/cod/create', protect, createCODOrder);

// ─── Orders ───────────────────────────────────────────────────────────────────
// Lấy trạng thái 1 đơn hàng (dùng ở PaymentReturn page sau redirect)
router.get('/order/:orderId', protect, getOrderStatus);

// Lấy tất cả đơn hàng của user (dùng ở Profile > tab Đơn hàng)
router.get('/orders', protect, getUserOrders);

export default router;
