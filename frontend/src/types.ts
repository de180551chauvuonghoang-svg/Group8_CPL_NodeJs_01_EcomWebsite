export interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  rating: number;
  stock: number;
  shop_id?: string;
}

export interface Shop {
  id: string;
  user_id: string;
  shop_name: string;
  phone_number: string;
  warehouse_address: string;
  latitude: number;
  longitude: number;
  shipping_fee_per_km: number;
  max_delivery_distance: number;
  logo_url?: string;
  cover_url?: string;
  description?: string;
  is_verified: boolean;
}

export interface OrderItem {
  id: string;
  order_id: string;
  variant_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_name: string;
  variant_info?: string;
  variant_image?: string;
}

export interface Order {
  id: string;
  user_id: string;
  coupon_id?: string;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  subtotal: number;
  discount_amount: number;
  shipping_fee: number;
  total: number;
  shipping_name: string;
  shipping_phone: string;
  shipping_address: string;
  shipping_city?: string;
  shipping_country: string;
  note?: string;
  shop_id?: string;
  shop_name?: string;
  distance_km: number;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string) => Promise<any>;
  logout: () => void;
}

