import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import {
  createCODOrder,
  validateCoupon,
  getOrderStatus,
  getUserOrders,
  cancelOrderAndRestoreStock,
  handleSepayWebhook,
  checkPaymentStatusPublic,
  simulatePaymentSuccess,
} from '../controllers/payment.controller.js';

const router = Router();

// ─── Auto Payment & Webhook ───────────────────────────────────────────────────
// SePay Banking Webhook Receiver (Public — No token required)
router.get('/webhook/sepay', (req, res) => {
  res.status(200).json({
    status: 'active',
    message: 'SePay Banking Webhook Endpoint is ONLINE & READY'
  });
});
router.post('/webhook/sepay', handleSepayWebhook);

// Public Order Payment Status check for frontend polling
router.get('/status-public/:orderId', checkPaymentStatusPublic);

// Dev Simulator endpoint for demoing auto-payment success
router.post('/simulate-success/:orderId', simulatePaymentSuccess);

// ─── COD & Coupons ────────────────────────────────────────────────────────────
router.post('/cod/create', protect, createCODOrder);
router.post('/coupons/validate', validateCoupon);

// ─── Orders ───────────────────────────────────────────────────────────────────
router.get('/order/:orderId', protect, getOrderStatus);
router.post('/order/:orderId/cancel', protect, cancelOrderAndRestoreStock);
router.get('/orders', protect, getUserOrders);

export default router;
