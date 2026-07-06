import express from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import {
  checkout,
  getMyOrders,
  getMyOrderDetail,
  cancelMyOrder
} from '../controllers/order.controller.js';

const router = express.Router();

// All order routes require login
router.use(protect);

router.post('/checkout', checkout);
router.get('/my-orders', getMyOrders);
router.get('/my-orders/:id', getMyOrderDetail);
router.patch('/my-orders/:id/cancel', cancelMyOrder);

export default router;
