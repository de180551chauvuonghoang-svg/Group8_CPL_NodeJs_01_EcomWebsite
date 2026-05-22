import API from './api.js';

export const authService = {
  login: async (email, password) => {
    const data = await API.post('/auth/login', { email, password });
    if (data.token) {
      localStorage.setItem('ecom_token', data.token);
      localStorage.setItem('ecom_user', JSON.stringify(data.data.user));
    }
    return data.data;
  },

  register: async (name, email, password) => {
    return await API.post('/auth/register', { name, email, password });
  },

  logout: () => {
    localStorage.removeItem('ecom_token');
    localStorage.removeItem('ecom_user');
  },

  getCurrentUser: () => {
    const user = localStorage.getItem('ecom_user');
    return user ? JSON.parse(user) : null;
  },

  getProfile: async () => {
    const data = await API.get('/auth/me');
    if (data.data?.user) {
      localStorage.setItem('ecom_user', JSON.stringify(data.data.user));
    }
    return data.data?.user;
  }
};
