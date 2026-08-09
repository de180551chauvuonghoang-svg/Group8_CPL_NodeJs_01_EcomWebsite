import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import { getWishlist, addToWishlist, removeFromWishlist } from '../controllers/wishlist.controller.js';

const router = Router();

router.use(protect);

router.get('/', getWishlist);
router.post('/add', addToWishlist);
router.delete('/remove/:productId', removeFromWishlist);

export default router;
