import { useCallback, useEffect, useMemo, useState } from 'react';
import { sellerService } from '../../services/sellerService';
import type {
  AnalyticsPeriod,
  SellerDashboardAnalytics,
  SellerDashboardTasks,
  SellerDashboardTopProduct,
  SellerDashboardTopRatedProduct,
} from '../../types';
import { getAnalyticsErrorMessage } from '../../utils/analyticsErrors';

export interface SellerDashboardStats {
  totalProducts: number;
  totalRevenue: number;
  totalOrders: number;
  pendingOrders?: number;
  lowStock?: number;
  revenueRule?: 'delivered_items_gross';
  topProducts?: SellerDashboardTopProduct[];
  topRatedProducts?: SellerDashboardTopRatedProduct[];
}

const EMPTY_STATS: SellerDashboardStats = {
  totalProducts: 0,
  totalRevenue: 0,
  totalOrders: 0,
  pendingOrders: 0,
  lowStock: 0,
  topProducts: [],
  topRatedProducts: [],
};

const EMPTY_ACTION_STATS: SellerDashboardTasks = {
  ordersToProcess: 0,
  overdueOrders: 0,
  unreadMessages: 0,
  outOfStockProducts: 0,
  lowStockProducts: 0,
  unrepliedReviews: 0,
  pendingReturns: 0,
  overdueAfterHours: 24,
};

const getRangeError = (period: AnalyticsPeriod, from: string, to: string) => {
  if (!from && !to) return '';
  if (!from || !to) return 'Vui lòng chọn đầy đủ ngày bắt đầu và ngày kết thúc.';
  if (from > to) return 'Ngày bắt đầu không được sau ngày kết thúc.';

  const fromDate = new Date(`${from}T00:00:00Z`);
  const toDate = new Date(`${to}T00:00:00Z`);
  const dayCount = Math.floor((toDate.getTime() - fromDate.getTime()) / 86_400_000) + 1;
  const monthCount =
    (toDate.getUTCFullYear() - fromDate.getUTCFullYear()) * 12 +
    toDate.getUTCMonth() -
    fromDate.getUTCMonth() +
    1;
  const yearCount = toDate.getUTCFullYear() - fromDate.getUTCFullYear() + 1;

  if (period === 'day' && dayCount > 366) return 'Kỳ ngày chỉ hỗ trợ tối đa 366 ngày.';
  if (period === 'month' && monthCount > 60) return 'Kỳ tháng chỉ hỗ trợ tối đa 60 tháng.';
  if (period === 'year' && yearCount > 10) return 'Kỳ năm chỉ hỗ trợ tối đa 10 năm.';
  return '';
};

export function useSellerDashboard() {
  const [stats, setStats] = useState<SellerDashboardStats>(EMPTY_STATS);
  const [actionStats, setActionStats] = useState<SellerDashboardTasks>(EMPTY_ACTION_STATS);
  const [analytics, setAnalytics] = useState<SellerDashboardAnalytics | null>(null);
  const [period, setPeriod] = useState<AnalyticsPeriod>('day');
  const [fromDraft, setFromDraft] = useState('');
  const [toDraft, setToDraft] = useState('');
  const [appliedRange, setAppliedRange] = useState<{ from?: string; to?: string }>({});
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingActions, setLoadingActions] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [analyticsError, setAnalyticsError] = useState('');

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const data = await sellerService.getDashboardStats();
      setStats({ ...EMPTY_STATS, ...data });
    } catch {
      setStats(EMPTY_STATS);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const loadAnalytics = useCallback(async () => {
    setLoadingAnalytics(true);
    setAnalyticsError('');
    try {
      const data = await sellerService.getDashboardAnalytics({ period, ...appliedRange });
      setAnalytics(data);
    } catch (error) {
      setAnalyticsError(
        getAnalyticsErrorMessage(error, 'Không thể tải dữ liệu phân tích cửa hàng.'),
      );
    } finally {
      setLoadingAnalytics(false);
    }
  }, [appliedRange, period]);

  const loadActionStats = useCallback(async () => {
    setLoadingActions(true);
    try {
      const tasks = await sellerService.getDashboardTasks();
      setActionStats({ ...EMPTY_ACTION_STATS, ...tasks });
    } catch {
      setActionStats(EMPTY_ACTION_STATS);
    } finally {
      setLoadingActions(false);
    }
  }, []);

  useEffect(() => void loadStats(), [loadStats]);
  useEffect(() => void loadAnalytics(), [loadAnalytics]);
  useEffect(() => void loadActionStats(), [loadActionStats]);

  const handlePeriodChange = (nextPeriod: AnalyticsPeriod) => {
    setPeriod(nextPeriod);
    setFromDraft('');
    setToDraft('');
    setAppliedRange({});
    setAnalyticsError('');
  };

  const handleApplyRange = () => {
    const error = getRangeError(period, fromDraft, toDraft);
    if (error) {
      setAnalyticsError(error);
      return;
    }
    setAnalyticsError('');
    setAppliedRange(fromDraft && toDraft ? { from: fromDraft, to: toDraft } : {});
  };

  const handleResetRange = () => {
    setFromDraft('');
    setToDraft('');
    setAppliedRange({});
    setAnalyticsError('');
  };

  const handleRefresh = () => {
    void Promise.all([loadStats(), loadAnalytics(), loadActionStats()]);
  };

  const periodLabel = useMemo(
    () => (analytics ? `${analytics.from} – ${analytics.to}` : ''),
    [analytics],
  );

  return {
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
  };
}
