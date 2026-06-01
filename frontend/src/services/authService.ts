import API from './api';
import { User } from '../types';

export interface LoginResponse {
  token: string;
  user: User;
}

export const authService = {
  login: async (name: string, password: string): Promise<LoginResponse> => {
    const response: any = await API.post('/auth/login', { name, password });
    const data = response.data || response;
    if (data.accessToken) {
      localStorage.setItem('ecom_token', data.accessToken);
      localStorage.setItem('ecom_user', JSON.stringify(data.user));
    }
    return { token: data.accessToken, user: data.user };
  },

  register: async (name: string, email: string, password: string, phone: string): Promise<any> => {
    // Pass phone number to backend
    const response = await API.post('/auth/signup', { name, email, password, phonenumber: phone });
    return response;
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
  },

  forgotPassword: async (email: string): Promise<any> => {
    return await API.post('/auth/forgot-password', { email });
  },

  verifyOtp: async (email: string, otp: string): Promise<any> => {
    return await API.post('/auth/verify-otp', { email, otp });
  },

  resetPassword: async (email: string, otp: string, newPassword: string): Promise<any> => {
    return await API.post('/auth/reset-password', { email, otp, newPassword });
  }
};
