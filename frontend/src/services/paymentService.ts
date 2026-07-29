import API from './api';
import { OrderStatusData, OrderTimelineData, UserOrder } from '../types';

export type { OrderStatusData, UserOrder } from '../types';

export interface ShippingInfo {
  name: string;
  phone: string;
  address: string;
  city?: string;
  note?: string;
}

export interface CheckoutPricing {
  subtotal: number;
  vat: number;
  discount: number;
  shippingFee: number;
  total: number;
}

export interface CheckoutResult {
  success?: boolean;
  status?: string;
  message?: string;
  orderId: string;
  qrUrl?: string;
  pricing?: CheckoutPricing;
  items?: Array<{
    orderItemId: string;
    productId: string;
    variantId: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
}

export const paymentService = {
  placeOrder: async (payload: {
    cartItems: any[];
    shippingInfo: ShippingInfo;
    paymentMethod: 'cod' | 'qr';
    couponCodes: Array<{ sellerId: string; code: string }>;
    total: number;
  }): Promise<CheckoutResult> => {
    const response: any =
      payload.paymentMethod === 'cod'
        ? await API.post('/payments/cod/create', {
            cartItems: payload.cartItems,
            shippingInfo: payload.shippingInfo,
            couponCodes: payload.couponCodes,
            total: payload.total,
          })
        : await API.post('/orders/checkout', {
            items: payload.cartItems,
            shippingAddress: `${payload.shippingInfo.name} | ${payload.shippingInfo.phone}\n${payload.shippingInfo.address}`,
            paymentMethod: payload.paymentMethod,
            couponCodes: payload.couponCodes,
            totalAmount: payload.total,
          });
    return response;
  },

  getOrderStatus: async (orderId: string): Promise<OrderStatusData> => {
    const response: any = await API.get(`/payments/order/${orderId}`);
    return response.data?.data || response.data;
  },

  cancelOrder: async (orderId: string): Promise<void> => {
    await API.post(`/payments/order/${orderId}/cancel`);
  },

  getUserOrders: async (): Promise<UserOrder[]> => {
    const response: any = await API.get('/payments/orders');
    return response.data?.data || response.data || [];
  },

  getOrderTimeline: async (orderId: string): Promise<OrderTimelineData> => {
    const response: any = await API.get(`/orders/${orderId}/timeline`);
    return response.data?.data || response.data;
  },
};
