import { createContext, useState, useEffect, ReactNode, useContext } from 'react';
import { Product } from '../types';

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  selectedColor?: string;
  selectedVersion?: string;
}

interface CartContextType {
  cartItems: CartItem[];
  promoCode: string;
  discountPercentage: number;
  addToCart: (product: Product, selectedColor?: string, selectedVersion?: string) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, action: 'add' | 'remove') => void;
  clearCart: () => void;
  applyDiscount: (code: string) => boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const defaultCartItems: CartItem[] = [
  {
    id: 'prod_audio_pro',
    product: {
      id: 'prod_audio_pro',
      name: 'Volitify Audio Pro - Noise Cancelling',
      description: 'Noise Cancelling premium headphone',
      price: 12500000,
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBbuSwgA71gPXYOW8sJSvPy6tWjHvFLKpSk3aWgjMFX7qyywljK5WaDWy2rOAuywZWnt-CfSgfvBEkbMLulEjj9RvXm7kd8Y8v74m-2FQrmXKSvaEqRcNJ64-d3UTkv4dSsHVCQj5Qx_Jz0T8b7ohY5Fy1kcMTvCVH85LY-sD1I6Z8CgsgZH1O-E1uLO11dyNI-4hlgXLsE8qjCx-fLYipnyLG7hl1wfoyXvQfuSMsEFfU9NbqHoJtVzQr6EagVFKfrIbF57-QqLrJO',
      category: 'Audio',
      rating: 5,
      stock: 10
    },
    quantity: 1,
    selectedColor: 'Midnight Blue',
    selectedVersion: 'Bluetooth 5.3, LDAC'
  },
  {
    id: 'prod_home_hub',
    product: {
      id: 'prod_home_hub',
      name: 'Smart Home Hub Pro',
      description: 'Advanced smart home automation center',
      price: 4200000,
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAbzO7P36ix5dtwE3iu4WIbTqBcwkQ9Qbhrybw6-H7Pfv073jz3890b778t5RlGtjfUmNrIiqS445xFCvFTdpQ6eUaNM4g_l9Tl9yie2YY8f-997iCLpYgzzctBmII_6p1rEBUpV15HtsGMTZAegvgLiREhQvHQxIm1HL4DNqT1hpWWAMmmsWTNiod8K-zjh7LxC3qI4N_VbDRQgtcu0NhZaiSHWVFSSHG91EM7zY3dh1FNvyV1GmcQbaXOZpJHCnCcg-AVPVwLpRJ7',
      category: 'Accessories',
      rating: 4.8,
      stock: 5
    },
    quantity: 1,
    selectedColor: 'Edition v2',
    selectedVersion: 'Apple Home, Google, Alexa'
  },
  {
    id: 'prod_glass_keyboard',
    product: {
      id: 'prod_glass_keyboard',
      name: 'Bàn phím cơ Volitify Glass',
      description: 'Premium futuristic mechanical keyboard',
      price: 3850000,
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDiTZglZpJU6cEz7NfviIN2qQiKpgOvE28Bww_JYwE3OXfkGNvTuCfmzDwZtRrTswh8HfT5yUEX6i0HwjXURyZA1ZnmXFfPPBmgWjN5fkgZYtXRQHxL7H7bIyWfp9MboAsKafNcEqVdC0-_6a774T9yjpEOziPmUstjAQCqyqTLXcKOHaT6EMPneA-flK1BuHT97bEX2adzsbCBWNE1tZYhE105xZV1MxMCEZO4fjoU50iqFxZF3unkQHj2RdejTHUaCPbBLfhROuNp',
      category: 'Accessories',
      rating: 4.9,
      stock: 12
    },
    quantity: 1,
    selectedColor: 'Silent Linear',
    selectedVersion: 'Tenkeyless (TKL)'
  }
];

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    const stored = localStorage.getItem('ecom_cart');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Lỗi khi đọc giỏ hàng từ localStorage:', e);
      }
    }
    return defaultCartItems;
  });

  const [promoCode, setPromoCode] = useState<string>(() => {
    return localStorage.getItem('ecom_cart_promo') || '';
  });

  const [discountPercentage, setDiscountPercentage] = useState<number>(() => {
    const pct = localStorage.getItem('ecom_cart_discount');
    return pct ? parseFloat(pct) : 0;
  });

  useEffect(() => {
    localStorage.setItem('ecom_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    localStorage.setItem('ecom_cart_promo', promoCode);
    localStorage.setItem('ecom_cart_discount', discountPercentage.toString());
  }, [promoCode, discountPercentage]);

  const addToCart = (product: Product, selectedColor?: string, selectedVersion?: string) => {
    setCartItems(prev => {
      // Find if item already exists with same product id, color, and version
      const existingIndex = prev.findIndex(item => 
        item.product.id === product.id && 
        item.selectedColor === selectedColor && 
        item.selectedVersion === selectedVersion
      );

      if (existingIndex > -1) {
        const next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: next[existingIndex].quantity + 1
        };
        return next;
      }

      const newItemId = `${product.id}_${selectedColor || ''}_${selectedVersion || ''}`;
      return [...prev, {
        id: newItemId,
        product,
        quantity: 1,
        selectedColor,
        selectedVersion
      }];
    });
  };

  const removeFromCart = (id: string) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, action: 'add' | 'remove') => {
    setCartItems(prev => 
      prev.map(item => {
        if (item.id === id) {
          const newQty = action === 'add' ? item.quantity + 1 : item.quantity - 1;
          return {
            ...item,
            quantity: Math.max(1, newQty) // Ensure quantity is at least 1
          };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setCartItems([]);
    setPromoCode('');
    setDiscountPercentage(0);
  };

  const applyDiscount = (code: string): boolean => {
    const sanitized = code.trim().toUpperCase();
    if (sanitized === 'ECOM2026') {
      setPromoCode('ECOM2026');
      setDiscountPercentage(10); // 10% discount
      return true;
    }
    return false;
  };

  return (
    <CartContext.Provider value={{
      cartItems,
      promoCode,
      discountPercentage,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      applyDiscount
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
