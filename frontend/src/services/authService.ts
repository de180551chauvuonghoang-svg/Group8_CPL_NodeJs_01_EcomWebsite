import API from './api';
import { User } from '../types';

export interface LoginResponse {
  token: string;
  user: User;
}

export const authService = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response: any = await API.post('/auth/login', { email, password });
    const data = response.data || response;
    if (response.token) {
      localStorage.setItem('ecom_token', response.token);
      localStorage.setItem('ecom_user', JSON.stringify(data.user));
    }
    return data;
  },

  register: async (name: string, email: string, password: string): Promise<any> => {
    return await API.post('/auth/register', { name, email, password });
  },

  logout: (): void => {
    localStorage.removeItem('ecom_token');
    localStorage.removeItem('ecom_user');
  },

  getCurrentUser: (): User | null => {
    const user = localStorage.getItem('ecom_user');
    return user ? JSON.parse(user) : null;
  },

  getProfile: async (): Promise<User> => {
    const response: any = await API.get('/auth/me');
    const user = response.data?.user || response.user;
    if (user) {
      localStorage.setItem('ecom_user', JSON.stringify(user));
    }
    return user;
  }
};
