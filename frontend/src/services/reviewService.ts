import API from './api';

export interface Review {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  is_verified: boolean;
  created_at: string;
  user_name: string;
  avatar_url: string | null;
}

export interface CreateReviewPayload {
  productId: string;
  rating: number;
  title: string;
  body: string;
}

export const reviewService = {
  getProductReviews: async (productId: string): Promise<Review[]> => {
    const response: any = await API.get(`/reviews/product/${productId}`);
    return response.data || [];
  },

  getMyReview: async (productId: string): Promise<Review | null> => {
    const response: any = await API.get(`/reviews/mine/${productId}`);
    return response.data || null;
  },

  createReview: async (payload: CreateReviewPayload): Promise<void> => {
    await API.post('/reviews', payload);
  },
};
