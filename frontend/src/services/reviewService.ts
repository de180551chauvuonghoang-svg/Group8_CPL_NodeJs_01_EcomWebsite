import API from './api';

export interface Review {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  is_verified: boolean;
  created_at: string;
  user_name: string;
  user_avatar: string | null;
}

export const reviewService = {
  getProductReviews: async (productId: string): Promise<Review[]> => {
    const response: any = await API.get(`/reviews/product/${productId}`);
    return response.data?.data || response.data || [];
  },

  createReview: async (data: { productId: string; rating: number; title: string; body: string }) => {
    const response = await API.post('/reviews', data);
    return response.data;
  }
};
