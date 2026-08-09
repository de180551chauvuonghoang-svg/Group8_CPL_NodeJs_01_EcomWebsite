import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import { getProductReviews, createReview } from '../controllers/review.controller.js';

const router = Router();

// Public route to get reviews for a product
router.get('/product/:productId', getProductReviews);

// Protected route to submit a review
router.post('/', protect, createReview);

export default router;
