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

export interface OrderItemDetail {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  variant_info: string | null;
  product_id: string | null;
  product_image: string | null;
  has_reviewed: boolean;
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

  /** POST /api/payments/cod/create → returns { orderId } */
  createCODOrder: async (payload: CheckoutPayload): Promise<{ orderId: string }> => {
    const response: any = await API.post('/payments/cod/create', payload);
    return response;
  },

  /** GET /api/payments/order/:orderId → order + payment status */
  getOrderStatus: async (orderId: string): Promise<OrderStatusData> => {
    const response: any = await API.get(`/payments/order/${orderId}`);
    return response.data?.data || response.data;
  },

  cancelOrder: async (orderId: string): Promise<void> => {
    await API.post(`/payments/order/${orderId}/cancel`);
  },

  /** GET /api/payments/orders → all orders for current user */
  getUserOrders: async (): Promise<UserOrder[]> => {
    const response: any = await API.get('/payments/orders');
    return response.data?.data || response.data || [];
  },

  /** GET /api/payments/orders/:orderId/items → line items for an order */
  getOrderItems: async (orderId: string): Promise<OrderItemDetail[]> => {
    const response: any = await API.get(`/payments/orders/${orderId}/items`);
    return response.data?.data || response.data || [];
  },
};
