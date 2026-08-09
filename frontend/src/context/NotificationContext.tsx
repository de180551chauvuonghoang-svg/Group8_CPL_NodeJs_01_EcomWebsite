import React, { createContext, useContext, useEffect, useState } from 'react';
import { notificationService, Notification } from '../services/notificationService';
import { AuthContext } from './AuthContext';
import { io, Socket } from 'socket.io-client';

interface NotificationContextProps {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  showPopup: Notification | null;
  closePopup: () => void;
}

export const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPopup, setShowPopup] = useState<Notification | null>(null);
  
  const auth = useContext(AuthContext);
  const { user, isAuthenticated, token } = auth || {};

  const fetchNotifications = async () => {
    if (!isAuthenticated) return;
    try {
      const data = await notificationService.getNotifications();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [isAuthenticated]);

  useEffect(() => {
    let socket: Socket;
    if (isAuthenticated && token) {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      socket = io(backendUrl, {
        auth: { token },
        withCredentials: true,
      });

      socket.on('receiveNotification', (newNotification: Notification) => {
        setNotifications(prev => [newNotification, ...prev]);
        setUnreadCount(prev => prev + 1);
        setShowPopup(newNotification);

        // Auto close toast after 5s
        setTimeout(() => setShowPopup(null), 5000);
      });
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, [isAuthenticated, token]);

  const markAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const closePopup = () => setShowPopup(null);

  return (
    <NotificationContext.Provider value={{
      notifications, unreadCount, markAsRead, markAllAsRead, fetchNotifications, showPopup, closePopup
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotifications must be used within NotificationProvider");
  return context;
};
