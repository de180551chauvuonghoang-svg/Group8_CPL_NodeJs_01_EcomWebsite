import express from 'express';
import { protect, requireSellerShop } from '../middlewares/auth.middleware.js';
import {
  getShopProfile,
  updateShopProfile,
  getShopProducts,
  createShopProduct,
  updateShopProduct,
  deleteShopProduct,
  getShopOrders,
  getShopOrderDetail,
  updateShopOrderStatus,
  getShopOrderStats
} from '../controllers/seller.controller.js';

const router = express.Router();

// All seller routes require authentication and a valid shop profile
router.use(protect, requireSellerShop);

// Shop Profile
router.get('/profile', getShopProfile);
router.patch('/profile', updateShopProfile);

// Product Management
router.get('/products', getShopProducts);
router.post('/products', createShopProduct);
router.patch('/products/:id', updateShopProduct);
router.delete('/products/:id', deleteShopProduct);

// Order Management
router.get('/orders', getShopOrders);
router.get('/orders/:id', getShopOrderDetail);
router.patch('/orders/:id/status', updateShopOrderStatus);

// Business Stats
router.get('/stats', getShopOrderStats);

export default router;
