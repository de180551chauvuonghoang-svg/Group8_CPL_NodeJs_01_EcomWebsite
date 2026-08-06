import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { CouponValidationResult, Product } from '../types';
import API from '../services/api';
import { productService } from '../services/productService';
import { AuthContext } from './AuthContext';

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  selectedColor?: string;
  selectedVersion?: string;
}

export interface AppliedShopCoupon {
  code: string;
  discountAmount: number;
  coupon: CouponValidationResult;
}

interface RefreshCartResult {
  items: CartItem[];
  pricesChanged: boolean;
  removedUnavailableItems: number;
}

interface CartContextType {
  cartItems: CartItem[];
  appliedCoupons: Record<string, AppliedShopCoupon>;
  discountAmount: number;
  couponCodes: Array<{ sellerId: string; code: string }>;
  addToCart: (product: Product, selectedColor?: string, selectedVersion?: string) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, action: 'add' | 'remove') => void;
  clearCart: () => void;
  clearDiscount: (sellerId?: string) => void;
  applyDiscount: (
    sellerId: string,
    code: string,
  ) => Promise<{ ok: boolean; message: string; coupon?: CouponValidationResult }>;
  refreshCartPrices: () => Promise<RefreshCartResult>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);
const GUEST_OWNER = 'guest';
const LEGACY_MOCK_PRODUCT_IDS = new Set(['prod_audio_pro', 'prod_home_hub', 'prod_glass_keyboard']);

const storageKeys = (ownerId: string) => ({
  cart: `cart:${ownerId}`,
  coupons: `cart_coupons:${ownerId}`,
});

const isLegacyMockProduct = (productId: string) =>
  productId.startsWith('mock-p-') || LEGACY_MOCK_PRODUCT_IDS.has(productId);

const getSellerId = (item: CartItem) => item.product.seller_id || '';

function isValidCartItem(item: unknown): item is CartItem {
  if (!item || typeof item !== 'object') return false;
  const candidate = item as Partial<CartItem>;
  const product = candidate.product as Partial<Product> | undefined;
  return (
    typeof candidate.id === 'string' &&
    Number.isInteger(candidate.quantity) &&
    Number(candidate.quantity) > 0 &&
    typeof product?.id === 'string' &&
    !isLegacyMockProduct(product.id) &&
    typeof product.name === 'string' &&
    typeof product.price === 'number' &&
    Number.isFinite(product.price)
  );
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function loadOwnerState(ownerId: string) {
  const keys = storageKeys(ownerId);
  let cartItems = readJson<unknown[]>(keys.cart, []).filter(isValidCartItem);
  const appliedCoupons = readJson<Record<string, AppliedShopCoupon>>(keys.coupons, {});

  const legacyScopedCart = `ecom_cart:${ownerId}`;
  if (!localStorage.getItem(keys.cart) && localStorage.getItem(legacyScopedCart)) {
    cartItems = readJson<unknown[]>(legacyScopedCart, []).filter(isValidCartItem);
  }

  if (
    ownerId === GUEST_OWNER &&
    !localStorage.getItem(keys.cart) &&
    localStorage.getItem('ecom_cart')
  ) {
    cartItems = readJson<unknown[]>('ecom_cart', []).filter(isValidCartItem);
  }

  localStorage.setItem(keys.cart, JSON.stringify(cartItems));
  localStorage.setItem(keys.coupons, JSON.stringify(appliedCoupons));

  if (ownerId === GUEST_OWNER) {
    ['ecom_cart', 'ecom_cart_promo', 'ecom_cart_discount'].forEach((key) =>
      localStorage.removeItem(key),
    );
  }
  [
    legacyScopedCart,
    `ecom_cart_promo:${ownerId}`,
    `ecom_cart_discount:${ownerId}`,
    `ecom_cart_discount_amount:${ownerId}`,
  ].forEach((key) => localStorage.removeItem(key));

  return { cartItems, appliedCoupons };
}

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const auth = useContext(AuthContext);
  const ownerId = auth?.loading ? null : auth?.user?.id || GUEST_OWNER;
  const [hydratedOwnerId, setHydratedOwnerId] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [appliedCoupons, setAppliedCoupons] = useState<Record<string, AppliedShopCoupon>>({});
  const cartItemsRef = useRef<CartItem[]>([]);

  useEffect(() => {
    if (!ownerId || ownerId === hydratedOwnerId) return;
    setHydratedOwnerId(null);
    const state = loadOwnerState(ownerId);
    cartItemsRef.current = state.cartItems;
    setCartItems(state.cartItems);
    setAppliedCoupons(state.appliedCoupons);
    setHydratedOwnerId(ownerId);
  }, [hydratedOwnerId, ownerId]);

  useEffect(() => {
    cartItemsRef.current = cartItems;
    if (!ownerId || hydratedOwnerId !== ownerId) return;
    localStorage.setItem(storageKeys(ownerId).cart, JSON.stringify(cartItems));
  }, [cartItems, hydratedOwnerId, ownerId]);

  useEffect(() => {
    if (!ownerId || hydratedOwnerId !== ownerId) return;
    localStorage.setItem(storageKeys(ownerId).coupons, JSON.stringify(appliedCoupons));
  }, [appliedCoupons, hydratedOwnerId, ownerId]);

  const clearDiscount = useCallback((sellerId?: string) => {
    if (!sellerId) {
      setAppliedCoupons({});
      return;
    }
    setAppliedCoupons((current) => {
      const next = { ...current };
      delete next[sellerId];
      return next;
    });
  }, []);

  const addToCart = useCallback(
    (product: Product, selectedColor?: string, selectedVersion?: string) => {
      if (isLegacyMockProduct(product.id)) return;
      const variantKey = product.variantId || product.id;
      if (product.seller_id) clearDiscount(product.seller_id);

      setCartItems((current) => {
        const index = current.findIndex(
          (item) =>
            (item.product.variantId || item.product.id) === variantKey &&
            item.selectedColor === selectedColor &&
            item.selectedVersion === selectedVersion,
        );
        if (index >= 0) {
          const next = [...current];
          next[index] = { ...next[index], quantity: next[index].quantity + 1, product };
          return next;
        }
        return [
          ...current,
          {
            id: `${variantKey}_${selectedColor || ''}_${selectedVersion || ''}`,
            product,
            quantity: 1,
            selectedColor,
            selectedVersion,
          },
        ];
      });
    },
    [clearDiscount],
  );

  const removeFromCart = useCallback(
    (id: string) => {
      const item = cartItemsRef.current.find((candidate) => candidate.id === id);
      if (item) clearDiscount(getSellerId(item));
      setCartItems((current) => current.filter((candidate) => candidate.id !== id));
    },
    [clearDiscount],
  );

  const updateQuantity = useCallback(
    (id: string, action: 'add' | 'remove') => {
      const item = cartItemsRef.current.find((candidate) => candidate.id === id);
      if (item) clearDiscount(getSellerId(item));
      setCartItems((current) =>
        current.map((candidate) =>
          candidate.id === id
            ? {
                ...candidate,
                quantity: Math.max(1, candidate.quantity + (action === 'add' ? 1 : -1)),
              }
            : candidate,
        ),
      );
    },
    [clearDiscount],
  );

  const clearCart = useCallback(() => {
    cartItemsRef.current = [];
    setCartItems([]);
    setAppliedCoupons({});
  }, []);

  const refreshCartPrices = useCallback(async (): Promise<RefreshCartResult> => {
    const currentItems = cartItemsRef.current;
    if (currentItems.length === 0) {
      return { items: [], pricesChanged: false, removedUnavailableItems: 0 };
    }

    const productsById = new Map<string, Product>();
    const unavailableIds = new Set<string>();
    await Promise.all(
      [...new Set(currentItems.map((item) => item.product.id))].map(async (productId) => {
        try {
          productsById.set(productId, await productService.getById(productId));
        } catch (error: any) {
          if (error?.status === 404) unavailableIds.add(productId);
          else throw error;
        }
      }),
    );

    let pricesChanged = false;
    const items = currentItems
      .filter((item) => !unavailableIds.has(item.product.id))
      .map((item) => {
        const product = productsById.get(item.product.id);
        if (!product) return item;
        if (
          product.price !== item.product.price ||
          product.variantId !== item.product.variantId ||
          product.stock !== item.product.stock
        ) {
          pricesChanged = true;
        }
        return { ...item, product };
      });

    const removedUnavailableItems = currentItems.length - items.length;
    cartItemsRef.current = items;
    setCartItems(items);
    if (pricesChanged || removedUnavailableItems > 0) setAppliedCoupons({});
    return { items, pricesChanged, removedUnavailableItems };
  }, []);

  const applyDiscount = useCallback(
    async (sellerId: string, code: string) => {
      const normalizedCode = code.trim().toUpperCase();
      const shopItems = cartItemsRef.current.filter((item) => item.product.seller_id === sellerId);
      if (!sellerId || shopItems.length === 0) {
        return { ok: false, message: 'Không tìm thấy sản phẩm của shop để áp dụng voucher.' };
      }

      try {
        const response: any = await API.post('/payments/coupons/validate', {
          code: normalizedCode,
          sellerId,
          cartItems: shopItems,
        });
        const coupon = (response.data || response) as CouponValidationResult;
        const amount = Number(coupon.discountAmount || 0);
        setAppliedCoupons((current) => ({
          ...current,
          [sellerId]: { code: coupon.code || normalizedCode, discountAmount: amount, coupon },
        }));
        return {
          ok: true,
          message: `Đã giảm ${new Intl.NumberFormat('vi-VN').format(amount)}đ cho shop này.`,
          coupon,
        };
      } catch (error: any) {
        clearDiscount(sellerId);
        if (error?.data?.code === 'PRICE_CHANGED') await refreshCartPrices();
        return {
          ok: false,
          message: error?.data?.message || error?.message || 'Voucher không hợp lệ.',
        };
      }
    },
    [clearDiscount, refreshCartPrices],
  );

  const discountAmount = useMemo(
    () => Object.values(appliedCoupons).reduce((sum, item) => sum + item.discountAmount, 0),
    [appliedCoupons],
  );
  const couponCodes = useMemo(
    () =>
      Object.entries(appliedCoupons).map(([sellerId, coupon]) => ({
        sellerId,
        code: coupon.code,
      })),
    [appliedCoupons],
  );

  return (
    <CartContext.Provider
      value={{
        cartItems,
        appliedCoupons,
        discountAmount,
        couponCodes,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        clearDiscount,
        applyDiscount,
        refreshCartPrices,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};
