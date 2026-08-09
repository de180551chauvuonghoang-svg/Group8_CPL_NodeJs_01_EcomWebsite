import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { wishlistService, WishlistItem } from '../services/wishlistService';
import { AuthContext } from './AuthContext';

interface WishlistContextType {
  wishlist: WishlistItem[];
  isInWishlist: (productId: string) => boolean;
  toggleWishlist: (productId: string) => Promise<void>;
  loading: boolean;
}

export const WishlistContext = createContext<WishlistContextType>({
  wishlist: [],
  isInWishlist: () => false,
  toggleWishlist: async () => {},
  loading: false
});

export const WishlistProvider = ({ children }: { children: ReactNode }) => {
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const auth = useContext(AuthContext);

  useEffect(() => {
    if (auth?.isAuthenticated) {
      loadWishlist();
    } else {
      setWishlist([]);
    }
  }, [auth?.isAuthenticated]);

  const loadWishlist = async () => {
    setLoading(true);
    try {
      const data = await wishlistService.getWishlist();
      setWishlist(data);
    } catch (err) {
      console.error('Failed to load wishlist', err);
    } finally {
      setLoading(false);
    }
  };

  const isInWishlist = (productId: string) => {
    return wishlist.some(item => item.id === productId);
  };

  const toggleWishlist = async (productId: string) => {
    if (!auth?.isAuthenticated) {
      // Could show a toast or redirect to login
      alert("Vui lòng đăng nhập để lưu sản phẩm yêu thích.");
      return;
    }

    // Optimistic update
    const isCurrentlyIn = isInWishlist(productId);
    
    try {
      if (isCurrentlyIn) {
        setWishlist(prev => prev.filter(item => item.id !== productId));
        await wishlistService.removeFromWishlist(productId);
      } else {
        // Optimistic add with minimal data
        setWishlist(prev => [...prev, { id: productId } as WishlistItem]);
        await wishlistService.addToWishlist(productId);
      }
      // Reload to get full correct data
      loadWishlist();
    } catch (err) {
      console.error('Failed to toggle wishlist', err);
      // Revert optimistic update by reloading
      loadWishlist();
    }
  };

  return (
    <WishlistContext.Provider value={{ wishlist, isInWishlist, toggleWishlist, loading }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => useContext(WishlistContext);
