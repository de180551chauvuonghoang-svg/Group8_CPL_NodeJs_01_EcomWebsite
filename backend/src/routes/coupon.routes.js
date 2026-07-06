import express from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import { validateCoupon } from '../controllers/coupon.controller.js';

const router = express.Router();

// All coupon routes require authentication
router.use(protect);

router.post('/validate', validateCoupon);

export default router;
