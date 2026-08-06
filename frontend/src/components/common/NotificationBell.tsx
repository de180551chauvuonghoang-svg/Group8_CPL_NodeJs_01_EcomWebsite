import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '../../services/notificationService';
import type { AppNotification, User } from '../../types';

const formatTime = (value: string) =>
  new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));

const getTarget = (notification: AppNotification, role?: User['role']) => {
  if (role === 'seller') {
    if (notification.type === 'chat_message') return '/seller/inbox';
    if (notification.type === 'new_review') return '/seller/reviews?replied=false';
    if (notification.type === 'return_requested') return '/seller/returns?status=requested';
    if (notification.type === 'low_stock' || notification.type === 'out_of_stock') {
      return '/seller/inventory';
    }
    if (notification.type === 'new_follower') return '/seller/dashboard';
    return '/seller/orders';
  }
  if (notification.type === 'chat_message') return '/';
  return '/profile';
};

interface NotificationBellProps {
  user: User;
  panelAlign?: 'left' | 'right' | 'sidebar';
}

export default function NotificationBell({ user, panelAlign = 'right' }: NotificationBellProps) {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await notificationService.getNotifications({ page: 1, limit: 8 });
      setNotifications(data.notifications || []);
      setUnreadCount(Number(data.unread_count || 0));
    } catch {
      if (!silent) {
        setNotifications([]);
        setUnreadCount(0);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load(true);
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [load, user.id]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const openNotification = async (notification: AppNotification) => {
    if (!notification.is_read) {
      try {
        await notificationService.markRead(notification.id);
        setNotifications((current) =>
          current.map((item) => (item.id === notification.id ? { ...item, is_read: true } : item)),
        );
        setUnreadCount((current) => Math.max(0, current - 1));
      } catch {
        // Navigation remains available even if marking as read fails.
      }
    }
    setOpen(false);
    navigate(getTarget(notification, user.role));
  };

  const markAllRead = async () => {
    try {
      await notificationService.markAllRead();
      setNotifications((current) => current.map((item) => ({ ...item, is_read: true })));
      setUnreadCount(0);
    } catch {
      // Keep current state and let the next poll retry.
    }
  };

  const panelPosition =
    panelAlign === 'sidebar'
      ? 'lg:fixed lg:inset-x-auto lg:left-4 lg:top-[4.5rem] lg:w-64 lg:max-w-none'
      : `sm:absolute sm:inset-x-auto sm:top-12 sm:w-[380px] sm:max-w-[calc(100vw-2rem)] ${
          panelAlign === 'left' ? 'sm:left-0' : 'sm:right-0'
        }`;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        title="Thông báo"
        aria-label={`Thông báo${unreadCount ? `, ${unreadCount} chưa đọc` : ''}`}
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant transition hover:bg-primary/8 hover:text-primary"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute right-0 top-0 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-error px-1 text-[9px] font-black leading-none text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <section
          className={`fixed inset-x-3 top-20 z-[120] max-h-[calc(100dvh-6rem)] overflow-hidden rounded-lg border border-outline-variant/40 bg-surface-container-lowest shadow-xl shadow-on-surface/10 ${panelPosition}`}
        >
          <header className="flex items-center justify-between gap-3 border-b border-outline-variant/40 px-4 py-3">
            <div>
              <h2 className="text-sm font-black">Thông báo</h2>
              <p className="text-xs text-on-surface-variant">{unreadCount} thông báo chưa đọc</p>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-primary"
              >
                <CheckCheck size={15} /> Đọc tất cả
              </button>
            )}
          </header>

          <div className="max-h-[min(62vh,440px)] overflow-y-auto overscroll-contain">
            {loading ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="animate-spin text-primary" size={22} />
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <Bell className="mx-auto text-on-surface-variant/40" size={28} />
                <p className="mt-3 text-sm font-bold">Chưa có thông báo</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  type="button"
                  key={notification.id}
                  onClick={() => void openNotification(notification)}
                  className={`block w-full border-b border-outline-variant/30 px-4 py-3 text-left transition hover:bg-surface-container ${notification.is_read ? '' : 'bg-primary/5'}`}
                >
                  <span className="flex items-start gap-3">
                    <span
                      className={`mt-1 h-2 w-2 shrink-0 rounded-full ${notification.is_read ? 'bg-transparent' : 'bg-primary'}`}
                    />
                    <span className="min-w-0">
                      <span className="line-clamp-2 block text-sm font-extrabold leading-5 text-on-surface">
                        {notification.title}
                      </span>
                      <span className="mt-1 line-clamp-2 block text-xs leading-5 text-on-surface-variant">
                        {notification.message}
                      </span>
                      <span className="mt-1 block text-[10px] font-semibold text-on-surface-variant">
                        {formatTime(notification.created_at)}
                      </span>
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </section>
      )}
    </div>
  );
}
