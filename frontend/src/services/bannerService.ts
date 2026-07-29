import API from './api';

export interface PublicBanner {
  id: string;
  title: string;
  image_url: string;
  link_url: string | null;
  position: string;
}

export const bannerService = {
  // Public: chỉ banner đang active và trong khoảng starts_at/ends_at (A004)
  getActiveBanners: async (): Promise<PublicBanner[]> => {
    try {
      const response: any = await API.get('/banners');
      return response.data?.banners || [];
    } catch {
      return [];
    }
  }
};
