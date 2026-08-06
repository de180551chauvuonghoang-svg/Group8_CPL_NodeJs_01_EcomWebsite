import API from './api';
import {
  MyReviewsData,
  ProductReview,
  ProductReviewsData,
  ReviewRating,
  ReviewSort,
  ReviewableItem,
  SellerReview,
  SellerReviewsData,
} from '../types';

interface PublicReviewQuery {
  rating?: ReviewRating;
  sort?: ReviewSort;
  page?: number;
  limit?: number;
}

interface SellerReviewQuery {
  rating?: ReviewRating;
  replied?: boolean;
  page?: number;
  limit?: number;
}

interface CreateReviewPayload {
  orderItemId: string;
  rating: ReviewRating;
  title?: string;
  body: string;
}

interface UpdateReviewPayload {
  rating?: ReviewRating;
  title?: string;
  body?: string;
}

interface MyReviewQuery {
  page?: number;
  limit?: number;
}

export const reviewService = {
  getProductReviews: async (
    productId: string,
    query: PublicReviewQuery = {},
  ): Promise<ProductReviewsData> => {
    const response: any = await API.get(`/products/${productId}/reviews`, { params: query });
    return response.data;
  },

  getReviewableItems: async (): Promise<ReviewableItem[]> => {
    const response: any = await API.get('/me/reviewable-items');
    return response.data?.items || [];
  },

  getMyReviews: async (query: MyReviewQuery = {}): Promise<MyReviewsData> => {
    const response: any = await API.get('/me/reviews', { params: query });
    return response.data;
  },

  createReview: async (productId: string, payload: CreateReviewPayload): Promise<ProductReview> => {
    const response: any = await API.post(`/products/${productId}/reviews`, payload);
    return response.data?.review;
  },

  updateReview: async (reviewId: string, payload: UpdateReviewPayload): Promise<ProductReview> => {
    const response: any = await API.patch(`/reviews/${reviewId}`, payload);
    return response.data?.review;
  },

  deleteReview: async (reviewId: string): Promise<void> => {
    await API.delete(`/reviews/${reviewId}`);
  },

  getSellerReviews: async (query: SellerReviewQuery = {}): Promise<SellerReviewsData> => {
    const response: any = await API.get('/seller/reviews', { params: query });
    return response.data;
  },

  replyToReview: async (reviewId: string, reply: string): Promise<SellerReview> => {
    const response: any = await API.put(`/seller/reviews/${reviewId}/reply`, { reply });
    return response.data?.review;
  },
};
