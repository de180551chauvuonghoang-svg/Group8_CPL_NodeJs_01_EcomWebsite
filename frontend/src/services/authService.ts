import API from './api';
import { User } from '../types';

export interface LoginResponse {
  token: string;
  user: User;
}

export interface AuthResponse {
  success?: boolean;
  status?: string;
  message?: string;
  data?: Record<string, any>;
}

export const authService = {
  login: async (name: string, password: string): Promise<LoginResponse> => {
    const response: any = await API.post('/auth/login', { name, password });
    const data = response.data || response;
    const actualData = data.data || data;
    if (actualData.accessToken) {
      localStorage.setItem('ecom_token', actualData.accessToken);
      localStorage.setItem('ecom_user', JSON.stringify(actualData.user));
    }
    return { token: actualData.accessToken, user: actualData.user };
  },

  loginWithGoogle: async (idToken: string): Promise<LoginResponse> => {
    const response: any = await API.post('/auth/google', { idToken });
    const data = response.data || response;
    // Map response structure to expected format
    const actualData = data.data || data;
    if (actualData.accessToken) {
      localStorage.setItem('ecom_token', actualData.accessToken);
      localStorage.setItem('ecom_user', JSON.stringify(actualData.user));
    }
    return { token: actualData.accessToken, user: actualData.user };
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

  forgotPassword: async (email: string): Promise<AuthResponse> => {
    return await API.post<AuthResponse>('/auth/forgot-password', { email }) as any;
  },

  verifyOtp: async (email: string, otp: string): Promise<AuthResponse> => {
    return await API.post<AuthResponse>('/auth/verify-otp', { email, otp }) as any;
  },

  resetPassword: async (email: string, otp: string, newPassword: string): Promise<AuthResponse> => {
    return await API.post<AuthResponse>('/auth/reset-password', { email, otp, newPassword }) as any;
  },

  updateProfile: async (
    name: string, 
    phone: string, 
    avatarUrl?: string, 
    bio?: string, 
    country?: string, 
    timezone?: string
  ): Promise<User> => {
    const response = await API.put<{ status: string; data: { user: User } }>('/auth/update-profile', { 
      name, 
      phone_number: phone, 
      avatar_url: avatarUrl,
      bio,
      country,
      timezone
    }) as any;

    const user = response.data?.user;
    if (!user || !user.id || !user.name || !user.email) {
      throw new Error("Không nhận được dữ liệu phản hồi người dùng hợp lệ từ máy chủ.");
    }

    localStorage.setItem('ecom_user', JSON.stringify(user));
    return user;
  },

  uploadAvatar: async (base64Image: string): Promise<string> => {
    const response: any = await API.post('/auth/upload', { image: base64Image });
    const data = response.data || response;
    return data.secure_url;
  }
};
