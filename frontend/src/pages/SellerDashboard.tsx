import { useState, useEffect, useContext } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Package, ShoppingCart, DollarSign, Store, MessageSquare, Star, ArrowRight, Loader2, TicketPercent, AlertTriangle } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { sellerService } from '../services/sellerService';
import { Link } from 'react-router-dom';

interface Stats {
  totalProducts: number;
  totalRevenue: number;
  totalOrders: number;
  pendingOrders?: number;
  lowStock?: number;
  topProducts?: { id: string; name: string; sold_qty: number; revenue: number }[];
}

const StatCard = ({ icon: Icon, label, value, color, delay, to }: {
  icon: any; label: string; value: string | number; color: string; delay: number; to?: string;
}) => {
  const content = (
    <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5 }}
    className="bg-surface-container-lowest/80 backdrop-blur-xl border border-outline-variant/30 rounded-3xl p-6 flex items-center gap-5 hover:border-primary/30 transition-all hover:shadow-lg group h-full"
  >
    <div className={`w-14 h-14 rounded-2xl ${color} flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform`}>
      <Icon size={26} className="text-white" />
    </div>
    <div>
      <p className="text-on-surface-variant text-sm font-medium">{label}</p>
      <p className="text-on-surface text-2xl font-black mt-0.5">{value}</p>
    </div>
    </motion.div>
  );

  return to ? <Link to={to}>{content}</Link> : content;
};

export default function SellerDashboard() {
  const authCtx = useContext(AuthContext);
  const user = authCtx?.user;
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchStats = async () => {
      try {
        const data = await sellerService.getDashboardStats();
        if (mounted) setStats(data);
      } catch {
        // If API fails, show zeros (seller might have no products yet)
        if (mounted) setStats({ totalProducts: 0, totalRevenue: 0, totalOrders: 0 });
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchStats();
    return () => { mounted = false; };
  }, []);

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

  return (
    <div className="min-h-screen bg-surface p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center shadow-lg">
              <Store size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-on-surface">Kênh Người Bán</h1>
              <p className="text-on-surface-variant">Chào mừng trở lại, <span className="text-primary font-semibold">{user?.name}</span>!</p>
            </div>
          </div>
        </motion.div>

        {/* Stats Bento Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 size={32} className="animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-8">
            <StatCard
              icon={Package} label="Tổng Sản Phẩm"
              value={stats?.totalProducts ?? 0}
              color="bg-gradient-to-br from-blue-500 to-blue-600" delay={0.1}
              to="/seller/products"
            />
            <StatCard
              icon={ShoppingCart} label="Đơn Hàng"
              value={stats?.totalOrders ?? 0}
              color="bg-gradient-to-br from-violet-500 to-violet-600" delay={0.2}
              to="/seller/orders"
            />
            <StatCard
              icon={DollarSign} label="Doanh Thu"
              value={formatCurrency(stats?.totalRevenue ?? 0)}
              color="bg-gradient-to-br from-emerald-500 to-emerald-600" delay={0.3}
            />
            <StatCard
              icon={TrendingUp} label="Cần Xử Lý"
              value={stats?.pendingOrders ?? 0}
              color="bg-gradient-to-br from-amber-500 to-orange-500" delay={0.4}
              to="/seller/orders?status=pending_fulfillment"
            />
            <StatCard
              icon={AlertTriangle} label="Sắp Hết Hàng"
              value={stats?.lowStock ?? 0}
              color="bg-gradient-to-br from-rose-500 to-red-500" delay={0.5}
              to="/seller/products?filter=low-stock"
            />
          </div>
        )}

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
        >
          {[
            {
              to: '/seller/products',
              icon: Package,
              title: 'Quản Lý Sản Phẩm',
              desc: 'Thêm, sửa và quản lý danh sách sản phẩm của bạn',
              color: 'from-blue-500 to-indigo-500'
            },
            {
              to: '/seller/orders',
              icon: ShoppingCart,
              title: 'Quản Lý Đơn Hàng',
              desc: 'Xem và xử lý các đơn hàng từ khách',
              color: 'from-violet-500 to-purple-500'
            },
            {
              to: '/seller/inbox',
              icon: MessageSquare,
              title: 'Hộp Thư',
              desc: 'Trả lời tin nhắn từ khách hàng',
              color: 'from-emerald-500 to-teal-500'
            },
            {
              to: '/seller/vouchers',
              icon: TicketPercent,
              title: 'Voucher Shop',
              desc: 'Tạo mã giảm giá riêng để kéo đơn cho shop',
              color: 'from-amber-500 to-orange-500'
            }
          ].map(({ to, icon: Icon, title, desc, color }) => (
            <Link to={to} key={to}>
              <motion.div
                whileHover={{ scale: 1.02, y: -4 }}
                whileTap={{ scale: 0.98 }}
                className="bg-surface-container-lowest/80 backdrop-blur-xl border border-outline-variant/30 rounded-3xl p-6 hover:border-primary/30 hover:shadow-xl transition-all cursor-pointer group h-full"
              >
                <div className={`w-12 h-12 bg-gradient-to-br ${color} rounded-2xl flex items-center justify-center mb-4 shadow-md group-hover:scale-110 transition-transform`}>
                  <Icon size={22} className="text-white" />
                </div>
                <h3 className="font-bold text-on-surface mb-1">{title}</h3>
                <p className="text-on-surface-variant text-sm leading-relaxed">{desc}</p>
                <div className="flex items-center gap-1 mt-3 text-primary text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Đi đến</span>
                  <ArrowRight size={14} />
                </div>
              </motion.div>
            </Link>
          ))}
        </motion.div>

        {/* Tips */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-6 bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 rounded-3xl p-5 flex items-start gap-3"
        >
          <Star size={20} className="text-primary shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-on-surface text-sm">Mẹo tăng doanh số</p>
            <p className="text-on-surface-variant text-sm mt-1">
              Thêm ảnh chất lượng cao và mô tả chi tiết cho sản phẩm để tăng tỷ lệ chuyển đổi lên tới <span className="text-primary font-bold">40%</span>. Phản hồi tin nhắn khách trong vòng 30 phút để được badge "Phản hồi nhanh"!
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
