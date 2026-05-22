import API from './api.js';

export const productService = {
  getAll: async (params = {}) => {
    const data = await API.get('/products', { params });
    return data.data.products;
  },

  getById: async (productId) => {
    const data = await API.get(`/products/${productId}`);
    return data.data.product;
  }
};
