export interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
  phone_number?: string;
  avatar_url?: string;
  bio?: string;
  country?: string;
  timezone?: string;
  sellerId?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  category_slug?: string;
  rating: number;
  stock: number;
  reviewsCount?: number;
  badge?: 'new' | 'sale' | 'hot';
  originalPrice?: number;
  isFlashSale?: boolean;
  flashSaleEndsAt?: string | null;
  seller_id?: string;
  seller_user_id?: string;
  seller_name?: string;
  seller_logo_url?: string;
  variantId?: string;
  sku?: string;
  images?: ProductImage[];
}

export interface ProductDetail extends Product {
  specifications?: Record<string, string>;
}

export interface ProductImage {
  id?: string;
  url: string;
  publicId?: string | null;
  isPrimary?: boolean;
  sortOrder?: number;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  loginWithGoogle: (idToken: string) => Promise<User>;
  register: (name: string, email: string, password: string, phone: string) => Promise<any>;
  logout: () => void;
  updateUser: (updatedUser: User) => void;
  refreshUser: () => Promise<User>;
}

export type SellerApplicationStatus = 'pending' | 'active' | 'rejected' | 'suspended';

export interface SellerApplication {
  sellerId: string;
  shopName?: string;
  status: SellerApplicationStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface Seller {
  id: string;
  user_id: string;
  shop_name: string;
  shop_phone: string;
  shop_address: string;
  pickup_address?: string;
  logo_url?: string;
  cover_url?: string;
  logo_public_id?: string;
  cover_public_id?: string;
  identity_name?: string;
  identity_number?: string;
  bank_name?: string;
  bank_account_no?: string;
  bank_account_holder?: string;
  description?: string;
  status: string;
  created_at?: string;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  message_text: string;
  is_read: boolean;
  created_at: string;
}

export interface ChatPartner {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  seller_id?: string;
  shop_name?: string;
  shop_logo_url?: string;
  last_message?: string;
  last_message_time?: string;
  unread_count?: number;
}

export interface ChatUnreadUpdate {
  partnerId: string;
  partnerName?: string;
  partnerAvatarUrl?: string;
  seller_id?: string;
  shop_name?: string;
  shop_logo_url?: string;
  unread_count: number;
  total_unread: number;
  last_message: string | null;
  last_message_time: string | null;
}

export interface SellerProduct {
  id: string;
  name: string;
  slug: string;
  description?: string;
  base_price: number;
  image_url?: string;
  stock_qty?: number;
  category_id?: string;
  category_name?: string;
  is_active: boolean;
  seller_id?: string;
  created_at?: string;
  updated_at?: string;
  default_variant?: SellerProductVariant;
  images?: ProductImage[];
  variants: SellerProductVariant[];
}

export interface SellerProductVariant {
  id: string;
  product_id: string;
  sku: string;
  price: number;
  stock_qty: number;
  low_stock_threshold: number;
  image_url?: string | null;
  is_active: boolean;
  updated_at: string;
}

export type AnalyticsPeriod = 'day' | 'month' | 'year';

export interface SellerAnalyticsStatusCounts {
  pending_fulfillment: number;
  ready_to_ship: number;
  shipping: number;
  delivered: number;
  cancelled: number;
}

export interface SellerAnalyticsSummary {
  orders_created: number;
  units_ordered: number;
  gross_revenue: number;
  delivered_orders: number;
  units_sold: number;
  average_delivered_order_value: number;
  current_status: SellerAnalyticsStatusCounts;
}

export interface SellerAnalyticsSeriesPoint extends SellerAnalyticsStatusCounts {
  key: string;
  label: string;
  orders_created: number;
  units_ordered: number;
  gross_revenue: number;
  delivered_orders: number;
  units_sold: number;
}

export interface SellerDashboardAnalytics {
  period: AnalyticsPeriod;
  from: string;
  to: string;
  timezone: 'Asia/Ho_Chi_Minh';
  revenue_rule: 'delivered_items_gross';
  summary: SellerAnalyticsSummary;
  series: SellerAnalyticsSeriesPoint[];
}

export type InventoryType =
  'sale' | 'order_cancelled' | 'restock' | 'manual_adjustment' | 'return_refund';

export type SellerInventoryAdjustmentType = Extract<InventoryType, 'restock' | 'manual_adjustment'>;

export interface LowStockVariant {
  variant_id: string;
  product_id: string;
  product_name: string;
  sku: string;
  stock_qty: number;
  low_stock_threshold: number;
  image_url?: string | null;
  is_active: boolean;
  updated_at: string;
  stock_status: 'low_stock' | 'out_of_stock';
}

export interface InventoryLog {
  id: string;
  variant_id: string;
  product_id: string;
  product_name: string;
  sku: string;
  old_quantity: number;
  change_quantity: number;
  new_quantity: number;
  type: InventoryType;
  reference_id?: string | null;
  reason?: string | null;
  created_by?: string | null;
  created_by_name?: string | null;
  created_at: string;
}

export interface LowStockInventoryData {
  variants: LowStockVariant[];
  pagination: Pagination;
}

export interface InventoryLogsData {
  logs: InventoryLog[];
  pagination: Pagination;
}

export interface InventoryAdjustmentResult {
  variant: {
    id: string;
    product_id: string;
    product_name: string;
    sku: string;
    stock_qty: number;
    low_stock_threshold: number;
    stock_status: 'in_stock' | 'low_stock' | 'out_of_stock';
  };
  log: {
    id: string;
    variant_id: string;
    old_quantity: number;
    change_quantity: number;
    new_quantity: number;
    type: InventoryType;
    reference_id?: string | null;
    reason?: string | null;
    created_by?: string | null;
  };
}

export interface SellerFlashSale {
  id: string;
  seller_id: string;
  product_id: string;
  variant_id?: string | null;
  original_price: number;
  sale_price: number;
  starts_at: string;
  ends_at: string;
  status: 'active' | 'inactive';
  product_name?: string;
  variant_sku?: string;
}

export type FulfillmentStatus =
  'pending_fulfillment' | 'ready_to_ship' | 'shipping' | 'delivered' | 'cancelled';

export interface OrderItemStatusHistory {
  id: string;
  old_status: FulfillmentStatus | null;
  new_status: FulfillmentStatus;
  change_source: string;
  note?: string | null;
  created_at: string;
  changed_by_user_id?: string | null;
  changed_by_name?: string | null;
}

export interface CustomerOrderItem {
  id: string;
  order_id: string;
  product_id: string;
  seller_id: string;
  shop_name: string;
  product_name: string;
  variant_id?: string;
  variant_info?: string;
  image_url?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  fulfillment_status: FulfillmentStatus;
  tracking_code?: string | null;
  cancel_reason?: string | null;
  history?: OrderItemStatusHistory[];
}

export interface UserOrder {
  id: string;
  status: FulfillmentStatus;
  display_status: FulfillmentStatus;
  order_status: string;
  total: number;
  payment_method: string;
  payment_status: string;
  shipping_name: string;
  shipping_address: string;
  created_at: string;
  items: CustomerOrderItem[];
}

export interface OrderStatusData extends Omit<UserOrder, 'payment_method'> {
  method: string;
  transaction_ref: string | null;
}

export interface OrderTimelineData {
  id: string;
  order_status: string;
  display_status: FulfillmentStatus;
  total: number;
  created_at: string;
  updated_at?: string;
  items: CustomerOrderItem[];
}

export interface SellerOrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  variant_info?: string;
  sku?: string;
  image_url?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  fulfillment_status: FulfillmentStatus;
  tracking_code?: string | null;
  shipping_label_url?: string | null;
  cancel_reason?: string | null;
  history?: OrderItemStatusHistory[];
}

export interface SellerOrder {
  id: string;
  status: string;
  display_status?: FulfillmentStatus;
  total: number;
  shipping_name: string;
  shipping_phone: string;
  shipping_address: string;
  created_at: string;
  items: SellerOrderItem[];
}

export interface SellerCoupon {
  id: string;
  code: string;
  description?: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount?: number;
  max_discount_amt?: number;
  usage_limit?: number;
  used_count: number;
  starts_at?: string;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
}

export type CouponStatsStatus =
  'all' | 'active' | 'scheduled' | 'expired' | 'disabled' | 'exhausted';

export type CouponStatsSortBy =
  | 'created_at'
  | 'code'
  | 'redemptions'
  | 'attributed_order_value'
  | 'discount_amount'
  | 'usage_rate';

export interface CouponStatsQuery {
  from?: string;
  to?: string;
  status?: CouponStatsStatus;
  couponId?: string;
  search?: string;
  sortBy?: CouponStatsSortBy;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface CouponStatsSummary {
  total_coupons: number;
  coupon_status: Record<Exclude<CouponStatsStatus, 'all'>, number>;
  total_redemptions: number;
  unique_customers: number;
  attributed_order_value: number;
  discount_amount: number;
  net_order_value: number;
  delivered_orders: number;
  delivered_gross_revenue: number;
}

export interface SellerCouponStat {
  id: string;
  code: string;
  description?: string | null;
  status: Exclude<CouponStatsStatus, 'all'>;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount?: number | null;
  max_discount_amount?: number | null;
  starts_at?: string | null;
  expires_at?: string | null;
  usage_limit?: number | null;
  used_count: number;
  remaining_uses?: number | null;
  usage_rate?: number | null;
  redemptions: number;
  unique_customers: number;
  attributed_order_value: number;
  discount_amount: number;
  net_order_value: number;
  delivered_orders: number;
  delivered_gross_revenue: number;
  last_used_at?: string | null;
}

export interface SellerCouponStatsData {
  generated_at: string;
  timezone: 'Asia/Ho_Chi_Minh';
  metric_rule: {
    usage_date: string;
    cancelled_orders: string;
    attributed_order_value: string;
    delivered_revenue: string;
  };
  filters: Record<string, unknown>;
  summary: CouponStatsSummary;
  coupons: SellerCouponStat[];
  pagination: Pagination;
}

export interface CouponValidationResult {
  couponId: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  discountAmount: number;
  sellerId?: string | null;
  cartSubtotal: number;
  eligibleSubtotal: number;
}

export type ReviewRating = 1 | 2 | 3 | 4 | 5;
export type ReviewSort = 'newest' | 'oldest' | 'highest' | 'lowest';

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface ProductReview {
  id: string;
  rating: ReviewRating;
  title?: string | null;
  body: string;
  is_verified: boolean;
  author_name: string;
  author_avatar_url?: string | null;
  seller_reply?: string | null;
  replied_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReviewSummary {
  average_rating: number;
  review_count: number;
  rating_breakdown: Record<ReviewRating, number>;
}

export interface ProductReviewsData {
  reviews: ProductReview[];
  summary: ReviewSummary;
  pagination: Pagination;
}

export interface ReviewableItem {
  order_item_id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  variant_info?: string | null;
  quantity: number;
  seller_id: string;
  shop_name: string;
  image_url?: string | null;
  delivered_at?: string | null;
  can_review: boolean;
}

export interface MyReview {
  id: string;
  order_item_id: string | null;
  order_id: string | null;
  product_id: string;
  product_name: string;
  product_image_url?: string | null;
  seller_id?: string | null;
  shop_name?: string | null;
  rating: ReviewRating;
  title?: string | null;
  body: string;
  is_verified: boolean;
  seller_reply?: string | null;
  replied_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MyReviewsData {
  reviews: MyReview[];
  pagination: Pagination;
}

export interface SellerReview {
  id: string;
  product_id: string;
  product_name: string;
  product_image_url?: string | null;
  order_item_id: string;
  order_id: string;
  rating: ReviewRating;
  title?: string | null;
  body: string;
  is_verified: boolean;
  is_approved: boolean;
  seller_reply?: string | null;
  replied_at?: string | null;
  created_at: string;
  updated_at: string;
  customer_name: string;
  customer_avatar_url?: string | null;
}

export interface SellerReviewsData {
  reviews: SellerReview[];
  pagination: Pagination;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: Pagination;
}

export interface SellerListQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  categoryId?: string;
  rating?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SellerDashboardTasks {
  ordersToProcess: number;
  overdueOrders: number;
  unreadMessages: number;
  outOfStockProducts: number;
  lowStockProducts: number;
  unrepliedReviews: number;
  pendingReturns: number;
  overdueAfterHours: number;
}

export type NotificationType =
  | 'new_order'
  | 'order_status'
  | 'order_cancelled'
  | 'chat_message'
  | 'new_review'
  | 'review_reply'
  | 'return_requested'
  | 'return_status'
  | 'low_stock'
  | 'out_of_stock'
  | 'new_follower';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  entity_type?: string | null;
  entity_id?: string | null;
  data?: Record<string, unknown> | null;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
}

export interface NotificationListData {
  notifications: AppNotification[];
  unread_count: number;
  pagination: Pagination;
}

export interface ShopFollowStatus {
  is_following: boolean;
  follower_count: number;
}

export interface SellerFollowerStats {
  total_followers: number;
  new_followers_30d: number;
  new_followers_7d: number;
}

export type ReturnStatus = 'requested' | 'approved' | 'rejected' | 'received';

export interface ReturnRequest {
  id: string;
  order_item_id: string;
  customer_user_id: string;
  seller_id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_image_url?: string | null;
  shop_name?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  quantity: number;
  purchased_quantity?: number;
  unit_price?: number;
  total_price?: number;
  reason: string;
  seller_response?: string | null;
  status: ReturnStatus;
  internal_status?: string;
  requested_at: string;
  responded_at?: string | null;
  returned_at?: string | null;
  updated_at: string;
}

export interface ReturnHistoryItem {
  id: string;
  old_status?: ReturnStatus | null;
  new_status: ReturnStatus;
  note?: string | null;
  created_at: string;
}

export interface SellerReturnDetail {
  return: ReturnRequest;
  history: ReturnHistoryItem[];
}

export interface FinanceSummary {
  period: { from: string | null; to: string | null };
  gross_sales: number;
  voucher_discount: number;
  returned_amount: number;
  net_revenue: number;
  net_units: number;
  delivered_orders: number;
  completed_returns: number;
  pending_revenue: number;
  pending_orders: number;
  note: string;
}

export interface FinanceTransaction {
  transaction_type: 'sale' | 'return';
  order_id: string;
  order_item_id?: string | null;
  return_id?: string | null;
  customer_name: string;
  description: string;
  gross_amount: number;
  discount_amount: number;
  return_amount: number;
  net_amount: number;
  units_sold: number;
  recognized_at: string;
}

export interface UploadedImage {
  url: string;
  publicId: string;
  purpose: 'product' | 'shop_logo' | 'shop_cover';
  width: number;
  height: number;
  bytes: number;
  format: string;
}

export interface SellerWallet {
  id: string;
  sellerId: string;
  availableBalance: number;
  pendingBalance: number;
  withdrawalHoldBalance: number;
  withdrawnTotal: number;
  lifetimeEarnings: number;
  createdAt: string;
  updatedAt: string;
}

export interface SellerWalletBankInfo {
  bankName: string | null;
  accountHolder: string | null;
  maskedAccountNo: string | null;
}

export interface SellerWalletOverview {
  wallet: SellerWallet;
  bankInfo: SellerWalletBankInfo;
  minimumWithdrawalAmount: number;
  holdDays: number;
}

export type WalletTransactionType =
  | 'sale_pending'
  | 'sale_released'
  | 'sale_reversed'
  | 'withdrawal_hold'
  | 'withdrawal_approved'
  | 'withdrawal_rejected'
  | 'withdrawal_cancelled';

export type WalletTransactionFilter = 'all' | WalletTransactionType;

export interface WalletTransaction {
  id: string;
  type: WalletTransactionType;
  amount: number;
  referenceType: string | null;
  referenceId: string | null;
  availableAt: string | null;
  description: string | null;
  createdAt: string;
}

export type WithdrawalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type WithdrawalStatusFilter = 'all' | WithdrawalStatus;

export interface SellerWithdrawal {
  id: string;
  sellerId: string;
  amount: number;
  status: WithdrawalStatus;
  bankName: string;
  maskedAccountNo: string;
  accountHolder: string;
  sellerNote: string | null;
  adminNote: string | null;
  processedBy: string | null;
  requestedAt: string;
  processedAt: string | null;
}

export interface SellerDashboardTopProduct {
  id: string;
  name: string;
  image_url?: string | null;
  sold_qty: number;
  revenue: number;
}

export interface SellerDashboardTopRatedProduct {
  id: string;
  name: string;
  image_url?: string | null;
  rating: number;
  reviews_count: number;
}
