import { useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Banknote,
  BarChart3,
  Home,
  Inbox,
  Package,
  ReceiptText,
  RotateCcw,
  Settings,
  Star,
  Store,
  TicketPercent,
  Warehouse,
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { chatService } from '../../services/chatService';
import NotificationBell from '../common/NotificationBell';

const navSections = [
  {
    label: 'Vận hành',
    items: [
      { to: '/seller/dashboard', label: 'Tổng quan', icon: BarChart3 },
      { to: '/seller/products', label: 'Sản phẩm', icon: Package },
      { to: '/seller/inventory', label: 'Kho hàng', icon: Warehouse },
      { to: '/seller/orders', label: 'Đơn hàng', icon: ReceiptText },
      { to: '/seller/returns', label: 'Trả hàng', icon: RotateCcw },
    ],
  },
  {
    label: 'Kinh doanh',
    items: [
      { to: '/seller/finance', label: 'Tài chính', icon: Banknote },
      { to: '/seller/reviews', label: 'Đánh giá', icon: Star },
      { to: '/seller/vouchers', label: 'Voucher', icon: TicketPercent },
    ],
  },
  {
    label: 'Cửa hàng',
    items: [
      { to: '/seller/inbox', label: 'Hộp thư', icon: Inbox },
      { to: '/seller/profile', label: 'Hồ sơ shop', icon: Settings },
    ],
  },
];

export default function SellerLayout({ children }: { children: ReactNode }) {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    let mounted = true;
    const loadUnread = async () => {
      try {
        const chats = await chatService.getRecentChats();
        if (!mounted || !Array.isArray(chats)) return;
        setUnreadMessages(chats.reduce((sum, chat) => sum + Number(chat.unread_count || 0), 0));
      } catch {
        if (mounted) setUnreadMessages(0);
      }
    };

    const handleUnreadChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{ unread: number }>;
      setUnreadMessages(Number(customEvent.detail?.unread || 0));
    };

    void loadUnread();
    const timer = window.setInterval(() => void loadUnread(), 30_000);
    window.addEventListener('seller-unread-changed', handleUnreadChanged);
    return () => {
      mounted = false;
      window.clearInterval(timer);
      window.removeEventListener('seller-unread-changed', handleUnreadChanged);
    };
  }, []);

  return (
    <div className="min-h-screen overflow-x-clip bg-surface text-on-surface lg:flex">
      <aside className="border-r border-outline-variant/35 bg-surface-container-lowest lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:shrink-0">
        <div className="flex items-center gap-2 border-b border-outline-variant/35 px-4 py-4">
          <Link to="/seller/dashboard" className="flex min-w-0 flex-1 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-white shadow-sm shadow-primary/20">
              <Store size={20} />
            </span>
            <span className="min-w-0">
              <span className="block truncate whitespace-nowrap text-sm font-extrabold">
                Kênh người bán
              </span>
              <span className="block truncate whitespace-nowrap text-xs text-on-surface-variant">
                {auth?.user?.name || 'Seller'}
              </span>
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-0.5">
            {auth?.user && <NotificationBell user={auth.user} panelAlign="sidebar" />}
            <button
              type="button"
              onClick={() => navigate('/')}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-on-surface-variant transition hover:bg-surface-container hover:text-primary active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
              title="Về trang mua hàng"
            >
              <Home size={18} />
            </button>
          </div>
        </div>

        <nav className="flex gap-2 overflow-x-auto px-3 py-3 lg:block lg:space-y-5 lg:overflow-y-auto lg:py-5">
          {navSections.map((section) => (
            <div key={section.label} className="flex shrink-0 gap-2 lg:block lg:space-y-1">
              <p className="hidden px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-on-surface-variant/70 lg:block">
                {section.label}
              </p>
              {section.items.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `group relative flex min-h-10 shrink-0 items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 ${isActive ? 'bg-primary/8 text-primary' : 'text-on-surface-variant hover:bg-surface-container/80 hover:text-on-surface'}`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={`absolute inset-y-2 left-0 w-0.5 rounded-r-full bg-primary transition-opacity ${isActive ? 'opacity-100' : 'opacity-0'}`}
                      />
                      <Icon size={18} className="shrink-0" strokeWidth={1.9} />
                      <span className="whitespace-nowrap">{label}</span>
                      {to === '/seller/inbox' && unreadMessages > 0 && (
                        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-error px-1.5 text-[10px] font-black text-white">
                          {unreadMessages > 9 ? '9+' : unreadMessages}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>
      <main className="min-w-0 flex-1 overflow-x-clip">{children}</main>
    </div>
  );
}
