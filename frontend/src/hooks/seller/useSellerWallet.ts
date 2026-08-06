import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useToast } from '../../context/ToastContext';
import { walletService } from '../../services/walletService';
import type {
  Pagination,
  SellerWalletOverview,
  SellerWithdrawal,
  WalletTransaction,
  WalletTransactionFilter,
  WithdrawalStatusFilter,
} from '../../types';
import { getApiErrorCode, getApiErrorMessage } from '../../utils/apiErrors';

export type WalletTab = 'withdrawals' | 'transactions';

const EMPTY_PAGINATION: Pagination = { page: 1, limit: 20, total: 0, total_pages: 0 };

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export function useSellerWallet() {
  const toast = useToast();
  const [overview, setOverview] = useState<SellerWalletOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState('');
  const [tab, setTab] = useState<WalletTab>('withdrawals');
  const [withdrawals, setWithdrawals] = useState<SellerWithdrawal[]>([]);
  const [withdrawalStatus, setWithdrawalStatus] = useState<WithdrawalStatusFilter>('all');
  const [withdrawalPage, setWithdrawalPage] = useState(1);
  const [withdrawalPagination, setWithdrawalPagination] = useState(EMPTY_PAGINATION);
  const [withdrawalsLoading, setWithdrawalsLoading] = useState(true);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [transactionPage, setTransactionPage] = useState(1);
  const [transactionPagination, setTransactionPagination] = useState(EMPTY_PAGINATION);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [transactionDraft, setTransactionDraft] = useState({
    type: 'all' as WalletTransactionFilter,
    from: '',
    to: '',
  });
  const [transactionQuery, setTransactionQuery] = useState(transactionDraft);
  const [listError, setListError] = useState('');
  const [amount, setAmount] = useState('');
  const [sellerNote, setSellerNote] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<SellerWithdrawal | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    setOverviewError('');
    try {
      setOverview(await walletService.getWallet());
    } catch (error) {
      setOverviewError(getApiErrorMessage(error, 'Không thể tải số dư ví của shop.'));
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  const loadWithdrawals = useCallback(async () => {
    setWithdrawalsLoading(true);
    setListError('');
    try {
      const data = await walletService.getWithdrawals({
        status: withdrawalStatus,
        page: withdrawalPage,
        limit: 20,
      });
      setWithdrawals(data.withdrawals);
      setWithdrawalPagination(data.pagination);
    } catch (error) {
      setListError(getApiErrorMessage(error, 'Không thể tải yêu cầu rút tiền.'));
    } finally {
      setWithdrawalsLoading(false);
    }
  }, [withdrawalPage, withdrawalStatus]);

  const loadTransactions = useCallback(async () => {
    setTransactionsLoading(true);
    setListError('');
    try {
      const data = await walletService.getTransactions({
        ...transactionQuery,
        page: transactionPage,
        limit: 20,
      });
      setTransactions(data.transactions);
      setTransactionPagination(data.pagination);
    } catch (error) {
      setListError(getApiErrorMessage(error, 'Không thể tải lịch sử ví.'));
    } finally {
      setTransactionsLoading(false);
    }
  }, [transactionPage, transactionQuery]);

  useEffect(() => void loadOverview(), [loadOverview]);
  useEffect(() => void loadWithdrawals(), [loadWithdrawals]);
  useEffect(() => void loadTransactions(), [loadTransactions]);

  const hasBankInfo = Boolean(
    overview?.bankInfo.bankName &&
    overview.bankInfo.accountHolder &&
    overview.bankInfo.maskedAccountNo,
  );

  const refreshWalletData = async () => {
    await Promise.all([loadOverview(), loadWithdrawals(), loadTransactions()]);
  };

  const createWithdrawal = async (event: FormEvent) => {
    event.preventDefault();
    if (!overview) return;

    const parsedAmount = Number(amount);
    if (!hasBankInfo) {
      setFormError('Vui lòng hoàn tất thông tin ngân hàng trước khi tạo yêu cầu.');
      return;
    }
    if (!Number.isInteger(parsedAmount) || parsedAmount <= 0) {
      setFormError('Số tiền rút phải là số nguyên dương.');
      return;
    }
    if (parsedAmount < overview.minimumWithdrawalAmount) {
      setFormError(`Số tiền rút tối thiểu là ${formatCurrency(overview.minimumWithdrawalAmount)}.`);
      return;
    }
    if (parsedAmount > overview.wallet.availableBalance) {
      setFormError('Số tiền rút vượt quá số dư khả dụng.');
      return;
    }
    if (sellerNote.trim().length > 500) {
      setFormError('Ghi chú không được vượt quá 500 ký tự.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      await walletService.createWithdrawal({
        amount: parsedAmount,
        sellerNote: sellerNote.trim() || undefined,
      });
      setAmount('');
      setSellerNote('');
      setWithdrawalStatus('all');
      setWithdrawalPage(1);
      toast.success('Đã gửi yêu cầu rút tiền', 'Số tiền được tạm giữ trong lúc chờ xử lý.');
      await refreshWalletData();
    } catch (error) {
      const code = getApiErrorCode(error);
      const message = getApiErrorMessage(error, 'Không thể tạo yêu cầu rút tiền.');
      setFormError(message);
      if (code === 'BANK_INFO_REQUIRED') {
        toast.warning('Thiếu thông tin ngân hàng', message);
      } else {
        toast.error('Rút tiền chưa thành công', message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const cancelWithdrawal = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await walletService.cancelWithdrawal(cancelTarget.id);
      toast.success('Đã hủy yêu cầu', 'Số tiền tạm giữ đã được hoàn lại ví khả dụng.');
      setCancelTarget(null);
      await refreshWalletData();
    } catch (error) {
      toast.error(
        'Không thể hủy yêu cầu',
        getApiErrorMessage(error, 'Yêu cầu này không còn ở trạng thái có thể hủy.'),
      );
    } finally {
      setCancelling(false);
    }
  };

  const applyTransactionFilters = () => {
    if (
      (transactionDraft.from && !transactionDraft.to) ||
      (!transactionDraft.from && transactionDraft.to)
    ) {
      setListError('Vui lòng chọn đủ ngày bắt đầu và ngày kết thúc.');
      return;
    }
    if (
      transactionDraft.from &&
      transactionDraft.to &&
      transactionDraft.from > transactionDraft.to
    ) {
      setListError('Ngày bắt đầu không được sau ngày kết thúc.');
      return;
    }
    setListError('');
    setTransactionPage(1);
    setTransactionQuery(transactionDraft);
  };

  return {
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
  };
}
