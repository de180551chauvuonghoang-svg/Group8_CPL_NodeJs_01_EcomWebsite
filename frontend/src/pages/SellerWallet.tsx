import { useMemo } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarRange,
  CircleDollarSign,
  Clock3,
  Landmark,
  Loader2,
  RotateCcw,
  ShieldCheck,
  WalletCards,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import SellerConfirmDialog from '../components/seller/SellerConfirmDialog';
import SellerFilterBar from '../components/seller/SellerFilterBar';
import SellerPageHeader from '../components/seller/SellerPageHeader';
import SellerPagination from '../components/seller/SellerPagination';
import SellerStatePanel from '../components/seller/SellerStatePanel';
import SellerTableViewport from '../components/seller/SellerTableViewport';
import SellerTabs from '../components/seller/SellerTabs';
import type { WalletTransactionFilter, WithdrawalStatus, WithdrawalStatusFilter } from '../types';
import { useSellerWallet } from '../hooks/seller/useSellerWallet';

const TRANSACTION_TYPES: { value: WalletTransactionFilter; label: string }[] = [
  { value: 'all', label: 'Tất cả biến động' },
  { value: 'sale_pending', label: 'Doanh thu chờ đối soát' },
  { value: 'sale_released', label: 'Doanh thu khả dụng' },
  { value: 'sale_reversed', label: 'Hoàn trả doanh thu' },
  { value: 'withdrawal_hold', label: 'Tạm giữ rút tiền' },
  { value: 'withdrawal_approved', label: 'Rút tiền thành công' },
  { value: 'withdrawal_rejected', label: 'Yêu cầu bị từ chối' },
  { value: 'withdrawal_cancelled', label: 'Yêu cầu đã hủy' },
];

const WITHDRAWAL_STATUS: { value: WithdrawalStatusFilter; label: string }[] = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'pending', label: 'Chờ xử lý' },
  { value: 'approved', label: 'Đã duyệt' },
  { value: 'rejected', label: 'Từ chối' },
  { value: 'cancelled', label: 'Đã hủy' },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDate = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(new Date(value))
    : '-';

const statusLabel: Record<WithdrawalStatus, string> = {
  pending: 'Chờ xử lý',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
  cancelled: 'Đã hủy',
};

const statusClass: Record<WithdrawalStatus, string> = {
  pending: 'bg-warning/10 text-warning',
  approved: 'bg-success/10 text-success',
  rejected: 'bg-error/10 text-error',
  cancelled: 'bg-surface-container-high text-on-surface-variant',
};

export default function SellerWallet() {
  const {
    overview,
    overviewLoading,
    overviewError,
    tab,
    withdrawals,
    withdrawalStatus,
    withdrawalPagination,
    withdrawalsLoading,
    transactions,
    transactionPagination,
    transactionsLoading,
    transactionDraft,
    listError,
    amount,
    sellerNote,
    formError,
    submitting,
    cancelTarget,
    cancelling,
    hasBankInfo,
    setTab,
    setWithdrawalStatus,
    setWithdrawalPage,
    setTransactionPage,
    setTransactionDraft,
    setAmount,
    setSellerNote,
    setFormError,
    setCancelTarget,
    createWithdrawal,
    cancelWithdrawal,
    applyTransactionFilters,
  } = useSellerWallet();

  const balanceCards = useMemo(
    () =>
      overview
        ? [
            {
              label: 'Có thể rút',
              value: overview.wallet.availableBalance,
              icon: CircleDollarSign,
              tone: 'bg-success/10 text-success',
            },
            {
              label: 'Chờ đối soát',
              value: overview.wallet.pendingBalance,
              icon: Clock3,
              tone: 'bg-warning/10 text-warning',
            },
            {
              label: 'Đang chờ rút',
              value: overview.wallet.withdrawalHoldBalance,
              icon: ShieldCheck,
              tone: 'bg-primary/10 text-primary',
            },
            {
              label: 'Đã rút',
              value: overview.wallet.withdrawnTotal,
              icon: ArrowUpRight,
              tone: 'bg-cyan-500/10 text-cyan-700',
            },
          ]
        : [],
    [overview],
  );

  return (
    <div className="min-h-screen bg-surface p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <SellerPageHeader
          icon={WalletCards}
          eyebrow="Tài chính"
          title="Ví và rút tiền"
          description="Theo dõi doanh thu khả dụng, tiền chờ đối soát và yêu cầu rút về tài khoản ngân hàng."
          actions={
            <Link
              to="/seller/bank"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-outline-variant bg-surface-container-lowest px-4 text-sm font-bold text-on-surface transition hover:border-primary/40 hover:text-primary"
            >
              <Landmark size={17} /> Thông tin ngân hàng
            </Link>
          }
        />

        {overviewError && (
          <div className="mb-5 rounded-md bg-error/10 px-4 py-3 text-sm font-semibold text-error">
            {overviewError}
          </div>
        )}

        {overviewLoading && !overview ? (
          <section className="rounded-lg border border-outline-variant/40 bg-surface-container-lowest">
            <SellerStatePanel state="loading" title="Đang tải ví của shop" />
          </section>
        ) : overview ? (
          <>
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {balanceCards.map(({ label, value, icon: Icon, tone }) => (
                <article
                  key={label}
                  className="rounded-lg border border-outline-variant/40 bg-surface-container-lowest p-4"
                >
                  <span className={`flex h-9 w-9 items-center justify-center rounded-md ${tone}`}>
                    <Icon size={18} />
                  </span>
                  <p className="mt-4 text-xs font-semibold text-on-surface-variant">{label}</p>
                  <p className="mt-1 text-xl font-black tabular-nums text-on-surface">
                    {formatCurrency(value)}
                  </p>
                </article>
              ))}
            </section>

            <section className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
              <div className="rounded-lg border border-outline-variant/40 bg-surface-container-lowest p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-black text-on-surface">Tài khoản nhận tiền</h2>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      Yêu cầu được chuyển về đúng tài khoản đã xác minh trong hồ sơ shop.
                    </p>
                  </div>
                  <Landmark size={22} className="shrink-0 text-primary" />
                </div>
                {hasBankInfo ? (
                  <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
                    <BankRow label="Ngân hàng" value={overview.bankInfo.bankName || '-'} />
                    <BankRow label="Chủ tài khoản" value={overview.bankInfo.accountHolder || '-'} />
                    <BankRow
                      label="Số tài khoản"
                      value={overview.bankInfo.maskedAccountNo || '-'}
                    />
                  </dl>
                ) : (
                  <div className="mt-5 rounded-md border border-warning/30 bg-warning/10 p-4 text-sm">
                    <p className="font-bold text-on-surface">Chưa có tài khoản nhận tiền</p>
                    <p className="mt-1 text-on-surface-variant">
                      Bổ sung ngân hàng, số tài khoản và tên chủ tài khoản trước khi rút tiền.
                    </p>
                    <Link
                      to="/seller/bank"
                      className="mt-3 inline-flex font-bold text-primary hover:underline"
                    >
                      Cập nhật ngân hàng
                    </Link>
                  </div>
                )}
                <p className="mt-5 border-t border-outline-variant/35 pt-4 text-xs leading-5 text-on-surface-variant">
                  Doanh thu được mở khóa sau {overview.holdDays} ngày nếu đơn không có yêu cầu trả
                  hàng.
                </p>
              </div>

              <form
                onSubmit={createWithdrawal}
                className="rounded-lg border border-outline-variant/40 bg-surface-container-lowest p-5"
              >
                <h2 className="font-black text-on-surface">Tạo yêu cầu rút tiền</h2>
                <p className="mt-1 text-sm text-on-surface-variant">
                  Tối thiểu {formatCurrency(overview.minimumWithdrawalAmount)} mỗi yêu cầu.
                </p>
                <label className="mt-4 block">
                  <span className="mb-1.5 block text-sm font-bold">Số tiền *</span>
                  <input
                    value={amount}
                    onChange={(event) => {
                      setAmount(event.target.value.replace(/\D/g, '').slice(0, 15));
                      setFormError('');
                    }}
                    inputMode="numeric"
                    placeholder="Nhập số tiền cần rút"
                    className="h-11 w-full rounded-md border border-outline-variant bg-surface-container px-3 text-sm outline-none focus:border-primary"
                  />
                </label>
                <label className="mt-3 block">
                  <span className="mb-1.5 block text-sm font-bold">Ghi chú</span>
                  <textarea
                    value={sellerNote}
                    onChange={(event) => {
                      setSellerNote(event.target.value.slice(0, 500));
                      setFormError('');
                    }}
                    rows={3}
                    placeholder="Nội dung cần lưu ý cho yêu cầu này"
                    className="w-full rounded-md border border-outline-variant bg-surface-container px-3 py-2.5 text-sm outline-none focus:border-primary"
                  />
                  <span className="mt-1 block text-right text-xs text-on-surface-variant">
                    {sellerNote.length}/500
                  </span>
                </label>
                {formError && <p className="mt-3 text-sm font-semibold text-error">{formError}</p>}
                <button
                  type="submit"
                  disabled={submitting || !hasBankInfo || overview.wallet.availableBalance <= 0}
                  className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-white transition hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 size={17} className="animate-spin" />
                  ) : (
                    <ArrowUpRight size={17} />
                  )}
                  {submitting ? 'Đang gửi yêu cầu...' : 'Gửi yêu cầu rút tiền'}
                </button>
              </form>
            </section>
          </>
        ) : null}

        <section className="mt-6 overflow-hidden rounded-lg border border-outline-variant/40 bg-surface-container-lowest">
          <div className="px-5 pt-5">
            <SellerTabs
              value={tab}
              onChange={setTab}
              ariaLabel="Dữ liệu ví shop"
              tabs={[
                { value: 'withdrawals', label: 'Yêu cầu rút tiền', icon: ArrowUpRight },
                { value: 'transactions', label: 'Lịch sử ví', icon: RotateCcw },
              ]}
            />
          </div>

          {tab === 'withdrawals' ? (
            <>
              <SellerFilterBar
                ariaLabel="Lọc yêu cầu rút tiền"
                className="sm:grid-cols-[minmax(0,320px)_auto]"
              >
                <select
                  value={withdrawalStatus}
                  onChange={(event) => {
                    setWithdrawalStatus(event.target.value as WithdrawalStatusFilter);
                    setWithdrawalPage(1);
                  }}
                  className="h-10 rounded-md border border-outline-variant bg-surface-container-lowest px-3 text-sm font-semibold outline-none focus:border-primary"
                >
                  {WITHDRAWAL_STATUS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </SellerFilterBar>
              {listError && <ListError message={listError} />}
              {withdrawalsLoading ? (
                <SellerStatePanel state="loading" compact />
              ) : withdrawals.length === 0 ? (
                <SellerStatePanel
                  state="empty"
                  icon={ArrowUpRight}
                  title="Chưa có yêu cầu rút tiền"
                  description="Yêu cầu mới sẽ xuất hiện tại đây để bạn theo dõi trạng thái."
                  compact
                />
              ) : (
                <SellerTableViewport ariaLabel="Danh sách yêu cầu rút tiền">
                  <thead className="bg-surface-container/70 text-xs text-on-surface-variant">
                    <tr>
                      <th className="px-5 py-3 font-bold">Yêu cầu</th>
                      <th className="px-5 py-3 font-bold">Tài khoản nhận</th>
                      <th className="px-5 py-3 font-bold">Trạng thái</th>
                      <th className="px-5 py-3 font-bold">Xử lý</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/35">
                    {withdrawals.map((withdrawal) => (
                      <tr key={withdrawal.id} className="hover:bg-surface-container/40">
                        <td className="px-5 py-4">
                          <p className="font-black tabular-nums text-on-surface">
                            {formatCurrency(withdrawal.amount)}
                          </p>
                          <p className="mt-1 text-xs text-on-surface-variant">
                            {formatDate(withdrawal.requestedAt)}
                          </p>
                          {withdrawal.sellerNote && (
                            <p className="mt-2 max-w-sm text-sm text-on-surface-variant">
                              {withdrawal.sellerNote}
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-4 text-sm">
                          <p className="font-bold text-on-surface">{withdrawal.bankName}</p>
                          <p className="mt-1 text-on-surface-variant">
                            {withdrawal.maskedAccountNo} · {withdrawal.accountHolder}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`rounded-md px-2.5 py-1 text-xs font-bold ${statusClass[withdrawal.status]}`}
                          >
                            {statusLabel[withdrawal.status]}
                          </span>
                          {withdrawal.adminNote && (
                            <p className="mt-2 max-w-xs text-xs text-on-surface-variant">
                              {withdrawal.adminNote}
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {withdrawal.status === 'pending' ? (
                            <button
                              type="button"
                              onClick={() => setCancelTarget(withdrawal)}
                              className="h-9 rounded-md border border-error/35 px-3 text-xs font-bold text-error transition hover:bg-error/10"
                            >
                              Hủy yêu cầu
                            </button>
                          ) : (
                            <span className="text-xs text-on-surface-variant">
                              {withdrawal.processedAt ? formatDate(withdrawal.processedAt) : '-'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </SellerTableViewport>
              )}
              <SellerPagination
                page={withdrawalPagination.page}
                totalPages={withdrawalPagination.total_pages}
                total={withdrawalPagination.total}
                label="yêu cầu"
                loading={withdrawalsLoading}
                onPageChange={setWithdrawalPage}
              />
            </>
          ) : (
            <>
              <SellerFilterBar
                onSubmit={applyTransactionFilters}
                ariaLabel="Lọc lịch sử ví"
                className="lg:grid-cols-[1fr_1fr_1fr_auto]"
              >
                <select
                  value={transactionDraft.type}
                  onChange={(event) =>
                    setTransactionDraft((current) => ({
                      ...current,
                      type: event.target.value as WalletTransactionFilter,
                    }))
                  }
                  className="h-10 rounded-md border border-outline-variant bg-surface-container-lowest px-3 text-sm font-semibold outline-none focus:border-primary"
                >
                  {TRANSACTION_TYPES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <DateField
                  label="Từ ngày"
                  value={transactionDraft.from}
                  onChange={(value) =>
                    setTransactionDraft((current) => ({ ...current, from: value }))
                  }
                />
                <DateField
                  label="Đến ngày"
                  value={transactionDraft.to}
                  onChange={(value) =>
                    setTransactionDraft((current) => ({ ...current, to: value }))
                  }
                />
                <button
                  type="submit"
                  className="h-10 rounded-md bg-primary px-4 text-sm font-bold text-white"
                >
                  Áp dụng
                </button>
              </SellerFilterBar>
              {listError && <ListError message={listError} />}
              {transactionsLoading ? (
                <SellerStatePanel state="loading" compact />
              ) : transactions.length === 0 ? (
                <SellerStatePanel
                  state="empty"
                  icon={WalletCards}
                  title="Chưa có biến động ví"
                  description="Doanh thu được ghi nhận và các lần rút tiền sẽ xuất hiện tại đây."
                  compact
                />
              ) : (
                <SellerTableViewport ariaLabel="Lịch sử biến động ví">
                  <thead className="bg-surface-container/70 text-xs text-on-surface-variant">
                    <tr>
                      <th className="px-5 py-3 font-bold">Nội dung</th>
                      <th className="px-5 py-3 font-bold">Tham chiếu</th>
                      <th className="px-5 py-3 font-bold">Khả dụng từ</th>
                      <th className="px-5 py-3 text-right font-bold">Số tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/35">
                    {transactions.map((transaction) => {
                      const positive = transaction.amount >= 0;
                      return (
                        <tr key={transaction.id} className="hover:bg-surface-container/40">
                          <td className="px-5 py-4">
                            <div className="flex items-start gap-3">
                              <span
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${positive ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}
                              >
                                {positive ? (
                                  <ArrowDownLeft size={17} />
                                ) : (
                                  <ArrowUpRight size={17} />
                                )}
                              </span>
                              <div>
                                <p className="font-bold text-on-surface">
                                  {TRANSACTION_TYPES.find((item) => item.value === transaction.type)
                                    ?.label || transaction.type}
                                </p>
                                <p className="mt-1 max-w-md text-xs text-on-surface-variant">
                                  {transaction.description || formatDate(transaction.createdAt)}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-xs text-on-surface-variant">
                            <p>{transaction.referenceType || '-'}</p>
                            {transaction.referenceId && (
                              <p className="mt-1 font-mono">#{transaction.referenceId}</p>
                            )}
                          </td>
                          <td className="px-5 py-4 text-sm text-on-surface-variant">
                            {formatDate(transaction.availableAt)}
                          </td>
                          <td
                            className={`px-5 py-4 text-right font-black tabular-nums ${positive ? 'text-success' : 'text-error'}`}
                          >
                            {positive ? '+' : ''}
                            {formatCurrency(transaction.amount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </SellerTableViewport>
              )}
              <SellerPagination
                page={transactionPagination.page}
                totalPages={transactionPagination.total_pages}
                total={transactionPagination.total}
                label="biến động"
                loading={transactionsLoading}
                onPageChange={setTransactionPage}
              />
            </>
          )}
        </section>
      </div>

      <SellerConfirmDialog
        open={Boolean(cancelTarget)}
        title="Hủy yêu cầu rút tiền?"
        description="Số tiền đang tạm giữ sẽ được hoàn lại số dư khả dụng nếu yêu cầu vẫn chờ xử lý."
        confirmLabel="Hủy yêu cầu"
        busy={cancelling}
        onCancel={() => !cancelling && setCancelTarget(null)}
        onConfirm={() => void cancelWithdrawal()}
      />
    </div>
  );
}

function BankRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-surface-container p-3">
      <dt className="text-xs text-on-surface-variant">{label}</dt>
      <dd className="mt-1 break-words font-bold text-on-surface">{value}</dd>
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex h-10 items-center gap-2 rounded-md border border-outline-variant bg-surface-container-lowest px-3 text-sm">
      <CalendarRange size={16} className="text-on-surface-variant" />
      <span className="sr-only">{label}</span>
      <input
        type="date"
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 bg-transparent outline-none"
      />
    </label>
  );
}

function ListError({ message }: { message: string }) {
  return (
    <p className="border-b border-error/20 bg-error/10 px-5 py-3 text-sm font-semibold text-error">
      {message}
    </p>
  );
}
