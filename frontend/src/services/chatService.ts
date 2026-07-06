import API from './api';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';

let socket: Socket | null = null;

/** Axios interceptor already unwraps axios response → body { status, data } */
const unwrap = <T>(res: { data?: T } & T): T => (res.data !== undefined ? res.data : res) as T;

export const chatService = {
  getRooms: async (): Promise<{ rooms: any[]; shop?: any }> => {
    const res = await API.get('/chat/rooms');
    return unwrap(res);
  },

  getMessages: async (roomId: string): Promise<any[]> => {
    const res = await API.get(`/chat/rooms/${roomId}/messages`);
    return unwrap<{ messages: any[] }>(res).messages;
  },

  sendMessage: async (payload: { roomId?: string; shopId?: string; messageText: string }): Promise<{ roomId: string; message: any }> => {
    const res = await API.post('/chat/messages', payload);
    return unwrap(res);
  },

  aiConsult: async (message: string): Promise<{ text: string; recommendedProductIds: string[] }> => {
    const res = await API.post('/chat/ai', { message });
    return unwrap(res);
  },

  initSocket: (): Socket => {
    if (!socket) {
      const token = localStorage.getItem('ecom_token');
      socket = io(SOCKET_URL, {
        withCredentials: true,
        transports: ['websocket', 'polling'],
        auth: token ? { token } : undefined
      });
    }
    return socket;
  },

  disconnectSocket: () => {
    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
      socket = null;
    }
  },

  joinRoom: (roomId: string) => {
    socket?.emit('join_room', roomId);
  },

  leaveRoom: (roomId: string) => {
    socket?.emit('leave_room', roomId);
  },

  onReceiveMessage: (callback: (message: any) => void) => {
    socket?.on('receive_message', callback);
  },

  offReceiveMessage: (callback?: (message: any) => void) => {
    if (callback) {
      socket?.off('receive_message', callback);
    } else {
      socket?.off('receive_message');
    }
  }
};
