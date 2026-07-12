import API from './api';
import { CartItem } from '../context/CartContext';

export interface ShippingInfo {
  name: string;
  phone: string;
  address: string;
  city?: string;
  note?: string;
}

export interface CheckoutPayload {
  cartItems: CartItem[];
  shippingInfo: ShippingInfo;
  couponCode?: string;
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
}

export interface OrderStatusData {
  id: string;
  order_status: string;
  payment_status: string;
  method: string;
  total: number;
  shipping_name: string;
  shipping_address: string;
  transaction_ref: string | null;
  created_at: string;
}

export interface UserOrder {
  id: string;
  status: string;
  total: number;
  payment_method: string;
  payment_status: string;
  shipping_name: string;
  shipping_address: string;
  created_at: string;
}

export const paymentService = {
  placeOrder: async (payload: {
    items: any[];
    shippingAddress: string;
    paymentMethod: 'cod' | 'qr';
    totalAmount: number;
  }): Promise<{ success: boolean; message: string; orderId: string; qrUrl?: string }> => {
    const response: any = await API.post('/orders/checkout', payload);
    return response;
  },

  createCODOrder: async (payload: CheckoutPayload): Promise<{ orderId: string }> => {
    const response: any = await API.post('/payments/cod/create', payload);
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
};
