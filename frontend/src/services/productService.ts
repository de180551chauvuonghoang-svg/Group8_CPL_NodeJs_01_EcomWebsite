import API from './api';
import { Product } from '../types';

export interface ProductFilterParams {
  category?: string;
  search?: string;
}

export const productService = {
  getAll: async (params: ProductFilterParams = {}): Promise<Product[]> => {
    const response: any = await API.get('/products', { params });
    // Handle either raw axios data property or customized Axios response shape
    const data = response.data || response;
    return data.products || [];
  },

  getById: async (productId: string): Promise<Product> => {
    const response: any = await API.get(`/products/${productId}`);
    const data = response.data || response;
    return data.product;
  }
};
