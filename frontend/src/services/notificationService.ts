import API from './api';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  related_id: string | null;
  is_read: boolean;
  created_at: string;
}

export const notificationService = {
  getNotifications: async (): Promise<{ notifications: Notification[], unreadCount: number }> => {
    const response: any = await API.get('/notifications');
    return response.data?.data || response.data;
  },

  markAsRead: async (id: string): Promise<void> => {
    await API.put(`/notifications/${id}/read`);
  },

  markAllAsRead: async (): Promise<void> => {
    await API.put('/notifications/mark-all-read');
  }
};
