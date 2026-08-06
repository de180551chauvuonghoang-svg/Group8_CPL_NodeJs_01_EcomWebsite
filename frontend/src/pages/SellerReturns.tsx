import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Eye, Loader2, PackageCheck, RotateCcw, Search, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import SellerFilterBar from '../components/seller/SellerFilterBar';
import SellerPageHeader from '../components/seller/SellerPageHeader';
import SellerPagination from '../components/seller/SellerPagination';
import SellerStatePanel from '../components/seller/SellerStatePanel';
import SellerTableViewport from '../components/seller/SellerTableViewport';
import { returnService } from '../services/returnService';
import type { Pagination, ReturnRequest, ReturnStatus, SellerReturnDetail } from '../types';

const statusMeta: Record<ReturnStatus, { label: string; className: string }> = {
  requested: { label: 'Chờ xử lý', className: 'bg-amber-50 text-amber-700' },
  approved: { label: 'Đã chấp nhận', className: 'bg-blue-50 text-blue-700' },
  rejected: { label: 'Đã từ chối', className: 'bg-rose-50 text-rose-700' },
  received: { label: 'Đã nhận hàng', className: 'bg-emerald-50 text-emerald-700' },
};

const initialPagination: Pagination = { page: 1, limit: 20, total: 0, total_pages: 1 };
const formatCurrency = (value?: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value || 0));
const formatDate = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(new Date(value))
    : 'Chưa cập nhật';

const getErrorMessage = (error: unknown) => {
  const apiError = error as { message?: string; data?: { message?: string } };
  return apiError.data?.message || apiError.message || 'Không thể xử lý yêu cầu trả hàng.';
};

export default function SellerReturns() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get('page') || 1));
  const status = (searchParams.get('status') || 'all') as 'all' | ReturnStatus;
  const search = searchParams.get('search') || '';
  const [searchDraft, setSearchDraft] = useState(search);
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [pagination, setPagination] = useState(initialPagination);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<SellerReturnDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [sellerResponse, setSellerResponse] = useState('');

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
      const data = await returnService.getSellerReturns({ page, limit: 20, status, search });
      setReturns(data.returns || []);
      setPagination(data.pagination || initialPagination);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => setSearchDraft(search), [search]);

  const openDetail = async (returnId: string) => {
    setDetailLoading(true);
    setSelected(null);
    try {
      setSelected(await returnService.getSellerReturn(returnId));
    } catch (detailError) {
      setError(getErrorMessage(detailError));
    } finally {
      setDetailLoading(false);
    }
  };

  const changeStatus = async (nextStatus: 'accepted' | 'rejected' | 'item_returned') => {
    if (!selected) return;
    const response = sellerResponse.trim();
    if (nextStatus === 'rejected' && response.length < 3) {
      setError('Khi từ chối, vui lòng nhập lý do từ 3 ký tự.');
      return;
    }
    setActionLoading(true);
    setError('');
    try {
      await returnService.updateSellerReturn(selected.return.id, nextStatus, response || undefined);
      const refreshed = await returnService.getSellerReturn(selected.return.id);
      setSelected(refreshed);
      setSellerResponse('');
      await load();
    } catch (actionError) {
      setError(getErrorMessage(actionError));
    } finally {
      setActionLoading(false);
    }
  };

  const resultLabel = useMemo(
    () => `${pagination.total.toLocaleString('vi-VN')} yêu cầu`,
    [pagination.total],
  );

  return (
    <div className="space-y-5">
      <SellerPageHeader
        icon={RotateCcw}
        title="Yêu cầu trả hàng"
        description="Kiểm tra lý do, phản hồi khách hàng và xác nhận khi shop đã nhận lại sản phẩm."
      />

      {error && (
        <div
          role="alert"
          className="rounded-md bg-error/10 px-4 py-3 text-sm font-semibold text-error"
        >
          {error}
        </div>
      )}

      <SellerFilterBar
        onSubmit={() => updateQuery({ search: searchDraft.trim(), page: 1 })}
        ariaLabel="Lọc yêu cầu trả hàng"
      >
        <div className="relative min-w-[15rem] flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
            size={17}
          />
          <input
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            placeholder="Tìm mã đơn, sản phẩm hoặc khách hàng"
            className="h-10 w-full rounded-md border border-outline-variant bg-surface-container-lowest pl-10 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>
        <select
          value={status}
          onChange={(event) => updateQuery({ status: event.target.value, page: 1 })}
          className="h-10 rounded-md border border-outline-variant bg-surface-container-lowest px-3 text-sm font-semibold outline-none focus:border-primary"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="requested">Chờ xử lý</option>
          <option value="approved">Đã chấp nhận</option>
          <option value="rejected">Đã từ chối</option>
          <option value="received">Đã nhận hàng</option>
        </select>
        <button
          type="submit"
          className="h-10 rounded-md bg-primary px-4 text-sm font-bold text-white"
        >
          Lọc
        </button>
      </SellerFilterBar>

      <section className="overflow-hidden rounded-lg border border-outline-variant/45 bg-surface-container-lowest">
        <header className="border-b border-outline-variant/40 px-5 py-4">
          <h2 className="font-black text-on-surface">Danh sách trả hàng</h2>
          <p className="mt-1 text-xs text-on-surface-variant">{resultLabel}</p>
        </header>
        {loading ? (
          <SellerStatePanel state="loading" compact />
        ) : returns.length === 0 ? (
          <SellerStatePanel
            state="empty"
            icon={PackageCheck}
            title="Không có yêu cầu phù hợp"
            description="Các yêu cầu mới từ khách hàng sẽ xuất hiện tại đây."
            compact
          />
        ) : (
          <SellerTableViewport>
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-surface-container/70 text-xs text-on-surface-variant">
                <tr>
                  <th className="px-5 py-3 font-bold">Yêu cầu</th>
                  <th className="px-5 py-3 font-bold">Khách hàng</th>
                  <th className="px-5 py-3 font-bold">Số lượng</th>
                  <th className="px-5 py-3 font-bold">Trạng thái</th>
                  <th className="px-5 py-3 font-bold">Ngày gửi</th>
                  <th className="px-5 py-3 text-right font-bold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/35">
                {returns.map((item) => {
                  const meta = statusMeta[item.status];
                  return (
                    <tr key={item.id} className="transition hover:bg-surface-container/45">
                      <td className="px-5 py-4">
                        <p className="font-black text-on-surface">{item.product_name}</p>
                        <p className="mt-1 font-mono text-xs text-on-surface-variant">
                          #{item.order_id}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-on-surface">
                          {item.customer_name || 'Khách hàng'}
                        </p>
                        <p className="mt-1 text-xs text-on-surface-variant">
                          {item.customer_email}
                        </p>
                      </td>
                      <td className="px-5 py-4 font-bold tabular-nums">{item.quantity}</td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-md px-2.5 py-1 text-xs font-bold ${meta.className}`}
                        >
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-on-surface-variant">
                        {formatDate(item.requested_at)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => void openDetail(item.id)}
                          className="inline-flex h-9 items-center gap-2 rounded-md border border-outline-variant px-3 text-xs font-bold transition hover:border-primary/40 hover:text-primary"
                        >
                          <Eye size={15} /> Chi tiết
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </SellerTableViewport>
        )}
        <SellerPagination
          page={pagination.page}
          totalPages={pagination.total_pages}
          total={pagination.total}
          label="yêu cầu"
          loading={loading}
          onPageChange={(nextPage) => updateQuery({ page: nextPage })}
        />
      </section>

      {(detailLoading || selected) && (
        <div className="fixed inset-0 z-[130] flex justify-end bg-black/40">
          <aside className="h-full w-full max-w-xl overflow-y-auto bg-surface-container-lowest shadow-2xl">
            {detailLoading ? (
              <div className="grid h-full place-items-center">
                <Loader2 className="animate-spin text-primary" />
              </div>
            ) : selected ? (
              <>
                <header className="sticky top-0 z-10 flex items-center justify-between border-b border-outline-variant/40 bg-surface-container-lowest px-5 py-4">
                  <div>
                    <h2 className="font-black">Chi tiết trả hàng</h2>
                    <p className="mt-1 font-mono text-xs text-on-surface-variant">
                      #{selected.return.id}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    aria-label="Đóng"
                    className="grid h-9 w-9 place-items-center rounded-md hover:bg-surface-container"
                  >
                    <X size={18} />
                  </button>
                </header>
                <div className="space-y-6 p-5">
                  <section className="space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-black text-on-surface">{selected.return.product_name}</p>
                        <p className="mt-1 text-sm text-on-surface-variant">
                          {selected.return.customer_name}
                        </p>
                      </div>
                      <span
                        className={`rounded-md px-2.5 py-1 text-xs font-bold ${statusMeta[selected.return.status].className}`}
                      >
                        {statusMeta[selected.return.status].label}
                      </span>
                    </div>
                    <dl className="grid grid-cols-2 gap-3 rounded-lg bg-surface-container p-4 text-sm">
                      <div>
                        <dt className="text-xs text-on-surface-variant">Số lượng trả</dt>
                        <dd className="mt-1 font-bold">
                          {selected.return.quantity}/
                          {selected.return.purchased_quantity || selected.return.quantity}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-on-surface-variant">Giá trị</dt>
                        <dd className="mt-1 font-bold">
                          {formatCurrency(
                            (selected.return.unit_price || 0) * selected.return.quantity,
                          )}
                        </dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-xs text-on-surface-variant">Lý do</dt>
                        <dd className="mt-1 whitespace-pre-wrap leading-6">
                          {selected.return.reason}
                        </dd>
                      </div>
                    </dl>
                  </section>

                  {selected.return.status === 'requested' && (
                    <section className="space-y-3 border-t border-outline-variant/40 pt-5">
                      <label htmlFor="seller-return-response" className="text-sm font-bold">
                        Phản hồi cho khách hàng
                      </label>
                      <textarea
                        id="seller-return-response"
                        rows={4}
                        maxLength={1000}
                        value={sellerResponse}
                        onChange={(event) => setSellerResponse(event.target.value)}
                        placeholder="Ghi chú khi chấp nhận hoặc lý do khi từ chối..."
                        className="w-full resize-none rounded-md border border-outline-variant bg-surface-container p-3 text-sm outline-none focus:border-primary"
                      />
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => void changeStatus('rejected')}
                          className="inline-flex h-10 items-center gap-2 rounded-md border border-error/35 px-4 text-sm font-bold text-error hover:bg-error/5 disabled:opacity-50"
                        >
                          <X size={16} /> Từ chối
                        </button>
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => void changeStatus('accepted')}
                          className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-white hover:brightness-110 disabled:opacity-50"
                        >
                          <Check size={16} /> Chấp nhận
                        </button>
                      </div>
                    </section>
                  )}

                  {selected.return.status === 'approved' && (
                    <section className="border-t border-outline-variant/40 pt-5">
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => void changeStatus('item_returned')}
                        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-white hover:brightness-110 disabled:opacity-50"
                      >
                        {actionLoading ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <PackageCheck size={16} />
                        )}
                        Xác nhận đã nhận hàng
                      </button>
                    </section>
                  )}

                  <section className="border-t border-outline-variant/40 pt-5">
                    <h3 className="font-black">Lịch sử xử lý</h3>
                    <ol className="mt-4 space-y-4">
                      {selected.history.map((history) => (
                        <li key={history.id} className="relative border-l-2 border-primary/25 pl-4">
                          <span className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-primary" />
                          <p className="text-sm font-bold">
                            {statusMeta[history.new_status]?.label || history.new_status}
                          </p>
                          <p className="mt-1 text-xs text-on-surface-variant">
                            {formatDate(history.created_at)}
                          </p>
                          {history.note && (
                            <p className="mt-1 text-sm leading-6 text-on-surface-variant">
                              {history.note}
                            </p>
                          )}
                        </li>
                      ))}
                    </ol>
                  </section>
                </div>
              </>
            ) : null}
          </aside>
        </div>
      )}
    </div>
  );
}
