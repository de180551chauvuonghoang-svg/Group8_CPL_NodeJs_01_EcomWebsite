import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import { getProductReviews, getMyReview, createReview } from '../controllers/review.controller.js';

const router = Router();

// Public — anyone can read approved reviews
router.get('/product/:productId', getProductReviews);

// Authenticated — check own review and submit
router.get('/mine/:productId', protect, getMyReview);
router.post('/', protect, createReview);

export default router;
