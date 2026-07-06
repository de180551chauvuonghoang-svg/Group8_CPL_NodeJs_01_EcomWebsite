import { customerOrderService } from '../services/customerOrderService.js';

export const checkout = async (req, res) => {
  try {
    const { items, shippingInfo } = req.body;
    const userId = req.user.id;

    if (!items || !shippingInfo) {
      return res.status(400).json({
        status: 'fail',
        message: 'items and shippingInfo are required'
      });
    }

    const orders = await customerOrderService.checkout(userId, items, shippingInfo);

    res.status(201).json({
      status: 'success',
      message: 'Orders placed successfully',
      results: orders.length,
      data: { orders }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

export const getMyOrders = async (req, res) => {
  try {
    const { status, page, limit } = req.query;
    const userId = req.user.id;

    const result = await customerOrderService.getOrders(userId, {
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

export const getMyOrderDetail = async (req, res) => {
  try {
    const orderId = req.params.id;
    const userId = req.user.id;

    const order = await customerOrderService.getOrderDetail(orderId, userId);

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

export const cancelMyOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    const userId = req.user.id;

    const order = await customerOrderService.cancelOrder(orderId, userId);

    res.status(200).json({
      status: 'success',
      message: 'Order cancelled successfully',
      data: { order }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};
