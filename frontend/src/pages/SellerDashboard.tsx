import { useContext } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  DollarSign,
  Loader2,
  MessageSquare,
  Package,
  PackageCheck,
  PackageX,
  RotateCcw,
  ShoppingCart,
  Star,
  Store,
  TicketPercent,
  TrendingUp,
  Truck,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import AnalyticsPeriodFilter from '../components/analytics/AnalyticsPeriodFilter';
import RevenueOrdersChart from '../components/analytics/RevenueOrdersChart';
import StatusStackedChart from '../components/analytics/StatusStackedChart';
import CountUpNumber from '../components/common/CountUpNumber';
import ProductRankingPanel from '../components/seller/dashboard/ProductRankingPanel';
import SellerPageHeader from '../components/seller/SellerPageHeader';
import { AuthContext } from '../context/AuthContext';
import type { SellerAnalyticsStatusCounts, SellerDashboardAnalytics } from '../types';
import { useSellerDashboard } from '../hooks/seller/useSellerDashboard';

const STATUS_ITEMS: {
  key: keyof SellerAnalyticsStatusCounts;
  label: string;
  icon: LucideIcon;
  color: string;
}[] = [
  { key: 'pending_fulfillment', label: 'Chờ xử lý', icon: Clock3, color: 'text-amber-600' },
  { key: 'ready_to_ship', label: 'Chờ lấy hàng', icon: PackageCheck, color: 'text-cyan-600' },
  { key: 'shipping', label: 'Đang giao', icon: Truck, color: 'text-blue-600' },
  { key: 'delivered', label: 'Đã giao', icon: PackageCheck, color: 'text-green-600' },
  { key: 'cancelled', label: 'Đã hủy', icon: XCircle, color: 'text-red-600' },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);

function StatCard({
  icon: Icon,
  label,
  value,
  formatter,
  iconClass,
  to,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  formatter?: (value: number) => string;
  iconClass: string;
  to?: string;
}) {
  const content = (
    <div className="group flex h-full items-center gap-4 rounded-lg border border-outline-variant/35 bg-surface-container-lowest p-5 transition duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_12px_28px_rgba(15,23,42,0.07)]">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md ${iconClass}`}
      >
        <Icon size={21} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-on-surface-variant">
          {label}
        </p>
        <CountUpNumber
          value={value}
          formatter={formatter}
          className="mt-1 block truncate text-xl font-extrabold tabular-nums text-on-surface"
        />
      </div>
    </div>
  );

  return to ? <Link to={to}>{content}</Link> : content;
}

function ActionCard({
  icon: Icon,
  label,
  value,
  description,
  to,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  description: string;
  to: string;
  tone: string;
}) {
  return (
    <Link
      to={to}
      className="group relative flex min-h-28 items-start gap-3 border-b border-outline-variant/35 p-4 transition duration-200 hover:bg-surface-container-low sm:border-r lg:[&:nth-child(3n)]:border-r-0"
    >
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${tone}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-bold text-on-surface">{label}</p>
          <CountUpNumber
            value={value}
            className="text-xl font-extrabold tabular-nums text-on-surface"
          />
        </div>
        <p className="mt-1 text-xs leading-5 text-on-surface-variant">{description}</p>
      </div>
      <ArrowRight
        size={15}
        className="mt-1 shrink-0 text-on-surface-variant transition group-hover:translate-x-0.5 group-hover:text-primary"
      />
    </Link>
  );
}

function AnalyticsKpis({ analytics }: { analytics: SellerDashboardAnalytics }) {
  const kpis: Array<{
    label: string;
    value: number;
    formatter?: (value: number) => string;
    helper: string;
    icon: LucideIcon;
    color: string;
  }> = [
    {
      label: 'Doanh thu đã giao',
      value: analytics.summary.gross_revenue,
      formatter: formatCurrency,
      helper: `${analytics.summary.delivered_orders} đơn giao thành công`,
      icon: CircleDollarSign,
      color: 'text-green-700 bg-green-500/10',
    },
    {
      label: 'Đơn phát sinh',
      value: analytics.summary.orders_created,
      helper: `${analytics.summary.units_ordered} sản phẩm được đặt`,
      icon: ShoppingCart,
      color: 'text-blue-700 bg-blue-500/10',
    },
    {
      label: 'Sản phẩm đã bán',
      value: analytics.summary.units_sold,
      helper: 'Chỉ tính sản phẩm đã giao',
      icon: Boxes,
      color: 'text-cyan-700 bg-cyan-500/10',
    },
    {
      label: 'Giá trị đơn trung bình',
      value: analytics.summary.average_delivered_order_value,
      formatter: formatCurrency,
      helper: 'Theo đơn đã giao thành công',
      icon: TrendingUp,
      color: 'text-amber-700 bg-amber-500/10',
    },
  ];

  return (
    <div className="grid border-b border-outline-variant/40 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map(({ label, value, formatter, helper, icon: Icon, color }, index) => (
        <div
          key={label}
          className={`flex gap-3 px-5 py-4 ${index > 0 ? 'xl:border-l xl:border-outline-variant/40' : ''}`}
        >
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${color}`}>
            <Icon size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-on-surface-variant">
              {label}
            </p>
            <CountUpNumber
              value={value}
              formatter={formatter}
              className="mt-1 block truncate text-lg font-extrabold tabular-nums text-on-surface"
            />
            <p className="mt-0.5 text-xs text-on-surface-variant">{helper}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SellerDashboard() {
  const authContext = useContext(AuthContext);
  const user = authContext?.user;
  const {
    stats,
    actionStats,
    analytics,
    period,
    fromDraft,
    toDraft,
    loadingStats,
    loadingActions,
    loadingAnalytics,
    analyticsError,
    periodLabel,
    setFromDraft,
    setToDraft,
    handlePeriodChange,
    handleApplyRange,
    handleResetRange,
    handleRefresh,
  } = useSellerDashboard();

  return (
    <div className="min-h-screen bg-surface px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
      <div className="mx-auto max-w-[1420px]">
        <SellerPageHeader
          icon={Store}
          eyebrow="Tổng quan"
          title="Điều hành cửa hàng"
          description={`Chào ${user?.name || 'seller'}, ưu tiên các việc cần xử lý trước khi xem báo cáo kinh doanh.`}
          actions={
            analytics ? (
              <div className="rounded-md bg-surface-container-low px-3 py-2 text-right ring-1 ring-outline-variant/35">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-on-surface-variant">
                  Khoảng đang xem
                </p>
                <p className="mt-0.5 text-sm font-bold text-on-surface">{periodLabel}</p>
              </div>
            ) : null
          }
        />

        <section className="mb-6 overflow-hidden rounded-lg border border-outline-variant/35 bg-surface-container-lowest shadow-[0_10px_30px_rgba(15,23,42,0.035)]">
          <div className="flex items-center justify-between gap-3 border-b border-outline-variant/40 px-5 py-4">
            <div>
              <h2 className="font-extrabold text-on-surface">Việc cần làm</h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                Các tác vụ đang ảnh hưởng trực tiếp đến vận hành shop.
              </p>
            </div>
            <span className="text-xs font-semibold text-on-surface-variant">
              Cập nhật theo dữ liệu hiện tại
            </span>
          </div>
          {loadingActions ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-28 animate-pulse border-b border-r border-outline-variant/30 p-4"
                >
                  <div className="h-4 w-28 rounded bg-surface-container-high" />
                  <div className="mt-3 h-3 w-40 rounded bg-surface-container" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3">
              <ActionCard
                icon={ClipboardList}
                label="Đơn cần xử lý"
                value={actionStats.ordersToProcess || stats.pendingOrders || 0}
                description="Đơn đang chờ shop chuẩn bị hàng."
                to="/seller/orders?status=pending_fulfillment"
                tone="bg-amber-500/10 text-amber-700"
              />
              <ActionCard
                icon={Clock3}
                label="Đơn xử lý trễ"
                value={actionStats.overdueOrders}
                description="Đơn chờ xử lý quá 24 giờ."
                to="/seller/orders?status=pending_fulfillment"
                tone="bg-red-500/10 text-red-700"
              />
              <ActionCard
                icon={MessageSquare}
                label="Tin chưa đọc"
                value={actionStats.unreadMessages}
                description="Tin nhắn customer đang chờ phản hồi."
                to="/seller/inbox"
                tone="bg-blue-500/10 text-blue-700"
              />
              <ActionCard
                icon={PackageX}
                label="Sản phẩm hết hàng"
                value={actionStats.outOfStockProducts}
                description="Sản phẩm đang hoạt động nhưng stock bằng 0."
                to="/seller/inventory"
                tone="bg-rose-500/10 text-rose-700"
              />
              <ActionCard
                icon={AlertTriangle}
                label="Sắp hết hàng"
                value={actionStats.lowStockProducts || stats.lowStock || 0}
                description="Stock đã chạm ngưỡng cảnh báo."
                to="/seller/inventory"
                tone="bg-orange-500/10 text-orange-700"
              />
              <ActionCard
                icon={Star}
                label="Review chưa phản hồi"
                value={actionStats.unrepliedReviews}
                description="Đánh giá mới cần shop trả lời."
                to="/seller/reviews?replied=false"
                tone="bg-green-500/10 text-green-700"
              />
              <ActionCard
                icon={RotateCcw}
                label="Yêu cầu trả hàng"
                value={actionStats.pendingReturns}
                description="Yêu cầu đổi trả đang chờ shop xử lý."
                to="/seller/returns?status=requested"
                tone="bg-violet-500/10 text-violet-700"
              />
            </div>
          )}
        </section>

        {loadingStats ? (
          <div className="mb-7 flex h-28 items-center justify-center">
            <Loader2 size={28} className="animate-spin text-primary" />
          </div>
        ) : (
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard
              icon={Package}
              label="Sản phẩm"
              value={stats.totalProducts}
              iconClass="bg-blue-500/10 text-blue-700"
              to="/seller/products"
            />
            <StatCard
              icon={ShoppingCart}
              label="Đơn hàng"
              value={stats.totalOrders}
              iconClass="bg-cyan-500/10 text-cyan-700"
              to="/seller/orders"
            />
            <StatCard
              icon={DollarSign}
              label="Doanh thu"
              value={stats.totalRevenue}
              formatter={formatCurrency}
              iconClass="bg-green-500/10 text-green-700"
            />
          </div>
        )}

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-lg border border-outline-variant/35 bg-surface-container-lowest shadow-[0_10px_30px_rgba(15,23,42,0.035)]"
        >
          <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5">
            <div>
              <h2 className="text-lg font-extrabold text-on-surface">Phân tích kinh doanh</h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                Số liệu được tổng hợp theo múi giờ Việt Nam và giá trị thực từ backend.
              </p>
            </div>
            <span className="rounded-md bg-green-500/10 px-2.5 py-1 text-xs font-bold text-green-700">
              Doanh thu từ đơn đã giao
            </span>
          </div>

          <AnalyticsPeriodFilter
            period={period}
            from={fromDraft}
            to={toDraft}
            loading={loadingAnalytics}
            onPeriodChange={handlePeriodChange}
            onFromChange={setFromDraft}
            onToChange={setToDraft}
            onApply={handleApplyRange}
            onReset={handleResetRange}
            onRefresh={handleRefresh}
          />

          {analyticsError && (
            <div className="mx-5 mt-4 flex items-start gap-2 rounded-md border border-error/25 bg-error/10 px-4 py-3 text-sm text-error">
              <AlertTriangle size={17} className="mt-0.5 shrink-0" />
              <span>{analyticsError}</span>
            </div>
          )}

          {loadingAnalytics && !analytics ? (
            <div className="flex h-96 items-center justify-center">
              <Loader2 size={30} className="animate-spin text-primary" />
            </div>
          ) : analytics ? (
            <>
              <AnalyticsKpis analytics={analytics} />

              <div className="grid gap-8 p-5 2xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
                <RevenueOrdersChart series={analytics.series} />
                <StatusStackedChart series={analytics.series} />
              </div>

              <div className="border-t border-outline-variant/40 px-5 py-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="font-black text-on-surface">Trạng thái hiện tại</h3>
                  <Link
                    to="/seller/orders"
                    className="flex items-center gap-1 text-sm font-bold text-primary hover:underline"
                  >
                    Xem đơn hàng <ArrowRight size={14} />
                  </Link>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                  {STATUS_ITEMS.map(({ key, label, icon: Icon, color }) => (
                    <div
                      key={key}
                      className="flex items-center justify-between rounded-md bg-surface-container px-3 py-2.5"
                    >
                      <span className="flex items-center gap-2 text-sm font-semibold text-on-surface-variant">
                        <Icon size={16} className={color} /> {label}
                      </span>
                      <CountUpNumber
                        value={analytics.summary.current_status[key]}
                        className="font-extrabold tabular-nums text-on-surface"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </motion.section>

        <div className="mt-7">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-black text-on-surface">Thao tác nhanh</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  to: '/seller/products',
                  icon: Package,
                  title: 'Quản lý sản phẩm',
                  description: 'Thêm sản phẩm và cập nhật tồn kho.',
                },
                {
                  to: '/seller/orders',
                  icon: ShoppingCart,
                  title: 'Xử lý đơn hàng',
                  description: 'Xác nhận, giao hàng và theo dõi trạng thái.',
                },
                {
                  to: '/seller/inbox',
                  icon: MessageSquare,
                  title: 'Hộp thư',
                  description: 'Trao đổi trực tiếp với khách hàng.',
                },
                {
                  to: '/seller/vouchers',
                  icon: TicketPercent,
                  title: 'Voucher shop',
                  description: 'Tạo và quản lý chương trình giảm giá.',
                },
              ].map(({ to, icon: Icon, title, description }) => (
                <Link
                  key={to}
                  to={to}
                  className="group flex items-center gap-4 rounded-lg border border-outline-variant/40 bg-surface-container-lowest p-4 transition hover:border-primary/35 hover:shadow-sm"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon size={19} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-on-surface">{title}</h3>
                    <p className="mt-0.5 text-sm text-on-surface-variant">{description}</p>
                  </div>
                  <ArrowRight
                    size={17}
                    className="text-on-surface-variant transition group-hover:translate-x-0.5 group-hover:text-primary"
                  />
                </Link>
              ))}
            </div>
          </section>
        </div>

        <div className="mt-7 grid gap-5 xl:grid-cols-2">
          <ProductRankingPanel
            title="Sản phẩm bán chạy"
            description="Xếp hạng theo số lượng sản phẩm đã giao thành công."
            icon={TrendingUp}
            emptyText="Chưa có sản phẩm đã giao thành công."
            products={(stats.topProducts || []).map((product) => ({
              id: product.id,
              name: product.name,
              imageUrl: product.image_url,
              primaryMetric: `${product.sold_qty.toLocaleString('vi-VN')} đã bán`,
              secondaryMetric: formatCurrency(product.revenue),
            }))}
          />
          <ProductRankingPanel
            title="Sản phẩm được đánh giá cao"
            description="Xếp hạng từ điểm đánh giá thật của khách đã mua hàng."
            icon={Star}
            emptyText="Chưa có sản phẩm nhận được đánh giá."
            products={(stats.topRatedProducts || []).map((product) => ({
              id: product.id,
              name: product.name,
              imageUrl: product.image_url,
              rating: Number(product.rating || 0),
              secondaryMetric: `${product.reviews_count.toLocaleString('vi-VN')} đánh giá`,
            }))}
          />
        </div>
      </div>
    </div>
  );
}
