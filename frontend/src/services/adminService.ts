import API from './api';

export interface AdminSellerRow {
  id: string;
  shop_name: string;
  shop_phone: string;
  shop_address: string;
  description: string | null;
  logo_url: string | null;
  status: 'pending' | 'active' | 'rejected' | 'suspended';
  created_at: string;
  user_id: string;
  owner_name: string;
  owner_email: string;
}

export interface AdminProductRow {
  id: string;
  name: string;
  slug: string;
  base_price: number;
  image_url: string | null;
  stock_qty: number;
  category_name: string | null;
  is_active: boolean;
}

export interface AdminProductVariant {
  id: string;
  sku: string;
  price: number;
  compare_price: number | null;
  stock_qty: number;
  image_url: string | null;
  is_active: boolean;
  variant_label: string | null;
}

export interface AdminProductImage {
  id: string;
  image_url: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
}

export interface AdminProductDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  short_desc: string | null;
  base_price: number;
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
  seller_id: string | null;
  seller_name: string | null;
  images: AdminProductImage[];
  variants: AdminProductVariant[];
}

export interface AdminSellerReportRow {
  seller_id: string;
  shop_name: string;
  status: string;
  total_products: number;
  total_revenue: number;
  total_orders: number;
}

export interface AdminUserReportRow {
  user_id: string;
  name: string;
  email: string;
  role: string;
  total_spent: number;
  total_orders: number;
}

export interface AdminRevenuePoint {
  bucket: string;
  revenue: number;
  orders_count: number;
}

export interface AdminCashflowPoint {
  bucket: string;
  cash_in: number;
  cash_out: number;
}

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  phone_number: string | null;
  avatar_url: string | null;
  role: 'customer' | 'seller' | 'admin';
  is_active: boolean;
  suspend_reason?: string | null;
  boom_count?: number;
  created_at: string;
}

export interface AdminCategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface AdminBrandRow {
  id: string;
  name: string;
  logo_url: string | null;
  description: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface AdminOrderRow {
  id: string;
  status: string;
  subtotal: number;
  discount_amount: number;
  shipping_fee: number;
  total: number;
  shipping_name: string;
  shipping_phone: string;
  created_at: string;
  user_id: string;
  user_name: string;
  user_email: string;
  payment_method: string | null;
  payment_status: string | null;
}

export interface AdminOrderItem {
  id: string;
  variant_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_name: string;
  variant_info: string | null;
  fulfillment_status: string;
}

export interface AdminOrderDetail extends AdminOrderRow {
  user_name: string;
  user_email: string;
  shipping_address: string;
  shipping_city: string | null;
  note: string | null;
  items: AdminOrderItem[];
  payment: {
    id: string;
    method: string;
    status: string;
    amount: number;
    transaction_ref: string | null;
    paid_at: string | null;
  } | null;
}

export interface AdminInventoryRow {
  variant_id: string;
  sku: string;
  stock_qty: number;
  price: number;
  image_url: string | null;
  product_id: string;
  product_name: string;
  seller_name: string | null;
}

export interface AdminInventoryLogRow {
  id: string;
  change_qty: number;
  reason: string | null;
  reference_id: string | null;
  created_at: string;
  created_by_name: string | null;
}

export interface AdminDashboardSummary {
  newOrdersToday: number;
  lowStockCount: number;
  lowStockProducts: AdminInventoryRow[];
}

export interface AdminTopProductRow {
  product_id: string;
  product_name: string;
  total_sold: number;
  total_revenue: number;
}

export interface AdminCancellationRateRow {
  seller_id: string;
  shop_name: string;
  total_orders: number;
  cancelled_orders: number;
  cancellation_rate: number;
}

export interface AdminPaymentRow {
  id: string;
  order_id: string;
  method: string;
  status: string;
  amount: number;
  transaction_ref: string | null;
  paid_at: string | null;
  created_at: string;
  user_name: string;
  user_email: string;
  is_stale_pending: boolean;
  is_amount_outlier: boolean;
}

export interface AdminUserDetail extends AdminUserRow {
  addresses: Array<{
    id: string;
    recipient_name: string;
    phone_number: string;
    street_address: string;
    city: string | null;
    is_default: boolean;
  }>;
  orders: Array<{ id: string; status: string; total: number; created_at: string }>;
  total_spent: number;
  total_orders: number;
}

export interface AdminBannerRow {
  id: string;
  title: string;
  image_url: string;
  link_url: string | null;
  position: string;
  sort_order: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
}

export interface AdminCouponRow {
  id: string;
  seller_id: string | null;
  code: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number | null;
  max_discount_amt: number | null;
  usage_limit: number | null;
  used_count: number;
  user_limit: number | null;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface AdminNotificationTemplateRow {
  id: string;
  code: string;
  subject: string;
  html_body: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminAuditLogRow {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  before_data: string | null;
  after_data: string | null;
  created_at: string;
  admin_name: string;
  admin_email: string;
}

export const adminService = {
  getSellers: async (status?: string): Promise<AdminSellerRow[]> => {
    const response: any = await API.get('/admin/sellers', { params: status ? { status } : {} });
    return response.data?.sellers || [];
  },

  approveSeller: async (sellerId: string) => {
    const response: any = await API.patch(`/admin/sellers/${sellerId}/approve`);
    return response.data;
  },

  rejectSeller: async (sellerId: string) => {
    const response: any = await API.patch(`/admin/sellers/${sellerId}/reject`);
    return response.data;
  },

  suspendSeller: async (sellerId: string) => {
    const response: any = await API.patch(`/admin/sellers/${sellerId}/suspend`);
    return response.data;
  },

  getUsers: async (params?: { role?: string; isActive?: boolean; q?: string }): Promise<AdminUserRow[]> => {
    const response: any = await API.get('/admin/users', {
      params: {
        ...(params?.role ? { role: params.role } : {}),
        ...(params?.isActive !== undefined ? { isActive: params.isActive } : {}),
        ...(params?.q ? { q: params.q } : {})
      }
    });
    return response.data?.users || [];
  },

  setUserStatus: async (userId: string, isActive: boolean, reason?: string) => {
    const response: any = await API.patch(`/admin/users/${userId}/status`, { isActive, reason });
    return response.data;
  },

  resetUserPassword: async (userId: string) => {
    const response: any = await API.post(`/admin/users/${userId}/reset-password`);
    return response.data;
  },

  demoteSeller: async (userId: string) => {
    const response: any = await API.patch(`/admin/users/${userId}/demote-seller`);
    return response.data;
  },

  getSellerProducts: async (sellerId: string): Promise<AdminProductRow[]> => {
    const response: any = await API.get(`/admin/sellers/${sellerId}/products`);
    return response.data?.products || [];
  },

  getProductDetail: async (productId: string): Promise<AdminProductDetail> => {
    const response: any = await API.get(`/admin/products/${productId}`);
    return response.data?.product;
  },

  getSellerReport: async (): Promise<AdminSellerReportRow[]> => {
    const response: any = await API.get('/admin/reports/sellers');
    return response.data?.sellers || [];
  },

  getUserReport: async (): Promise<AdminUserReportRow[]> => {
    const response: any = await API.get('/admin/reports/users');
    return response.data?.users || [];
  },

  getRevenueStats: async (params?: { from?: string; to?: string; groupBy?: 'day' | 'month' }): Promise<AdminRevenuePoint[]> => {
    const response: any = await API.get('/admin/stats/revenue', { params });
    return response.data?.series || [];
  },

  getCashflowStats: async (params?: { from?: string; to?: string; groupBy?: 'day' | 'month' }): Promise<AdminCashflowPoint[]> => {
    const response: any = await API.get('/admin/stats/cashflow', { params });
    return response.data?.series || [];
  },

  // ── A007: Danh mục sản phẩm ────────────────────────────────────────────
  getCategories: async (): Promise<AdminCategoryRow[]> => {
    const response: any = await API.get('/admin/categories');
    return response.data?.categories || [];
  },

  createCategory: async (payload: Partial<AdminCategoryRow>) => {
    const response: any = await API.post('/admin/categories', payload);
    return response.data?.category;
  },

  updateCategory: async (categoryId: string, payload: Partial<AdminCategoryRow>) => {
    const response: any = await API.patch(`/admin/categories/${categoryId}`, payload);
    return response.data?.category;
  },

  deleteCategory: async (categoryId: string) => {
    const response: any = await API.delete(`/admin/categories/${categoryId}`);
    return response.data;
  },

  // ── A008: Nhà cung cấp / thương hiệu ────────────────────────────────────
  getBrands: async (status?: 'active' | 'inactive'): Promise<AdminBrandRow[]> => {
    const response: any = await API.get('/admin/brands', { params: status ? { status } : {} });
    return response.data?.brands || [];
  },

  createBrand: async (payload: { name: string; logo_url?: string; description?: string }) => {
    const response: any = await API.post('/admin/brands', payload);
    return response.data?.brand;
  },

  updateBrand: async (brandId: string, payload: { name?: string; logo_url?: string; description?: string }) => {
    const response: any = await API.patch(`/admin/brands/${brandId}`, payload);
    return response.data?.brand;
  },

  setBrandStatus: async (brandId: string, status: 'active' | 'inactive') => {
    const response: any = await API.patch(`/admin/brands/${brandId}/status`, { status });
    return response.data;
  },

  // ── Admin Orders module ─────────────────────────────────────────────────
  getOrders: async (params?: { status?: string; from?: string; to?: string; q?: string }): Promise<AdminOrderRow[]> => {
    const response: any = await API.get('/admin/orders', { params });
    return response.data?.orders || [];
  },

  getOrderDetail: async (orderId: string): Promise<AdminOrderDetail> => {
    const response: any = await API.get(`/admin/orders/${orderId}`);
    return response.data?.order;
  },

  // ── A011: Kho hàng & tồn kho ─────────────────────────────────────────────
  getInventory: async (lowStockOnly?: boolean): Promise<AdminInventoryRow[]> => {
    const response: any = await API.get('/admin/inventory', { params: lowStockOnly ? { lowStockOnly: true } : {} });
    return response.data?.inventory || [];
  },

  adjustInventory: async (variantId: string, changeQty: number, reason: string) => {
    const response: any = await API.post(`/admin/inventory/${variantId}/adjust`, { changeQty, reason });
    return response.data;
  },

  getInventoryLogs: async (variantId: string): Promise<AdminInventoryLogRow[]> => {
    const response: any = await API.get(`/admin/inventory/${variantId}/logs`);
    return response.data?.logs || [];
  },

  // ── A014: Dashboard tổng quan mở rộng ───────────────────────────────────
  getDashboardSummary: async (): Promise<AdminDashboardSummary> => {
    const response: any = await API.get('/admin/dashboard/summary');
    return response.data;
  },

  // ── A002: Báo cáo mở rộng ────────────────────────────────────────────────
  getTopProducts: async (params?: { from?: string; to?: string; limit?: number }): Promise<AdminTopProductRow[]> => {
    const response: any = await API.get('/admin/reports/top-products', { params });
    return response.data?.products || [];
  },

  getCancellationRates: async (params?: { from?: string; to?: string }): Promise<AdminCancellationRateRow[]> => {
    const response: any = await API.get('/admin/reports/cancellation-rate', { params });
    return response.data?.sellers || [];
  },

  // ── A003: Giao dịch thanh toán ───────────────────────────────────────────
  getPayments: async (params?: { method?: string; status?: string; from?: string; to?: string }): Promise<AdminPaymentRow[]> => {
    const response: any = await API.get('/admin/payments', { params });
    return response.data?.payments || [];
  },

  confirmPayment: async (paymentId: string) => {
    const response: any = await API.patch(`/admin/payments/${paymentId}/confirm`);
    return response.data;
  },

  // ── A009: Chi tiết tài khoản khách hàng ──────────────────────────────────
  getUserDetail: async (userId: string): Promise<AdminUserDetail> => {
    const response: any = await API.get(`/admin/users/${userId}/detail`);
    return response.data?.user;
  },

  // ── A004: Banner khuyến mãi ──────────────────────────────────────────────
  getAdminBanners: async (): Promise<AdminBannerRow[]> => {
    const response: any = await API.get('/admin/banners');
    return response.data?.banners || [];
  },

  createBanner: async (payload: Partial<AdminBannerRow>) => {
    const response: any = await API.post('/admin/banners', payload);
    return response.data?.banner;
  },

  updateBanner: async (bannerId: string, payload: Partial<AdminBannerRow>) => {
    const response: any = await API.patch(`/admin/banners/${bannerId}`, payload);
    return response.data?.banner;
  },

  deleteBanner: async (bannerId: string) => {
    const response: any = await API.delete(`/admin/banners/${bannerId}`);
    return response.data;
  },

  // ── A004: Voucher / mã giảm giá ──────────────────────────────────────────
  getCoupons: async (): Promise<AdminCouponRow[]> => {
    const response: any = await API.get('/admin/coupons');
    return response.data?.coupons || [];
  },

  createCoupon: async (payload: Partial<AdminCouponRow>) => {
    const response: any = await API.post('/admin/coupons', payload);
    return response.data?.coupon;
  },

  updateCoupon: async (couponId: string, payload: Partial<AdminCouponRow>) => {
    const response: any = await API.patch(`/admin/coupons/${couponId}`, payload);
    return response.data?.coupon;
  },

  deleteCoupon: async (couponId: string) => {
    const response: any = await API.delete(`/admin/coupons/${couponId}`);
    return response.data;
  },

  // ── A005: Nội dung email / thông báo tự động ─────────────────────────────
  getNotificationTemplates: async (): Promise<AdminNotificationTemplateRow[]> => {
    const response: any = await API.get('/admin/notification-templates');
    return response.data?.templates || [];
  },

  saveNotificationTemplate: async (payload: { code: string; subject: string; html_body: string; is_active?: boolean }) => {
    const response: any = await API.put('/admin/notification-templates', payload);
    return response.data?.template;
  },

  // ── A006: Nhật ký hoạt động (Audit Log) ──────────────────────────────────
  getAuditLogs: async (params?: { adminId?: string; action?: string; from?: string; to?: string }): Promise<AdminAuditLogRow[]> => {
    const response: any = await API.get('/admin/audit-logs', { params });
    return response.data?.logs || [];
  }
};
