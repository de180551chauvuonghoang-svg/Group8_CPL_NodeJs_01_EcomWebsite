import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, History, PackageSearch, X } from 'lucide-react';
import { adminService, AdminInventoryRow, AdminInventoryLogRow } from '../services/adminService';

const formatMoney = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value || 0));

export default function AdminInventory() {
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [items, setItems] = useState<AdminInventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adjustTarget, setAdjustTarget] = useState<AdminInventoryRow | null>(null);
  const [changeQty, setChangeQty] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [logsTarget, setLogsTarget] = useState<AdminInventoryRow | null>(null);
  const [logs, setLogs] = useState<AdminInventoryLogRow[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const loadInventory = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminService.getInventory(lowStockOnly);
      setItems(data);
    } catch (err: any) {
      setError(err?.message || 'Không tải được danh sách tồn kho.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lowStockOnly]);

  const openAdjust = (item: AdminInventoryRow) => {
    setChangeQty('');
    setReason('');
    setAdjustTarget(item);
  };

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTarget) return;
    const qty = Number(changeQty);
    if (!qty) {
      setError('Vui lòng nhập số lượng điều chỉnh khác 0.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const result = await adminService.adjustInventory(adjustTarget.variant_id, qty, reason.trim() || 'adjustment');
      setItems(prev =>
        prev.map(i => (i.variant_id === adjustTarget.variant_id ? { ...i, stock_qty: result.stock_qty } : i))
      );
      setAdjustTarget(null);
    } catch (err: any) {
      setError(err?.message || 'Điều chỉnh tồn kho thất bại.');
    } finally {
      setSaving(false);
    }
  };

  const openLogs = async (item: AdminInventoryRow) => {
    setLogsTarget(item);
    setLogsLoading(true);
    try {
      const data = await adminService.getInventoryLogs(item.variant_id);
      setLogs(data);
    } catch (err: any) {
      setError(err?.message || 'Không tải được lịch sử điều chỉnh.');
    } finally {
      setLogsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/30">
              <PackageSearch size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-on-surface">Kho Hàng &amp; Tồn Kho</h1>
              <p className="text-on-surface-variant text-sm">Theo dõi và điều chỉnh số lượng tồn kho từng biến thể sản phẩm</p>
            </div>
          </div>
          <button
            onClick={() => setLowStockOnly(prev => !prev)}
            className={`px-4 py-2 rounded-full text-sm font-bold border-2 transition-all ${
              lowStockOnly
                ? 'bg-error text-white border-error'
                : 'border-outline-variant/50 text-on-surface-variant hover:border-error/40'
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <AlertTriangle size={14} />
              Chỉ sắp hết hàng (≤5)
            </span>
          </button>
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
                  <th className="px-6 py-3 font-semibold">Sản phẩm</th>
                  <th className="px-6 py-3 font-semibold">SKU</th>
                  <th className="px-6 py-3 font-semibold">Người bán</th>
                  <th className="px-6 py-3 font-semibold">Giá</th>
                  <th className="px-6 py-3 font-semibold">Tồn kho</th>
                  <th className="px-6 py-3 font-semibold text-right">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <motion.tr
                    key={item.variant_id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b border-outline-variant/10 last:border-0"
                  >
                    <td className="px-6 py-4 font-semibold text-on-surface">{item.product_name}</td>
                    <td className="px-6 py-4 text-on-surface-variant font-mono text-xs">{item.sku}</td>
                    <td className="px-6 py-4 text-on-surface-variant">{item.seller_name || '—'}</td>
                    <td className="px-6 py-4 text-on-surface-variant">{formatMoney(item.price)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        item.stock_qty <= 5 ? 'bg-error/10 text-error' : 'bg-green-500/10 text-green-600'
                      }`}>
                        {item.stock_qty}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openLogs(item)}
                          title="Lịch sử điều chỉnh"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-xs border-2 border-outline-variant/50 text-on-surface-variant hover:border-primary/40 transition-all"
                        >
                          <History size={14} />
                        </button>
                        <button
                          onClick={() => openAdjust(item)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-xs border-2 border-primary/40 text-primary hover:bg-primary/5 transition-all"
                        >
                          Điều chỉnh
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            {items.length === 0 && (
              <div className="py-16 text-center text-on-surface-variant">Không có sản phẩm nào khớp bộ lọc.</div>
            )}
          </div>
        )}
      </div>

      {adjustTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 shadow-xl w-full max-w-md p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-on-surface">Điều chỉnh tồn kho</h2>
              <button onClick={() => setAdjustTarget(null)} className="text-on-surface-variant hover:text-on-surface">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-on-surface-variant mb-4">
              {adjustTarget.product_name} · Tồn hiện tại: <strong>{adjustTarget.stock_qty}</strong>
            </p>
            <form onSubmit={handleAdjust} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1">
                  Số lượng thay đổi * (dương = nhập thêm, âm = trừ đi)
                </label>
                <input
                  type="number"
                  value={changeQty}
                  onChange={e => setChangeQty(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/40 bg-surface text-on-surface text-sm"
                  placeholder="VD: 20 hoặc -5"
                  autoFocus
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1">Lý do</label>
                <input
                  type="text"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/40 bg-surface text-on-surface text-sm"
                  placeholder="Nhập kho mới, kiểm kê, hàng lỗi..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustTarget(null)}
                  className="px-4 py-2.5 rounded-full border-2 border-outline-variant/50 text-on-surface-variant font-bold text-sm hover:border-primary/40 transition-all"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-full bg-primary text-white font-bold text-sm hover:opacity-90 disabled:opacity-50 transition-all"
                >
                  {saving ? 'Đang lưu...' : 'Xác nhận'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {logsTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 shadow-xl w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-on-surface">Lịch sử điều chỉnh — {logsTarget.product_name}</h2>
              <button onClick={() => setLogsTarget(null)} className="text-on-surface-variant hover:text-on-surface">
                <X size={20} />
              </button>
            </div>
            {logsLoading ? (
              <div className="flex justify-center py-10 text-primary">
                <span className="material-symbols-outlined text-3xl animate-spin">sync</span>
              </div>
            ) : logs.length === 0 ? (
              <p className="text-center text-on-surface-variant py-8">Chưa có lịch sử điều chỉnh.</p>
            ) : (
              <div className="space-y-2">
                {logs.map(log => (
                  <div key={log.id} className="flex justify-between items-center text-sm border-b border-outline-variant/10 pb-2 last:border-0">
                    <div>
                      <p className={`font-bold ${log.change_qty > 0 ? 'text-green-600' : 'text-error'}`}>
                        {log.change_qty > 0 ? '+' : ''}{log.change_qty}
                      </p>
                      <p className="text-xs text-on-surface-variant">{log.reason || '—'} · {log.created_by_name || 'Hệ thống'}</p>
                    </div>
                    <p className="text-xs text-on-surface-variant">{new Date(log.created_at).toLocaleString('vi-VN')}</p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
