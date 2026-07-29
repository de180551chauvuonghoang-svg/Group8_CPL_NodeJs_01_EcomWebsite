import { useCallback, useEffect, useState } from 'react';
import {
  CalendarRange,
  CircleDollarSign,
  RefreshCw,
  Search,
  TrendingDown,
  WalletCards,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import SellerFilterBar from '../components/seller/SellerFilterBar';
import SellerPageHeader from '../components/seller/SellerPageHeader';
import SellerPagination from '../components/seller/SellerPagination';
import SellerStatePanel from '../components/seller/SellerStatePanel';
import SellerTableViewport from '../components/seller/SellerTableViewport';
import { financeService } from '../services/financeService';
import type { FinanceSummary, FinanceTransaction, Pagination } from '../types';

const emptyPagination: Pagination = { page: 1, limit: 20, total: 0, total_pages: 1 };
const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value || 0));
const formatDate = (value: string) =>
  new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));

const getVietnamToday = () => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
};

const formatFilterDate = (value: string) => {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
};

const getErrorMessage = (error: unknown) => {
  const apiError = error as { message?: string; data?: { message?: string } };
  return apiError.data?.message || apiError.message || 'Không thể tải dữ liệu tài chính.';
};

export default function SellerFinance() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get('page') || 1));
  const type = (searchParams.get('type') || 'all') as 'all' | 'sale' | 'return';
  const search = searchParams.get('search') || '';
  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || '';
  const today = getVietnamToday();
  const [draft, setDraft] = useState({ search, from, to, type });
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [pagination, setPagination] = useState(emptyPagination);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const updateQuery = useCallback(
    (changes: Record<string, string | number | null>) => {
      const next = new URLSearchParams(searchParams);
      Object.entries(changes).forEach(([key, value]) => {
        if (value === null || value === '' || value === 'all') next.delete(key);
        else next.set(key, String(value));
      });
      setSearchParams(next);
    },
    [searchParams, setSearchParams],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const range = from && to ? { from, to } : {};
      const [summaryData, transactionData] = await Promise.all([
        financeService.getSummary(range),
        financeService.getTransactions({ ...range, page, limit: 20, status: type, search }),
      ]);
      setSummary(summaryData);
      setTransactions(transactionData.transactions || []);
      setPagination(transactionData.pagination || emptyPagination);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [from, page, search, to, type]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => setDraft({ search, from, to, type }), [from, search, to, type]);

  const submitFilters = () => {
    if ((draft.from && !draft.to) || (!draft.from && draft.to)) {
      setError('Vui lòng chọn đủ ngày bắt đầu và ngày kết thúc.');
      return;
    }
    if (draft.from && draft.to && draft.from > draft.to) {
      setError('Ngày bắt đầu không được sau ngày kết thúc.');
      return;
    }
    if ((draft.from && draft.from > today) || (draft.to && draft.to > today)) {
      setError('Khoảng thời gian không được nằm sau ngày hiện tại.');
      return;
    }
    setError('');
    updateQuery({
      search: draft.search.trim(),
      from: draft.from,
      to: draft.to,
      type: draft.type,
      page: 1,
    });
  };

  const appliedRangeLabel =
    from && to ? `${formatFilterDate(from)} - ${formatFilterDate(to)}` : 'Toàn bộ thời gian';

  const cards = summary
    ? [
        {
          label: 'Doanh thu gộp',
          value: formatCurrency(summary.gross_sales),
          icon: CircleDollarSign,
          tone: 'text-primary bg-primary/10',
        },
        {
          label: 'Giảm qua voucher',
          value: formatCurrency(summary.voucher_discount),
          icon: TrendingDown,
          tone: 'text-amber-700 bg-amber-50',
        },
        {
          label: 'Giá trị trả hàng',
          value: formatCurrency(summary.returned_amount),
          icon: RefreshCw,
          tone: 'text-rose-700 bg-rose-50',
        },
        {
          label: 'Doanh thu ước tính',
          value: formatCurrency(summary.net_revenue),
          icon: WalletCards,
          tone: 'text-emerald-700 bg-emerald-50',
        },
      ]
    : [];

  return (
    <div className="space-y-5">
      <SellerPageHeader
        icon={WalletCards}
        title="Tài chính cửa hàng"
        description="Theo dõi doanh thu đã ghi nhận, giảm giá và giá trị trả hàng. Dữ liệu hiện chỉ dùng để đối soát, chưa hỗ trợ rút tiền."
      />

      {error && (
        <div
          role="alert"
          className="rounded-md bg-error/10 px-4 py-3 text-sm font-semibold text-error"
        >
          {error}
        </div>
      )}

      <SellerFilterBar onSubmit={submitFilters} ariaLabel="Lọc dữ liệu tài chính">
        <div className="relative min-w-[14rem] flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
            size={17}
          />
          <input
            value={draft.search}
            onChange={(event) =>
              setDraft((current) => ({ ...current, search: event.target.value }))
            }
            placeholder="Tìm mã đơn, sản phẩm, khách hàng"
            className="h-10 w-full rounded-md border border-outline-variant bg-surface-container-lowest pl-10 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>
        <label className="flex h-10 items-center gap-2 rounded-md border border-outline-variant bg-surface-container-lowest px-3 text-sm">
          <CalendarRange size={16} className="text-on-surface-variant" />
          <input
            aria-label="Từ ngày"
            type="date"
            max={today}
            value={draft.from}
            onChange={(event) => setDraft((current) => ({ ...current, from: event.target.value }))}
            className="bg-transparent outline-none"
          />
        </label>
        <label className="flex h-10 items-center gap-2 rounded-md border border-outline-variant bg-surface-container-lowest px-3 text-sm">
          <CalendarRange size={16} className="text-on-surface-variant" />
          <input
            aria-label="Đến ngày"
            type="date"
            max={today}
            value={draft.to}
            onChange={(event) => setDraft((current) => ({ ...current, to: event.target.value }))}
            className="bg-transparent outline-none"
          />
        </label>
        <select
          value={draft.type}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              type: event.target.value as 'all' | 'sale' | 'return',
            }))
          }
          className="h-10 rounded-md border border-outline-variant bg-surface-container-lowest px-3 text-sm font-semibold outline-none focus:border-primary"
        >
          <option value="all">Tất cả giao dịch</option>
          <option value="sale">Bán hàng</option>
          <option value="return">Trả hàng</option>
        </select>
        <button
          type="submit"
          className="h-10 rounded-md bg-primary px-4 text-sm font-bold text-white"
        >
          Áp dụng
        </button>
      </SellerFilterBar>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-outline-variant/45 bg-surface-container-lowest px-4 py-3 text-sm">
        <span className="font-semibold text-on-surface-variant">Khoảng đang xem</span>
        <span className="font-black text-on-surface">{appliedRangeLabel}</span>
      </div>

      {loading && !summary ? (
        <section className="rounded-lg border border-outline-variant/45 bg-surface-container-lowest">
          <SellerStatePanel state="loading" />
        </section>
      ) : summary ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => {
              const Icon = card.icon;
              return (
                <article
                  key={card.label}
                  className="rounded-lg border border-outline-variant/40 bg-surface-container-lowest p-4"
                >
                  <span className={`grid h-9 w-9 place-items-center rounded-md ${card.tone}`}>
                    <Icon size={18} />
                  </span>
                  <p className="mt-4 text-xs font-semibold text-on-surface-variant">{card.label}</p>
                  <p className="mt-1 text-xl font-black tabular-nums text-on-surface">
                    {card.value}
                  </p>
                </article>
              );
            })}
          </section>

          <section className="grid gap-3 rounded-lg border border-outline-variant/40 bg-surface-container-lowest p-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-on-surface-variant">Đơn đã giao</p>
              <p className="mt-1 text-lg font-black tabular-nums">{summary.delivered_orders}</p>
            </div>
            <div>
              <p className="text-xs text-on-surface-variant">Đơn đang xử lý</p>
              <p className="mt-1 text-lg font-black tabular-nums">{summary.pending_orders}</p>
            </div>
            <div>
              <p className="text-xs text-on-surface-variant">Doanh thu chờ ghi nhận</p>
              <p className="mt-1 text-lg font-black tabular-nums">
                {formatCurrency(summary.pending_revenue)}
              </p>
            </div>
          </section>
        </>
      ) : null}

      <section className="overflow-hidden rounded-lg border border-outline-variant/45 bg-surface-container-lowest">
        <header className="border-b border-outline-variant/40 px-5 py-4">
          <h2 className="font-black">Lịch sử giao dịch</h2>
          <p className="mt-1 text-xs text-on-surface-variant">
            Dữ liệu chỉ đọc, sắp xếp mới nhất trước.
          </p>
        </header>
        {loading ? (
          <SellerStatePanel state="loading" compact />
        ) : transactions.length === 0 ? (
          <SellerStatePanel
            state="empty"
            icon={WalletCards}
            title="Chưa có giao dịch"
            description="Giao dịch từ đơn đã giao và trả hàng hoàn tất sẽ xuất hiện tại đây."
            compact
          />
        ) : (
          <SellerTableViewport>
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="bg-surface-container/70 text-xs text-on-surface-variant">
                <tr>
                  <th className="px-5 py-3 font-bold">Giao dịch</th>
                  <th className="px-5 py-3 font-bold">Khách hàng</th>
                  <th className="px-5 py-3 text-right font-bold">Giá trị gộp</th>
                  <th className="px-5 py-3 text-right font-bold">Giảm/hoàn</th>
                  <th className="px-5 py-3 text-right font-bold">Giá trị ròng</th>
                  <th className="px-5 py-3 font-bold">Ghi nhận</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/35">
                {transactions.map((transaction) => (
                  <tr
                    key={`${transaction.transaction_type}-${transaction.return_id || transaction.order_item_id}`}
                    className="transition hover:bg-surface-container/45"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span
                          className={`rounded-md px-2 py-1 text-[11px] font-bold ${transaction.transaction_type === 'sale' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}
                        >
                          {transaction.transaction_type === 'sale' ? 'Bán hàng' : 'Trả hàng'}
                        </span>
                        <div>
                          <p className="font-bold text-on-surface">{transaction.description}</p>
                          <p className="mt-1 font-mono text-xs text-on-surface-variant">
                            #{transaction.order_id}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-on-surface-variant">
                      {transaction.customer_name}
                    </td>
                    <td className="px-5 py-4 text-right font-semibold tabular-nums">
                      {formatCurrency(transaction.gross_amount)}
                    </td>
                    <td className="px-5 py-4 text-right font-semibold tabular-nums text-rose-600">
                      {transaction.discount_amount + transaction.return_amount > 0
                        ? `-${formatCurrency(transaction.discount_amount + transaction.return_amount)}`
                        : formatCurrency(0)}
                    </td>
                    <td
                      className={`px-5 py-4 text-right font-black tabular-nums ${transaction.net_amount < 0 ? 'text-rose-600' : 'text-emerald-700'}`}
                    >
                      {formatCurrency(transaction.net_amount)}
                    </td>
                    <td className="px-5 py-4 text-on-surface-variant">
                      {formatDate(transaction.recognized_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SellerTableViewport>
        )}
        <SellerPagination
          page={pagination.page}
          totalPages={pagination.total_pages}
          total={pagination.total}
          label="giao dịch"
          loading={loading}
          onPageChange={(nextPage) => updateQuery({ page: nextPage })}
        />
      </section>
    </div>
  );
}
