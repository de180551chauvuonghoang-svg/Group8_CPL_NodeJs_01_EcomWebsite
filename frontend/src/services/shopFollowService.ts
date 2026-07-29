import API from './api';
import type { SellerFollowerStats, ShopFollowStatus } from '../types';

export const shopFollowService = {
  getStatus: async (shopId: string): Promise<ShopFollowStatus> => {
    const response: any = await API.get(`/shops/${shopId}/follow-status`);
    return response.data || response;
  },

  follow: async (shopId: string): Promise<ShopFollowStatus> => {
    const response: any = await API.post(`/shops/${shopId}/follow`);
    return response.data || response;
  },

  unfollow: async (shopId: string): Promise<ShopFollowStatus> => {
    const response: any = await API.delete(`/shops/${shopId}/follow`);
    return response.data || response;
  },

  getSellerStats: async (): Promise<SellerFollowerStats> => {
    const response: any = await API.get('/seller/followers/stats');
    return response.data || response;
  },
};
