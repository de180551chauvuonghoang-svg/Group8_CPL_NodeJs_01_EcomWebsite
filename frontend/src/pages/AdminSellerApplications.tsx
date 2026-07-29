import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Store, Clock3, Package } from 'lucide-react';
import { adminService, AdminSellerRow } from '../services/adminService';

type StatusFilter = 'pending' | 'active' | 'rejected' | 'suspended';

const STATUS_LABELS: Record<StatusFilter, string> = {
  pending: 'Chờ duyệt',
  active: 'Đang hoạt động',
  rejected: 'Đã từ chối',
  suspended: 'Đã khoá'
};

export default function AdminSellerApplications() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [sellers, setSellers] = useState<AdminSellerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadSellers = async (status: StatusFilter) => {
    setLoading(true);
    setError('');
    try {
      const data = await adminService.getSellers(status);
      setSellers(data);
    } catch (err: any) {
      setError(err?.message || 'Không tải được danh sách shop.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSellers(statusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const handleApprove = async (sellerId: string) => {
    setActioningId(sellerId);
    try {
      await adminService.approveSeller(sellerId);
      setSellers(prev => prev.filter(s => s.id !== sellerId));
    } catch (err: any) {
      setError(err?.message || 'Duyệt đơn thất bại.');
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (sellerId: string) => {
    setActioningId(sellerId);
    try {
      await adminService.rejectSeller(sellerId);
      setSellers(prev => prev.filter(s => s.id !== sellerId));
    } catch (err: any) {
      setError(err?.message || 'Từ chối đơn thất bại.');
    } finally {
      setActioningId(null);
    }
  };

  const handleSuspend = async (sellerId: string) => {
    setActioningId(sellerId);
    try {
      await adminService.suspendSeller(sellerId);
      setSellers(prev => prev.filter(s => s.id !== sellerId));
    } catch (err: any) {
      setError(err?.message || 'Khoá shop thất bại.');
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="min-h-screen bg-surface p-6 md:p-10">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/30">
            <Store size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-on-surface">Quản Lý Shop</h1>
            <p className="text-on-surface-variant text-sm">Duyệt, từ chối hoặc khoá shop của người bán</p>
          </div>
        </div>

        {/* Status tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {(Object.keys(STATUS_LABELS) as StatusFilter[]).map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-full text-sm font-bold border-2 transition-all ${
                statusFilter === status
                  ? 'bg-primary text-white border-primary'
                  : 'border-outline-variant/50 text-on-surface-variant hover:border-primary/40'
              }`}
            >
              {STATUS_LABELS[status]}
            </button>
          ))}
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
        ) : sellers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant">
            <Clock3 size={40} className="mb-3 opacity-50" />
            <p className="font-semibold">Không có shop nào ở trạng thái này.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sellers.map(seller => (
              <motion.div
                key={seller.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-surface-container-lowest/80 backdrop-blur-xl rounded-3xl border border-outline-variant/30 shadow-sm p-6 flex flex-col md:flex-row md:items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <h2 className="font-bold text-on-surface text-lg">{seller.shop_name}</h2>
                  <p className="text-sm text-on-surface-variant">
                    Chủ shop: {seller.owner_name} ({seller.owner_email})
                  </p>
                  <p className="text-sm text-on-surface-variant">
                    {seller.shop_phone} · {seller.shop_address}
                  </p>
                </div>

                <div className="flex gap-2 shrink-0">
                  {statusFilter === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApprove(seller.id)}
                        disabled={actioningId === seller.id}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-white font-bold text-sm hover:opacity-90 disabled:opacity-50 transition-all"
                      >
                        <CheckCircle2 size={16} />
                        Duyệt
                      </button>
                      <button
                        onClick={() => handleReject(seller.id)}
                        disabled={actioningId === seller.id}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-full border-2 border-error/40 text-error font-bold text-sm hover:bg-error/5 disabled:opacity-50 transition-all"
                      >
                        <XCircle size={16} />
                        Từ chối
                      </button>
                    </>
                  )}
                  {statusFilter === 'active' && (
                    <>
                      <button
                        onClick={() => navigate(`/admin/sellers/${seller.id}/products`)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-full border-2 border-primary/40 text-primary font-bold text-sm hover:bg-primary/5 transition-all"
                      >
                        <Package size={16} />
                        Xem sản phẩm
                      </button>
                      <button
                        onClick={() => handleSuspend(seller.id)}
                        disabled={actioningId === seller.id}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-full border-2 border-error/40 text-error font-bold text-sm hover:bg-error/5 disabled:opacity-50 transition-all"
                      >
                        <XCircle size={16} />
                        Khoá shop
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
