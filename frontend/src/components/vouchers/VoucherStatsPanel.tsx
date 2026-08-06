import { useEffect, useState, type FormEvent } from 'react';
import {
  BadgeDollarSign,
  CalendarDays,
  CircleDollarSign,
  RefreshCw,
  RotateCcw,
  Search,
  TicketCheck,
  Users,
} from 'lucide-react';
import SellerFilterBar from '../seller/SellerFilterBar';
import SellerPagination from '../seller/SellerPagination';
import SellerStatePanel from '../seller/SellerStatePanel';
import SellerTableViewport from '../seller/SellerTableViewport';
import { sellerService } from '../../services/sellerService';
import type {
  CouponStatsQuery,
  CouponStatsSortBy,
  CouponStatsStatus,
  CouponStatsSummary,
  SellerCouponStat,
  SellerCouponStatsData,
} from '../../types';

interface VoucherStatsPanelProps {
  refreshKey: number;
}

interface FilterDraft {
  from: string;
  to: string;
  status: CouponStatsStatus;
  search: string;
  sortBy: CouponStatsSortBy;
  sortOrder: 'asc' | 'desc';
}

const DEFAULT_FILTERS: FilterDraft = {
  from: '',
  to: '',
  status: 'all',
  search: '',
  sortBy: 'redemptions',
  sortOrder: 'desc',
};

const STATUS_LABELS: Record<Exclude<CouponStatsStatus, 'all'>, string> = {
  active: 'Đang hoạt động',
  scheduled: 'Sắp diễn ra',
  expired: 'Đã hết hạn',
  disabled: 'Đã tắt',
  exhausted: 'Hết lượt',
};

const STATUS_STYLES: Record<Exclude<CouponStatsStatus, 'all'>, string> = {
  active: 'bg-emerald-50 text-emerald-700',
  scheduled: 'bg-blue-50 text-blue-700',
  expired: 'bg-slate-100 text-slate-600',
  disabled: 'bg-amber-50 text-amber-700',
  exhausted: 'bg-rose-50 text-rose-700',
};

const formatNumber = (value: number) => new Intl.NumberFormat('vi-VN').format(Number(value || 0));

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDateTime = (value?: string | null) => {
  if (!value) return 'Chưa sử dụng';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa sử dụng';
  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const summaryCards = (summary: CouponStatsSummary) => [
  {
    label: 'Lượt sử dụng',
    value: formatNumber(summary.total_redemptions),
    detail: `${formatNumber(summary.total_coupons)} voucher`,
    icon: TicketCheck,
    iconClass: 'bg-blue-50 text-blue-700',
  },
  {
    label: 'Khách đã dùng',
    value: formatNumber(summary.unique_customers),
    detail: `${formatNumber(summary.delivered_orders)} đơn đã giao`,
    icon: Users,
    iconClass: 'bg-emerald-50 text-emerald-700',
  },
  {
    label: 'Tiền đã giảm',
    value: formatCurrency(summary.discount_amount),
    detail: `Giá trị ròng ${formatCurrency(summary.net_order_value)}`,
    icon: BadgeDollarSign,
    iconClass: 'bg-amber-50 text-amber-700',
  },
  {
    label: 'Doanh thu gắn voucher',
    value: formatCurrency(summary.attributed_order_value),
    detail: `Đã giao ${formatCurrency(summary.delivered_gross_revenue)}`,
    icon: CircleDollarSign,
    iconClass: 'bg-violet-50 text-violet-700',
  },
];

function UsageCell({ coupon }: { coupon: SellerCouponStat }) {
  if (coupon.usage_rate === null || coupon.usage_rate === undefined) {
    return (
      <div>
        <p className="text-sm font-bold text-on-surface">{formatNumber(coupon.redemptions)} lượt</p>
        <p className="mt-1 text-xs text-on-surface-variant">Không giới hạn</p>
      </div>
    );
  }

  const rate = Math.min(100, Math.max(0, Number(coupon.usage_rate)));
  return (
    <div className="min-w-36">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-bold text-on-surface">
          {formatNumber(coupon.redemptions)}/{formatNumber(coupon.usage_limit || 0)}
        </span>
        <span className="text-on-surface-variant">{formatNumber(rate)}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-container">
        <div
          className={`h-full rounded-full ${rate >= 100 ? 'bg-rose-500' : 'bg-primary'}`}
          style={{ width: `${rate}%` }}
        />
      </div>
    </div>
  );
}

export default function VoucherStatsPanel({ refreshKey }: VoucherStatsPanelProps) {
  const [draft, setDraft] = useState<FilterDraft>(DEFAULT_FILTERS);
  const [query, setQuery] = useState<CouponStatsQuery>({
    status: 'all',
    sortBy: 'redemptions',
    sortOrder: 'desc',
    page: 1,
    limit: 10,
  });
  const [data, setData] = useState<SellerCouponStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    sellerService
      .getCouponStats(query)
      .then((result) => {
        if (active) setData(result);
      })
      .catch((requestError: any) => {
        if (active) {
          setData(null);
          setError(
            requestError?.data?.message ||
              requestError?.message ||
              'Không tải được thống kê voucher.',
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [query, refreshKey]);

  const applyFilters = (event: FormEvent) => {
    event.preventDefault();
    if (Boolean(draft.from) !== Boolean(draft.to)) {
      setError('Vui lòng chọn đủ ngày bắt đầu và ngày kết thúc.');
      return;
    }
    if (draft.from && draft.to && draft.from > draft.to) {
      setError('Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.');
      return;
    }

    setQuery((current) => ({
      ...current,
      from: draft.from || undefined,
      to: draft.to || undefined,
      status: draft.status,
      search: draft.search.trim() || undefined,
      sortBy: draft.sortBy,
      sortOrder: draft.sortOrder,
      page: 1,
    }));
  };

  const resetFilters = () => {
    setDraft(DEFAULT_FILTERS);
    setQuery({
      status: 'all',
      sortBy: 'redemptions',
      sortOrder: 'desc',
      page: 1,
      limit: 10,
    });
  };

  const changePage = (page: number) => {
    setQuery((current) => ({ ...current, page }));
  };

  return (
    <section className="mb-7 overflow-hidden rounded-2xl border border-outline-variant/50 bg-surface-container-lowest shadow-sm">
      <div className="flex flex-col gap-3 border-b border-outline-variant/40 px-5 py-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-black text-on-surface">Hiệu quả voucher</h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Theo dõi lượt dùng, chi phí giảm giá và doanh thu tạo ra từ voucher.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-outline-variant px-3 text-sm font-bold text-on-surface-variant transition hover:border-primary/40 hover:text-primary"
          >
            <RotateCcw size={16} />
            Xóa bộ lọc
          </button>
          <button
            type="button"
            onClick={() => setQuery((current) => ({ ...current }))}
            disabled={loading}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-outline-variant px-3 text-sm font-bold text-on-surface-variant transition hover:border-primary/40 hover:text-primary disabled:opacity-60"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Làm mới
          </button>
        </div>
      </div>

      {data && (
        <>
          <div className="grid border-b border-outline-variant/40 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards(data.summary).map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className="flex min-w-0 items-start gap-3 border-b border-outline-variant/30 p-5 last:border-b-0 sm:[&:nth-child(odd)]:border-r xl:border-b-0 xl:border-r xl:last:border-r-0"
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${card.iconClass}`}
                  >
                    <Icon size={19} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase text-on-surface-variant">
                      {card.label}
                    </p>
                    <p
                      className="mt-1 truncate text-xl font-black text-on-surface"
                      title={card.value}
                    >
                      {card.value}
                    </p>
                    <p className="mt-1 truncate text-xs text-on-surface-variant">{card.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-2 border-b border-outline-variant/40 px-5 py-3 text-xs text-on-surface-variant">
            {Object.entries(data.summary.coupon_status).map(([status, count]) => (
              <span key={status}>
                {STATUS_LABELS[status as Exclude<CouponStatsStatus, 'all'>]}:{' '}
                <strong className="text-on-surface">{formatNumber(count)}</strong>
              </span>
            ))}
          </div>
        </>
      )}

      <SellerFilterBar
        onSubmit={applyFilters}
        className="lg:grid-cols-12"
        ariaLabel="Lọc hiệu quả voucher"
      >
        <label className="relative lg:col-span-3">
          <Search
            size={17}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
          />
          <input
            value={draft.search}
            onChange={(event) =>
              setDraft((current) => ({ ...current, search: event.target.value }))
            }
            placeholder="Tìm mã hoặc mô tả"
            className="h-11 w-full rounded-xl border border-outline-variant bg-surface-container pl-10 pr-3 text-sm outline-none focus:border-primary"
          />
        </label>

        <select
          aria-label="Trạng thái voucher"
          value={draft.status}
          onChange={(event) =>
            setDraft((current) => ({ ...current, status: event.target.value as CouponStatsStatus }))
          }
          className="h-11 rounded-xl border border-outline-variant bg-surface-container px-3 text-sm outline-none focus:border-primary lg:col-span-2"
        >
          <option value="all">Tất cả trạng thái</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <label className="relative lg:col-span-2">
          <CalendarDays
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
          />
          <input
            type="date"
            aria-label="Từ ngày"
            value={draft.from}
            onChange={(event) => setDraft((current) => ({ ...current, from: event.target.value }))}
            className="h-11 w-full rounded-xl border border-outline-variant bg-surface-container pl-10 pr-3 text-sm outline-none focus:border-primary"
          />
        </label>

        <label className="relative lg:col-span-2">
          <CalendarDays
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
          />
          <input
            type="date"
            aria-label="Đến ngày"
            value={draft.to}
            onChange={(event) => setDraft((current) => ({ ...current, to: event.target.value }))}
            className="h-11 w-full rounded-xl border border-outline-variant bg-surface-container pl-10 pr-3 text-sm outline-none focus:border-primary"
          />
        </label>

        <select
          aria-label="Sắp xếp thống kê"
          value={`${draft.sortBy}:${draft.sortOrder}`}
          onChange={(event) => {
            const [sortBy, sortOrder] = event.target.value.split(':') as [
              CouponStatsSortBy,
              'asc' | 'desc',
            ];
            setDraft((current) => ({ ...current, sortBy, sortOrder }));
          }}
          className="h-11 rounded-xl border border-outline-variant bg-surface-container px-3 text-sm outline-none focus:border-primary lg:col-span-2"
        >
          <option value="redemptions:desc">Lượt dùng nhiều nhất</option>
          <option value="attributed_order_value:desc">Doanh thu cao nhất</option>
          <option value="discount_amount:desc">Tiền giảm nhiều nhất</option>
          <option value="usage_rate:desc">Tỷ lệ dùng cao nhất</option>
          <option value="created_at:desc">Mới tạo gần đây</option>
          <option value="code:asc">Mã A đến Z</option>
        </select>

        <div className="flex gap-2 lg:col-span-1">
          <button
            type="submit"
            className="h-11 flex-1 rounded-xl bg-primary px-4 text-sm font-bold text-white transition hover:brightness-110"
          >
            Lọc
          </button>
        </div>
      </SellerFilterBar>

      {error && (
        <p className="mx-5 mt-5 rounded-xl bg-error/10 px-4 py-3 text-sm text-error">{error}</p>
      )}

      {loading && !data ? (
        <SellerStatePanel state="loading" title="Đang tải hiệu quả voucher" />
      ) : !data || data.coupons.length === 0 ? (
        <SellerStatePanel
          state="empty"
          icon={TicketCheck}
          title="Chưa có dữ liệu phù hợp"
          description="Thử thay đổi bộ lọc hoặc khoảng thời gian."
        />
      ) : (
        <>
          <SellerTableViewport minWidthClass="min-w-[940px]" ariaLabel="Hiệu quả voucher">
            <thead className="bg-surface-container text-xs uppercase text-on-surface-variant">
              <tr>
                <th className="px-5 py-3 font-bold">Voucher</th>
                <th className="px-4 py-3 font-bold">Trạng thái</th>
                <th className="px-4 py-3 font-bold">Mức sử dụng</th>
                <th className="px-4 py-3 text-right font-bold">Doanh thu gắn voucher</th>
                <th className="px-4 py-3 text-right font-bold">Tiền đã giảm</th>
                <th className="px-5 py-3 text-right font-bold">Lần dùng cuối</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {data.coupons.map((coupon) => (
                <tr key={coupon.id} className="transition hover:bg-surface-container/60">
                  <td className="px-5 py-4">
                    <p className="font-black text-on-surface">{coupon.code}</p>
                    <p className="mt-1 max-w-56 truncate text-xs text-on-surface-variant">
                      {coupon.description || 'Voucher của shop'}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-lg px-2 py-1 text-xs font-bold ${STATUS_STYLES[coupon.status]}`}
                    >
                      {STATUS_LABELS[coupon.status]}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <UsageCell coupon={coupon} />
                  </td>
                  <td className="px-4 py-4 text-right">
                    <p className="font-black text-on-surface">
                      {formatCurrency(coupon.attributed_order_value)}
                    </p>
                    <p className="mt-1 text-xs text-on-surface-variant">
                      {formatNumber(coupon.unique_customers)} khách
                    </p>
                  </td>
                  <td className="px-4 py-4 text-right font-bold text-amber-700">
                    {formatCurrency(coupon.discount_amount)}
                  </td>
                  <td className="px-5 py-4 text-right text-xs text-on-surface-variant">
                    {formatDateTime(coupon.last_used_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </SellerTableViewport>

          <SellerPagination
            page={data.pagination.page}
            totalPages={data.pagination.total_pages}
            total={data.pagination.total}
            label="voucher"
            loading={loading}
            onPageChange={changePage}
          />
        </>
      )}
    </section>
  );
}
