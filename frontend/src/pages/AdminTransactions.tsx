import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Clock3, CreditCard } from 'lucide-react';
import { adminService, AdminPaymentRow } from '../services/adminService';

type MethodFilter = 'all' | 'cod' | 'bank_transfer' | 'vnpay' | 'momo' | 'stripe';
type StatusFilter = 'all' | 'pending' | 'paid' | 'failed' | 'refunded';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ xử lý',
  paid: 'Đã thanh toán',
  failed: 'Thất bại',
  refunded: 'Đã hoàn tiền'
};

const STATUS_TONE: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-600',
  paid: 'bg-green-500/10 text-green-600',
  failed: 'bg-error/10 text-error',
  refunded: 'bg-error/10 text-error'
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value || 0));

export default function AdminTransactions() {
  const [methodFilter, setMethodFilter] = useState<MethodFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [payments, setPayments] = useState<AdminPaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actioningId, setActioningId] = useState<string | null>(null);

  const loadPayments = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminService.getPayments({
        method: methodFilter === 'all' ? undefined : methodFilter,
        status: statusFilter === 'all' ? undefined : statusFilter
      });
      setPayments(data);
    } catch (err: any) {
      setError(err?.message || 'Không tải được danh sách giao dịch.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [methodFilter, statusFilter]);

  const handleConfirm = async (payment: AdminPaymentRow) => {
    if (!window.confirm(`Xác nhận đã nhận tiền cho giao dịch ${formatMoney(payment.amount)} của ${payment.user_name}?`)) return;
    setActioningId(payment.id);
    try {
      await adminService.confirmPayment(payment.id);
      setPayments(prev => prev.map(p => (p.id === payment.id ? { ...p, status: 'paid', is_stale_pending: false } : p)));
    } catch (err: any) {
      setError(err?.message || 'Xác nhận thanh toán thất bại.');
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="min-h-screen bg-surface p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/30">
            <CreditCard size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-on-surface">Giao Dịch Thanh Toán</h1>
            <p className="text-on-surface-variant text-sm">Đối soát và phát hiện giao dịch bất thường (treo lâu / giá trị lạ)</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-start gap-3 mb-6">
          <div className="flex gap-2 flex-wrap">
            {(['all', 'cod', 'bank_transfer', 'vnpay', 'momo'] as MethodFilter[]).map(m => (
              <button
                key={m}
                onClick={() => setMethodFilter(m)}
                className={`px-4 py-2 rounded-full text-sm font-bold border-2 uppercase transition-all ${
                  methodFilter === m ? 'bg-primary text-white border-primary' : 'border-outline-variant/50 text-on-surface-variant hover:border-primary/40'
                }`}
              >
                {m === 'all' ? 'Tất cả' : m}
              </button>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap md:ml-auto">
            {(['all', 'pending', 'paid', 'failed', 'refunded'] as StatusFilter[]).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-4 py-2 rounded-full text-sm font-bold border-2 transition-all ${
                  statusFilter === s ? 'bg-primary text-white border-primary' : 'border-outline-variant/50 text-on-surface-variant hover:border-primary/40'
                }`}
              >
                {s === 'all' ? 'Tất cả' : STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-4 text-error bg-error/10 border border-error/20 rounded-2xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-primary">
            <span className="material-symbols-outlined text-4xl animate-spin">sync</span>
            <p className="mt-2 font-semibold">Đang tải...</p>
          </div>
        ) : (
          <div className="bg-surface-container-lowest/80 backdrop-blur-xl rounded-3xl border border-outline-variant/30 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant/30 text-left text-on-surface-variant">
                  <th className="px-6 py-3 font-semibold">Khách hàng</th>
                  <th className="px-6 py-3 font-semibold">Phương thức</th>
                  <th className="px-6 py-3 font-semibold">Số tiền</th>
                  <th className="px-6 py-3 font-semibold">Trạng thái</th>
                  <th className="px-6 py-3 font-semibold">Cảnh báo</th>
                  <th className="px-6 py-3 font-semibold">Ngày tạo</th>
                  <th className="px-6 py-3 font-semibold text-right">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <motion.tr
                    key={p.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b border-outline-variant/10 last:border-0"
                  >
                    <td className="px-6 py-4">
                      <p className="font-semibold text-on-surface">{p.user_name}</p>
                      <p className="text-xs text-on-surface-variant">{p.user_email}</p>
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant uppercase text-xs font-bold">{p.method}</td>
                    <td className="px-6 py-4 font-bold text-on-surface">{formatMoney(p.amount)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_TONE[p.status] || 'bg-surface-container text-on-surface-variant'}`}>
                        {STATUS_LABELS[p.status] || p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {p.is_stale_pending && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-500/10 text-yellow-600 w-fit">
                            <Clock3 size={11} /> Treo lâu
                          </span>
                        )}
                        {p.is_amount_outlier && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-error/10 text-error w-fit">
                            <AlertTriangle size={11} /> Giá trị bất thường
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant text-xs">{new Date(p.created_at).toLocaleString('vi-VN')}</td>
                    <td className="px-6 py-4 text-right">
                      {p.status === 'pending' && (
                        <button
                          onClick={() => handleConfirm(p)}
                          disabled={actioningId === p.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-xs border-2 border-primary/40 text-primary hover:bg-primary/5 transition-all disabled:opacity-50"
                        >
                          <CheckCircle2 size={14} />
                          Xác nhận đã nhận tiền
                        </button>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            {payments.length === 0 && (
              <div className="py-16 text-center text-on-surface-variant">Không có giao dịch nào khớp bộ lọc.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
