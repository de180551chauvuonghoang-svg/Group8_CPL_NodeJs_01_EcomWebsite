import express from 'express';
import {
  createOrder,
  getCustomerOrderTimeline
} from '../controllers/order.controllers.js';
import { protect } from '../middlewares/auth.middleware.js'; // Require login
import { requestOrderItemReturn } from '../controllers/return.controller.js';

const router = express.Router();

// Định nghĩa API tạo đơn hàng (Chỉ ai có Token đăng nhập mới được gọi)
router.post('/checkout', protect, createOrder);
router.post('/items/:itemId/returns', protect, requestOrderItemReturn);
router.get('/:orderId/timeline', protect, getCustomerOrderTimeline);

export default router;
