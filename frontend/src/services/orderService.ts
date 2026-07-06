import API from './api';
import { Order } from '../types';

const unwrap = <T>(res: { data?: T } & T): T => (res.data !== undefined ? res.data : res) as T;

export const orderService = {
  checkout: async (items: Array<{ variantId: string; quantity: number }>, shippingInfo: any): Promise<any> => {
    const res = await API.post('/orders/checkout', { items, shippingInfo });
    return unwrap<{ orders: any[] }>(res).orders;
  },

  validateCoupon: async (code: string, subtotal: number, shopId?: string): Promise<{ coupon: any; discountAmount: number }> => {
    const res = await API.post('/coupons/validate', { code, subtotal, shopId });
    return unwrap(res);
  },

  getMyOrders: async (params?: { status?: string; page?: number; limit?: number }): Promise<any> => {
    const res = await API.get('/orders/my-orders', { params });
    return unwrap(res);
  },

  getMyOrderDetail: async (id: string): Promise<Order> => {
    const res = await API.get(`/orders/my-orders/${id}`);
    return unwrap<{ order: Order }>(res).order;
  },

  cancelMyOrder: async (id: string): Promise<Order> => {
    const res = await API.patch(`/orders/my-orders/${id}/cancel`);
    return unwrap<{ order: Order }>(res).order;
  }
};
