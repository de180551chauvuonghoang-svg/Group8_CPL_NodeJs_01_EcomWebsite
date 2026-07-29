import API from './api';
import { Product } from '../types';

export interface ProductFilterParams {
  category?: string;
  search?: string;
}

const extractProducts = (response: any): Product[] => {
  const data = response?.data || response;
  return Array.isArray(data?.products) ? data.products : [];
};

export const productService = {
  getAll: async (params: ProductFilterParams = {}): Promise<Product[]> => {
    const response: any = await API.get('/products', { params });
    return extractProducts(response);
  },

  getById: async (productId: string): Promise<Product> => {
    const response: any = await API.get(`/products/${productId}`);
    const data = response?.data || response;
    return data.product;
  },

  getRelated: async (currentId: string, category: string): Promise<Product[]> => {
    const response: any = await API.get('/products', { params: { category } });
    return extractProducts(response)
      .filter((product) => product.id !== currentId)
      .slice(0, 4);
  },
};
