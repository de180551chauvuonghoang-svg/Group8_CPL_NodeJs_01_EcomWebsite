import { ReactNode, useContext, useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { BarChart3, Home, Inbox, Package, ReceiptText, Settings, Store, TicketPercent } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { chatService } from '../../services/chatService';

const navItems = [
  { to: '/seller/dashboard', label: 'Tổng quan', icon: BarChart3 },
  { to: '/seller/products', label: 'Sản phẩm', icon: Package },
  { to: '/seller/orders', label: 'Đơn hàng', icon: ReceiptText },
  { to: '/seller/vouchers', label: 'Voucher', icon: TicketPercent },
  { to: '/seller/inbox', label: 'Hộp thư', icon: Inbox },
  { to: '/seller/profile', label: 'Hồ sơ shop', icon: Settings },
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

    loadUnread();
    const timer = window.setInterval(loadUnread, 30000);
    window.addEventListener('seller-unread-changed', handleUnreadChanged);

    return () => {
      mounted = false;
      window.clearInterval(timer);
      window.removeEventListener('seller-unread-changed', handleUnreadChanged);
    };
  }, []);

  return (
    <div className="min-h-screen bg-surface text-on-surface lg:flex">
      <aside className="border-r border-outline-variant/40 bg-surface-container-lowest lg:sticky lg:top-0 lg:h-screen lg:w-72">
        <div className="flex items-center justify-between gap-3 border-b border-outline-variant/40 px-5 py-4">
          <Link to="/seller/dashboard" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-white">
              <Store size={20} />
            </div>
            <div>
              <p className="text-sm font-black">Kênh người bán</p>
              <p className="text-xs text-on-surface-variant">{auth?.user?.name || 'Seller'}</p>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-outline-variant/60 text-on-surface-variant transition hover:border-primary/40 hover:text-primary"
            title="Về trang mua hàng"
          >
            <Home size={18} />
          </button>
        </div>

        <nav className="flex gap-2 overflow-x-auto px-4 py-3 lg:block lg:space-y-1 lg:overflow-visible">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  isActive
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`
              }
            >
              <Icon size={18} />
              <span>{label}</span>
              {to === '/seller/inbox' && unreadMessages > 0 && (
                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-error px-1.5 text-[10px] font-black text-white">
                  {unreadMessages > 9 ? '9+' : unreadMessages}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      <section className="min-w-0 flex-1">{children}</section>
    </div>
  );
}
