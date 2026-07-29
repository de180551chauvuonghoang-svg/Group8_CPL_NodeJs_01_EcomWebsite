import API from './api';

export const sellerService = {
  registerSeller: async (
    shopName: string,
    shopPhone: string,
    shopAddress: string,
    description?: string,
    extra?: Record<string, string>
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

  getProducts: async () => {
    const response: any = await API.get('/seller/products');
    return response.data?.products || response.products || [];
  },

  getCategories: async () => {
    const response: any = await API.get('/seller/categories');
    return response.data?.categories || response.categories || [];
  },

  getBrands: async () => {
    const response: any = await API.get('/seller/brands');
    return response.data?.brands || response.brands || [];
  },

  createProduct: async (productData: {
    name: string;
    price: number;
    description?: string;
    categoryId?: string;
    brandId?: string;
    image?: string;
    stock?: number;
    isActive?: boolean;
  }) => {
    const response: any = await API.post('/seller/products', productData);
    return response.data?.product || response.product;
  },

  updateProduct: async (productId: string, productData: {
    name?: string;
    price?: number;
    description?: string;
    categoryId?: string;
    brandId?: string;
    image?: string;
    stock?: number;
    isActive?: boolean;
  }) => {
    const response: any = await API.put(`/seller/products/${productId}`, productData);
    return response;
  },

  deleteProduct: async (productId: string) => {
    const response: any = await API.delete(`/seller/products/${productId}`);
    return response;
  },

  getOrders: async () => {
    const response: any = await API.get('/seller/orders');
    return response.data?.orders || response.orders || [];
  },

  updateOrderItem: async (itemId: string, data: {
    fulfillmentStatus: string;
    trackingCode?: string;
    shippingLabelUrl?: string;
    cancelReason?: string;
  }) => {
    const response: any = await API.patch(`/seller/orders/items/${itemId}`, data);
    return response;
  },

  getCoupons: async () => {
    const response: any = await API.get('/seller/coupons');
    return response.data?.coupons || response.coupons || [];
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

  updateCoupon: async (couponId: string, data: { isActive?: boolean; startsAt?: string; expiresAt?: string }) => {
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

  updateFlashSale: async (id: string, data: {
    productId?: string;
    variantId?: string | null;
    originalPrice?: number;
    salePrice?: number;
    startsAt?: string;
    endsAt?: string;
    status?: 'active' | 'inactive';
  }) => {
    const response: any = await API.patch(`/seller/flash-sales/${id}`, data);
    return response.data?.flashSale || response.flashSale;
  },

  deleteFlashSale: async (id: string) => {
    const response: any = await API.delete(`/seller/flash-sales/${id}`);
    return response;
  },
};
