import API from './api';
import { Shop, Product, Order } from '../types';

export const sellerService = {
  getProfile: async (): Promise<Shop> => {
    const res: any = await API.get('/seller/profile');
    return res.data.shop;
  },

  updateProfile: async (shopData: Partial<Shop>): Promise<Shop> => {
    const res: any = await API.patch('/seller/profile', shopData);
    return res.data.shop;
  },

  getProducts: async (params?: { category?: string; search?: string }): Promise<Product[]> => {
    const res: any = await API.get('/seller/products', { params });
    return res.data.products;
  },

  createProduct: async (productData: any): Promise<Product> => {
    const res: any = await API.post('/seller/products', productData);
    return res.data.product;
  },

  updateProduct: async (id: string, productData: any): Promise<Product> => {
    const res: any = await API.patch(`/seller/products/${id}`, productData);
    return res.data.product;
  },

  deleteProduct: async (id: string): Promise<Product> => {
    const res: any = await API.delete(`/seller/products/${id}`);
    return res.data.product;
  },

  getOrders: async (params?: { status?: string; page?: number; limit?: number }): Promise<any> => {
    const res: any = await API.get('/seller/orders', { params });
    return res.data;
  },

  getOrderDetail: async (id: string): Promise<Order> => {
    const res: any = await API.get(`/seller/orders/${id}`);
    return res.data.order;
  },

  updateOrderStatus: async (id: string, status: string): Promise<Order> => {
    const res: any = await API.patch(`/seller/orders/${id}/status`, { status });
    return res.data.order;
  },

  getStats: async (): Promise<any[]> => {
    const res: any = await API.get('/seller/stats');
    return res.data.stats;
  }
};
