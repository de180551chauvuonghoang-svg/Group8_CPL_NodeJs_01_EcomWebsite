import API from './api';
import { Product } from '../types';

export interface WishlistItem {
  wishlist_item_id: string;
  id: string; // product id
  name: string;
  slug: string;
  base_price: number;
  image_url: string;
  category_name: string;
}

export const wishlistService = {
  getWishlist: async (): Promise<WishlistItem[]> => {
    const response: any = await API.get('/wishlists');
    return response.data?.data || response.data || [];
  },

  addToWishlist: async (productId: string): Promise<boolean> => {
    await API.post('/wishlists/add', { productId });
    return true;
  },

  removeFromWishlist: async (productId: string): Promise<boolean> => {
    await API.delete(`/wishlists/remove/${productId}`);
    return true;
  }
};
