import express from 'express';
import { createOrder } from '../controllers/order.controllers.js';
import { protect } from '../middlewares/auth.middleware.js'; // Require login

const router = express.Router();

// Định nghĩa API tạo đơn hàng (Chỉ ai có Token đăng nhập mới được gọi)
router.post('/checkout', protect, createOrder);

export default router;
