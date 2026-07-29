import { ReactNode, useContext } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  ClipboardList,
  CreditCard,
  FileBarChart,
  FolderTree,
  History,
  Home,
  Image as ImageIcon,
  Mail,
  PackageSearch,
  ShieldCheck,
  Store,
  Tag,
  Ticket,
  Users
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';

const navItems = [
  { to: '/admin/dashboard', label: 'Tổng quan', icon: BarChart3 },
  { to: '/admin/orders', label: 'Đơn hàng', icon: ClipboardList },
  { to: '/admin/users', label: 'Người dùng', icon: Users },
  { to: '/admin/sellers', label: 'Người bán', icon: Store },
  { to: '/admin/categories', label: 'Danh mục', icon: FolderTree },
  { to: '/admin/brands', label: 'Thương hiệu', icon: Tag },
  { to: '/admin/inventory', label: 'Kho hàng', icon: PackageSearch },
  { to: '/admin/transactions', label: 'Giao dịch', icon: CreditCard },
  { to: '/admin/banners', label: 'Banner', icon: ImageIcon },
  { to: '/admin/coupons', label: 'Voucher', icon: Ticket },
  { to: '/admin/notifications', label: 'Email/Thông báo', icon: Mail },
  { to: '/admin/audit-logs', label: 'Nhật ký', icon: History },
  { to: '/admin/reports', label: 'Báo cáo', icon: FileBarChart },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-surface text-on-surface lg:flex">
      <aside className="border-r border-outline-variant/40 bg-surface-container-lowest lg:sticky lg:top-0 lg:h-screen lg:w-72">
        <div className="flex items-center justify-between gap-3 border-b border-outline-variant/40 px-5 py-4">
          <Link to="/admin/dashboard" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-white">
              <ShieldCheck size={20} />
            </div>
            <div>
              <p className="text-sm font-black">Quản trị hệ thống</p>
              <p className="text-xs text-on-surface-variant">{auth?.user?.name || 'Admin'}</p>
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
            </NavLink>
          ))}
        </nav>
      </aside>

      <section className="min-w-0 flex-1">{children}</section>
    </div>
  );
}
