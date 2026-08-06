import { io, Socket } from 'socket.io-client';
import { ChatUnreadUpdate, Message } from '../types';

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL
  ? import.meta.env.VITE_API_BASE_URL.replace('/api', '')
  : 'http://localhost:5000';

class SocketService {
  private socket: Socket | null = null;

  connect() {
    if (this.socket) return;

    const token = localStorage.getItem('ecom_token');
    if (!token || token === 'mock_token_123456') {
      console.warn('[Socket Offline] Missing valid auth token.');
      return;
    }

    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: true,
      auth: { token },
    });

    this.socket.on('connect', () => {
      console.log('[Socket Connected] Connected to Socket Server');
    });

    this.socket.on('connect_error', (error) => {
      console.warn('[Socket Auth Error]', error.message);
    });

    this.socket.on('disconnect', () => {
      console.log('[Socket Disconnected] Disconnected from Socket Server');
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  sendMessage(receiverId: string, messageText: string): boolean {
    if (!this.socket || !this.socket.connected) {
      console.warn('[Socket Offline] Cannot send message, socket is not connected.');
      return false;
    }
    this.socket.emit('sendMessage', { receiverId, messageText });
    return true;
  }

  onReceiveMessage(callback: (msg: Message) => void) {
    if (!this.socket) return;
    this.socket.off('receiveMessage');
    this.socket.on('receiveMessage', callback);
  }

  offReceiveMessage() {
    this.socket?.off('receiveMessage');
  }

  onMessageSent(callback: (msg: Message) => void) {
    if (!this.socket) return;
    this.socket.off('messageSent');
    this.socket.on('messageSent', callback);
  }

  offMessageSent() {
    this.socket?.off('messageSent');
  }

  onChatUnreadUpdated(callback: (payload: ChatUnreadUpdate) => void) {
    if (!this.socket) return;
    this.socket.off('chatUnreadUpdated');
    this.socket.on('chatUnreadUpdated', callback);
  }

  offChatUnreadUpdated() {
    this.socket?.off('chatUnreadUpdated');
  }
}

export const socketService = new SocketService();
