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
}

export interface ProductDetail extends Product {
  images?: string[];      // gallery thumbnails
  specifications?: Record<string, string>;
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
  fulfillment_status?: string;
  tracking_code?: string;
  cancel_reason?: string;
}

export interface SellerOrder {
  id: string;
  status: string;
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

