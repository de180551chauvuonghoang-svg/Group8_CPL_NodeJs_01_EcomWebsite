import { shopService } from '../services/shopService.js';
import { productService } from '../services/productService.js';
import { sellerOrderService } from '../services/sellerOrderService.js';

// ─── SHOP PROFILE ──────────────────────────────────────────

export const getShopProfile = async (req, res) => {
  try {
    // req.shop was loaded in requireSellerShop middleware
    res.status(200).json({
      status: 'success',
      data: { shop: req.shop }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

export const updateShopProfile = async (req, res) => {
  try {
    const updatedShop = await shopService.update(req.shopId, req.body);
    res.status(200).json({
      status: 'success',
      message: 'Shop profile updated successfully',
      data: { shop: updatedShop }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// ─── SHOP PRODUCTS ─────────────────────────────────────────

export const getShopProducts = async (req, res) => {
  try {
    const { category, search } = req.query;
    const products = await productService.getAll({
      category,
      search,
      shopId: req.shopId
    });

    res.status(200).json({
      status: 'success',
      results: products.length,
      data: { products }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

export const createShopProduct = async (req, res) => {
  try {
    const { name, price, description, category, image, stock } = req.body;

    if (!name || !price) {
      return res.status(400).json({
        status: 'fail',
        message: 'Product name and price are required'
      });
    }

    const product = await productService.create({
      name,
      price,
      description,
      category,
      image,
      stock,
      shopId: req.shopId
    });

    res.status(201).json({
      status: 'success',
      message: 'Product created successfully for your shop',
      data: { product }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

export const updateShopProduct = async (req, res) => {
  try {
    const product = await productService.update(req.params.id, {
      ...req.body,
      shopId: req.shopId // ownership check inside service
    });

    res.status(200).json({
      status: 'success',
      message: 'Product updated successfully',
      data: { product }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

export const deleteShopProduct = async (req, res) => {
  try {
    const product = await productService.delete(req.params.id, req.shopId);

    res.status(200).json({
      status: 'success',
      message: 'Product deleted successfully',
      data: { product }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// ─── SHOP ORDERS ───────────────────────────────────────────

export const getShopOrders = async (req, res) => {
  try {
    const { status, page, limit } = req.query;
    const result = await sellerOrderService.getOrdersByShop(req.shopId, {
      status,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined
    });

    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

export const getShopOrderDetail = async (req, res) => {
  try {
    const order = await sellerOrderService.getOrderDetail(req.params.id, req.shopId);

    res.status(200).json({
      status: 'success',
      data: { order }
    });
  } catch (err) {
    res.status(404).json({
      status: 'fail',
      message: err.message
    });
  }
};

export const updateShopOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({
        status: 'fail',
        message: 'Status is required to update order status'
      });
    }

    const order = await sellerOrderService.updateOrderStatus(req.params.id, req.shopId, status);

    res.status(200).json({
      status: 'success',
      message: `Order status updated to '${status}' successfully`,
      data: { order }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

export const getShopOrderStats = async (req, res) => {
  try {
    const stats = await sellerOrderService.getOrderStats(req.shopId);

    res.status(200).json({
      status: 'success',
      data: { stats }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};
