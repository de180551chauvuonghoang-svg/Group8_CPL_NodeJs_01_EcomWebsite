import API from './api';
import {
  AnalyticsPeriod,
  CouponStatsQuery,
  FulfillmentStatus,
  OrderTimelineData,
  SellerDashboardAnalytics,
  SellerCouponStatsData,
  Pagination,
  ProductImage,
  SellerCoupon,
  SellerDashboardTasks,
  SellerListQuery,
  SellerOrder,
  SellerProduct,
} from '../types';

export interface SellerOrderItemUpdateResult {
  id: string;
  fulfillment_status: FulfillmentStatus;
  changed: boolean;
  tracking_code?: string | null;
  shipping_label_url?: string | null;
  cancel_reason?: string | null;
}

const emptyPagination: Pagination = { page: 1, limit: 20, total: 0, total_pages: 0 };

export interface SellerProductPayload {
  name: string;
  price: number;
  categoryId: string;
  description?: string;
  sku: string;
  stock: number;
  lowStockThreshold: number;
  isActive?: boolean;
  stockReason?: string;
  images: ProductImage[];
}

export const sellerService = {
  registerSeller: async (
    shopName: string,
    shopPhone: string,
    shopAddress: string,
    description?: string,
    extra?: Record<string, string>,
  ) => {
    const response: any = await API.post('/seller/register', {
      shopName,
      shopPhone,
      shopAddress,
      description,
      ...(extra || {}),
    });
    const data = response.data || response;
    const actualData = data.data || data;

    if (actualData.accessToken) {
      localStorage.setItem('ecom_token', actualData.accessToken);
      localStorage.setItem('ecom_user', JSON.stringify(actualData.user));
    }
    return actualData;
  },

  getSellerProfile: async () => {
    const response: any = await API.get('/seller/profile');
    return response.data?.seller || response.seller;
  },

  updateSellerProfile: async (data: Record<string, string>) => {
    const response: any = await API.put('/seller/profile', data);
    return response.data?.seller || response.seller;
  },

  getPublicShop: async (sellerId: string) => {
    const response: any = await API.get(`/seller/shops/${sellerId}`);
    return response.data || response;
  },

  getDashboardStats: async () => {
    const response: any = await API.get('/seller/dashboard-stats');
    return response.data || response;
  },

  getDashboardAnalytics: async (query: {
    period: AnalyticsPeriod;
    from?: string;
    to?: string;
  }): Promise<SellerDashboardAnalytics> => {
    const response: any = await API.get('/seller/dashboard-analytics', {
      params: query,
    });
    return response.data || response;
  },

  getDashboardTasks: async (): Promise<SellerDashboardTasks> => {
    const response: any = await API.get('/seller/dashboard-tasks');
    return response.data || response;
  },

  getProductsPage: async (
    query: SellerListQuery = {},
  ): Promise<{ products: SellerProduct[]; pagination: Pagination }> => {
    const response: any = await API.get('/seller/products', { params: query });
    const data = response.data || response;
    return {
      products: data.products || [],
      pagination: data.pagination || emptyPagination,
    };
  },

  getProducts: async (): Promise<SellerProduct[]> => {
    const response: any = await API.get('/seller/products');
    return response.data?.products || response.products || [];
  },

  getCategories: async () => {
    const response: any = await API.get('/seller/categories');
    return response.data?.categories || response.categories || [];
  },

  createProduct: async (productData: SellerProductPayload) => {
    const response: any = await API.post('/seller/products', productData);
    return response.data?.product || response.product;
  },

  updateProduct: async (productId: string, productData: Partial<SellerProductPayload>) => {
    const response: any = await API.put(`/seller/products/${productId}`, productData);
    return response;
  },

  deleteProduct: async (productId: string) => {
    const response: any = await API.delete(`/seller/products/${productId}`);
    return response;
  },

  getOrdersPage: async (
    query: SellerListQuery = {},
  ): Promise<{ orders: SellerOrder[]; pagination: Pagination }> => {
    const response: any = await API.get('/seller/orders', { params: query });
    const data = response.data || response;
    return {
      orders: data.orders || [],
      pagination: data.pagination || emptyPagination,
    };
  },

  getOrders: async (): Promise<SellerOrder[]> => {
    const response: any = await API.get('/seller/orders');
    return response.data?.orders || response.orders || [];
  },

  updateOrderItem: async (
    itemId: string,
    data: {
      fulfillmentStatus: FulfillmentStatus;
      trackingCode?: string | null;
      shippingLabelUrl?: string | null;
      cancelReason?: string | null;
    },
  ): Promise<SellerOrderItemUpdateResult> => {
    const response: any = await API.patch(`/seller/orders/items/${itemId}`, data);
    return response.data?.orderItem || response.orderItem;
  },

  getOrderTimeline: async (orderId: string): Promise<OrderTimelineData> => {
    const response: any = await API.get(`/seller/orders/${orderId}/timeline`);
    return response.data?.data || response.data;
  },

  getCouponsPage: async (
    query: SellerListQuery = {},
  ): Promise<{ coupons: SellerCoupon[]; pagination: Pagination }> => {
    const response: any = await API.get('/seller/coupons', { params: query });
    const data = response.data || response;
    return {
      coupons: data.coupons || [],
      pagination: data.pagination || emptyPagination,
    };
  },

  getCoupons: async (): Promise<SellerCoupon[]> => {
    const response: any = await API.get('/seller/coupons');
    return response.data?.coupons || response.coupons || [];
  },

  getCouponStats: async (query: CouponStatsQuery): Promise<SellerCouponStatsData> => {
    const response: any = await API.get('/seller/coupons/stats', { params: query });
    return response.data || response;
  },

  createCoupon: async (data: {
    code: string;
    description?: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    minOrderAmount?: number;
    maxDiscountAmt?: number;
    usageLimit?: number;
    startsAt?: string;
    expiresAt: string;
  }) => {
    const response: any = await API.post('/seller/coupons', data);
    return response.data?.coupon || response.coupon;
  },

  updateCoupon: async (
    couponId: string,
    data: { isActive?: boolean; startsAt?: string; expiresAt?: string },
  ) => {
    const response: any = await API.patch(`/seller/coupons/${couponId}`, data);
    return response;
  },

  deleteCoupon: async (couponId: string) => {
    const response: any = await API.delete(`/seller/coupons/${couponId}`);
    return response;
  },

  getFlashSales: async () => {
    const response: any = await API.get('/seller/flash-sales');
    return response.data?.flashSales || response.flashSales || [];
  },

  createFlashSale: async (data: {
    productId: string;
    variantId?: string | null;
    originalPrice: number;
    salePrice: number;
    startsAt: string;
    endsAt: string;
    status?: 'active' | 'inactive';
  }) => {
    const response: any = await API.post('/seller/flash-sales', data);
    return response.data?.flashSale || response.flashSale;
  },

  updateFlashSale: async (
    id: string,
    data: {
      productId?: string;
      variantId?: string | null;
      originalPrice?: number;
      salePrice?: number;
      startsAt?: string;
      endsAt?: string;
      status?: 'active' | 'inactive';
    },
  ) => {
    const response: any = await API.patch(`/seller/flash-sales/${id}`, data);
    return response.data?.flashSale || response.flashSale;
  },

  deleteFlashSale: async (id: string) => {
    const response: any = await API.delete(`/seller/flash-sales/${id}`);
    return response;
  },
};
