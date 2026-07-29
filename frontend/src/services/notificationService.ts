import API from './api';
import type { AppNotification, NotificationListData, NotificationType } from '../types';

export interface NotificationQuery {
  page?: number;
  limit?: number;
  type?: NotificationType | '';
  isRead?: boolean;
}

export const notificationService = {
  getNotifications: async (query: NotificationQuery = {}): Promise<NotificationListData> => {
    const response: any = await API.get('/notifications', { params: query });
    return response.data || response;
  },

  markRead: async (id: string): Promise<AppNotification> => {
    const response: any = await API.patch(`/notifications/${id}/read`);
    return response.data?.notification || response.notification;
  },

  markAllRead: async (): Promise<number> => {
    const response: any = await API.patch('/notifications/read-all');
    return Number(response.data?.updated ?? response.updated ?? 0);
  },
};
