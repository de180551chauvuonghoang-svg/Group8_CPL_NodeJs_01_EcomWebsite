import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, Search, X } from 'lucide-react';
import { adminService, AdminOrderRow, AdminOrderDetail } from '../services/adminService';

type StatusFilter = 'all' | 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  processing: 'Đang xử lý',
  shipped: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã huỷ',
  refunded: 'Đã hoàn tiền'
};

const STATUS_TONE: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-600',
  confirmed: 'bg-blue-500/10 text-blue-600',
  processing: 'bg-blue-500/10 text-blue-600',
  shipped: 'bg-primary/10 text-primary',
  delivered: 'bg-green-500/10 text-green-600',
  cancelled: 'bg-error/10 text-error',
  refunded: 'bg-error/10 text-error'
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value || 0));

const formatDate = (value: string) => new Date(value).toLocaleString('vi-VN');

export default function AdminOrders() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [orders, setOrders] = useState<AdminOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<AdminOrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminService.getOrders({
        status: statusFilter === 'all' ? undefined : statusFilter,
        q: search.trim() || undefined
      });
      setOrders(data);
    } catch (err: any) {
      setError(err?.message || 'Không tải được danh sách đơn hàng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(loadOrders, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, search]);

  const openDetail = async (orderId: string) => {
    setDetailLoading(true);
    try {
      const detail = await adminService.getOrderDetail(orderId);
      setSelectedOrder(detail);
    } catch (err: any) {
      setError(err?.message || 'Không tải được chi tiết đơn hàng.');
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/30">
            <ClipboardList size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-on-surface">Đơn Hàng</h1>
            <p className="text-on-surface-variant text-sm">Xem toàn bộ đơn hàng hệ thống, tìm theo mã đơn / SĐT / tên sản phẩm</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-start gap-3 mb-6">
          <div className="flex gap-2 flex-wrap">
            {(['all', ...Object.keys(STATUS_LABELS)] as StatusFilter[]).map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-full text-sm font-bold border-2 transition-all ${
                  statusFilter === status
                    ? 'bg-primary text-white border-primary'
                    : 'border-outline-variant/50 text-on-surface-variant hover:border-primary/40'
                }`}
              >
                {status === 'all' ? 'Tất cả' : STATUS_LABELS[status]}
              </button>
            ))}
          </div>
          <div className="relative md:ml-auto md:w-72">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Mã đơn, SĐT, tên sản phẩm..."
              className="w-full pl-10 pr-4 py-2.5 rounded-full border border-outline-variant/40 bg-surface-container-lowest text-on-surface text-sm"
            />
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
                  <th className="px-6 py-3 font-semibold">Mã đơn</th>
                  <th className="px-6 py-3 font-semibold">Khách hàng</th>
                  <th className="px-6 py-3 font-semibold">Tổng tiền</th>
                  <th className="px-6 py-3 font-semibold">Thanh toán</th>
                  <th className="px-6 py-3 font-semibold">Trạng thái</th>
                  <th className="px-6 py-3 font-semibold">Ngày tạo</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <motion.tr
                    key={order.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => openDetail(order.id)}
                    className="border-b border-outline-variant/10 last:border-0 cursor-pointer hover:bg-surface-container/50 transition-colors"
                  >
                    <td className="px-6 py-4 font-mono text-xs text-on-surface-variant">{order.id.slice(0, 8)}...</td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-on-surface">{order.user_name}</p>
                      <p className="text-xs text-on-surface-variant">{order.shipping_phone}</p>
                    </td>
                    <td className="px-6 py-4 font-bold text-on-surface">{formatMoney(order.total)}</td>
                    <td className="px-6 py-4 text-on-surface-variant uppercase text-xs font-bold">
                      {order.payment_method || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_TONE[order.status] || 'bg-surface-container text-on-surface-variant'}`}>
                        {STATUS_LABELS[order.status] || order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant text-xs">{formatDate(order.created_at)}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            {orders.length === 0 && (
              <div className="py-16 text-center text-on-surface-variant">Không có đơn hàng nào khớp bộ lọc.</div>
            )}
          </div>
        )}
      </div>

      {(selectedOrder || detailLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-on-surface">Chi tiết đơn hàng</h2>
              <button onClick={() => setSelectedOrder(null)} className="text-on-surface-variant hover:text-on-surface">
                <X size={20} />
              </button>
            </div>

            {detailLoading || !selectedOrder ? (
              <div className="flex justify-center py-10 text-primary">
                <span className="material-symbols-outlined text-3xl animate-spin">sync</span>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs font-bold text-on-surface-variant">Khách hàng</p>
                    <p className="text-on-surface font-semibold">{selectedOrder.user_name}</p>
                    <p className="text-on-surface-variant text-xs">{selectedOrder.user_email}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-on-surface-variant">Trạng thái</p>
                    <span className={`inline-block mt-1 px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_TONE[selectedOrder.status] || 'bg-surface-container text-on-surface-variant'}`}>
                      {STATUS_LABELS[selectedOrder.status] || selectedOrder.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-on-surface-variant">Giao đến</p>
                    <p className="text-on-surface text-sm">{selectedOrder.shipping_name} · {selectedOrder.shipping_phone}</p>
                    <p className="text-on-surface-variant text-xs">{selectedOrder.shipping_address}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-on-surface-variant">Thanh toán</p>
                    <p className="text-on-surface text-sm uppercase font-bold">
                      {selectedOrder.payment?.method || '—'} · {selectedOrder.payment?.status || '—'}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-on-surface-variant mb-2">Sản phẩm</p>
                  <div className="space-y-2">
                    {selectedOrder.items.map(item => (
                      <div key={item.id} className="flex justify-between items-center text-sm border-b border-outline-variant/10 pb-2 last:border-0">
                        <div>
                          <p className="text-on-surface font-semibold">{item.product_name}</p>
                          {item.variant_info && <p className="text-xs text-on-surface-variant">{item.variant_info}</p>}
                        </div>
                        <div className="text-right">
                          <p className="text-on-surface">{item.quantity} x {formatMoney(item.unit_price)}</p>
                          <p className="text-xs text-on-surface-variant">{formatMoney(item.total_price)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-outline-variant/20">
                  <span className="text-sm font-bold text-on-surface-variant">Tổng cộng</span>
                  <span className="text-lg font-black text-on-surface">{formatMoney(selectedOrder.total)}</span>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
