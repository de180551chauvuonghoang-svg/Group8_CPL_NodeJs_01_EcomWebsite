import API from './api';
import { ChatPartner, Message } from '../types';

export const chatService = {
  getRecentChats: async (): Promise<ChatPartner[]> => {
    const response: any = await API.get('/chat/recent');
    return response.data?.chats || response.chats || [];
  },

  getChatHistory: async (partnerId: string): Promise<Message[]> => {
    const response: any = await API.get(`/chat/history/${partnerId}`);
    return response.data?.history || response.history || [];
  },

  markChatAsRead: async (partnerId: string) => {
    const response: any = await API.post(`/chat/read/${partnerId}`);
    return response;
  },
};
