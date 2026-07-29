import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Ban, CheckCircle2, Pencil, Plus, Ticket, X } from 'lucide-react';
import { adminService, AdminCouponRow } from '../services/adminService';

type FormState = {
  id?: string;
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: string;
  min_order_amount: string;
  max_discount_amt: string;
  usage_limit: string;
  expires_at: string;
};

const EMPTY_FORM: FormState = {
  code: '',
  description: '',
  discount_type: 'percentage',
  discount_value: '',
  min_order_amount: '',
  max_discount_amt: '',
  usage_limit: '',
  expires_at: ''
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value || 0));

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<AdminCouponRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const loadCoupons = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminService.getCoupons();
      setCoupons(data);
    } catch (err: any) {
      setError(err?.message || 'Không tải được danh sách voucher.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const openCreateForm = () => {
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEditForm = (coupon: AdminCouponRow) => {
    setForm({
      id: coupon.id,
      code: coupon.code,
      description: coupon.description || '',
      discount_type: coupon.discount_type,
      discount_value: String(coupon.discount_value),
      min_order_amount: coupon.min_order_amount != null ? String(coupon.min_order_amount) : '',
      max_discount_amt: coupon.max_discount_amt != null ? String(coupon.max_discount_amt) : '',
      usage_limit: coupon.usage_limit != null ? String(coupon.usage_limit) : '',
      expires_at: coupon.expires_at ? coupon.expires_at.slice(0, 10) : ''
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim() || !form.discount_value) {
      setError('Vui lòng nhập mã và giá trị giảm giá.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        description: form.description.trim() || undefined,
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        min_order_amount: form.min_order_amount ? Number(form.min_order_amount) : undefined,
        max_discount_amt: form.max_discount_amt ? Number(form.max_discount_amt) : undefined,
        usage_limit: form.usage_limit ? Number(form.usage_limit) : undefined,
        expires_at: form.expires_at || undefined
      };
      if (form.id) {
        await adminService.updateCoupon(form.id, payload);
      } else {
        await adminService.createCoupon(payload);
      }
      setShowForm(false);
      await loadCoupons();
    } catch (err: any) {
      setError(err?.message || 'Lưu voucher thất bại.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (coupon: AdminCouponRow) => {
    setActioningId(coupon.id);
    try {
      await adminService.updateCoupon(coupon.id, { is_active: !coupon.is_active });
      setCoupons(prev => prev.map(c => (c.id === coupon.id ? { ...c, is_active: !coupon.is_active } : c)));
    } catch (err: any) {
      setError(err?.message || 'Cập nhật trạng thái thất bại.');
    } finally {
      setActioningId(null);
    }
  };

  const handleDelete = async (coupon: AdminCouponRow) => {
    if (!window.confirm(`Xoá voucher "${coupon.code}"?`)) return;
    setActioningId(coupon.id);
    try {
      await adminService.deleteCoupon(coupon.id);
      setCoupons(prev => prev.filter(c => c.id !== coupon.id));
    } catch (err: any) {
      setError(err?.message || 'Xoá voucher thất bại.');
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="min-h-screen bg-surface p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/30">
              <Ticket size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-on-surface">Voucher / Mã Giảm Giá</h1>
              <p className="text-on-surface-variant text-sm">Quản lý đơn hàng giảm giá để quảng bá sản phẩm mới</p>
            </div>
          </div>
          <button
            onClick={openCreateForm}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary text-white font-bold text-sm hover:opacity-90 transition-all"
          >
            <Plus size={16} />
            Thêm voucher
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
          <div className="bg-surface-container-lowest/80 backdrop-blur-xl rounded-3xl border border-outline-variant/30 shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant/30 text-left text-on-surface-variant">
                  <th className="px-6 py-3 font-semibold">Mã</th>
                  <th className="px-6 py-3 font-semibold">Giảm giá</th>
                  <th className="px-6 py-3 font-semibold">Đã dùng</th>
                  <th className="px-6 py-3 font-semibold">Hết hạn</th>
                  <th className="px-6 py-3 font-semibold">Trạng thái</th>
                  <th className="px-6 py-3 font-semibold text-right">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map(coupon => (
                  <motion.tr
                    key={coupon.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b border-outline-variant/10 last:border-0"
                  >
                    <td className="px-6 py-4 font-mono font-bold text-on-surface">{coupon.code}</td>
                    <td className="px-6 py-4 text-on-surface-variant">
                      {coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : formatMoney(coupon.discount_value)}
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant">
                      {coupon.used_count}{coupon.usage_limit ? ` / ${coupon.usage_limit}` : ''}
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant text-xs">
                      {coupon.expires_at ? new Date(coupon.expires_at).toLocaleDateString('vi-VN') : 'Không giới hạn'}
                    </td>
                    <td className="px-6 py-4">
                      {coupon.is_active ? (
                        <span className="text-xs font-bold text-green-600">Đang hoạt động</span>
                      ) : (
                        <span className="text-xs font-bold text-error">Đã tắt</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditForm(coupon)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-xs border-2 border-primary/40 text-primary hover:bg-primary/5 transition-all"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleToggleActive(coupon)}
                          disabled={actioningId === coupon.id}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-xs border-2 transition-all disabled:opacity-50 ${
                            coupon.is_active ? 'border-error/40 text-error hover:bg-error/5' : 'border-primary/40 text-primary hover:bg-primary/5'
                          }`}
                        >
                          {coupon.is_active ? <Ban size={14} /> : <CheckCircle2 size={14} />}
                        </button>
                        <button
                          onClick={() => handleDelete(coupon)}
                          disabled={actioningId === coupon.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-xs border-2 border-error/40 text-error hover:bg-error/5 transition-all disabled:opacity-50"
                        >
                          Xoá
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            {coupons.length === 0 && (
              <div className="py-16 text-center text-on-surface-variant">Chưa có voucher nào.</div>
            )}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-on-surface">{form.id ? 'Sửa voucher' : 'Thêm voucher mới'}</h2>
              <button onClick={() => setShowForm(false)} className="text-on-surface-variant hover:text-on-surface">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1">Mã voucher *</label>
                <input
                  type="text"
                  value={form.code}
                  onChange={e => setForm(prev => ({ ...prev, code: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/40 bg-surface text-on-surface text-sm uppercase"
                  disabled={!!form.id}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1">Loại giảm giá</label>
                  <select
                    value={form.discount_type}
                    onChange={e => setForm(prev => ({ ...prev, discount_type: e.target.value as 'percentage' | 'fixed' }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/40 bg-surface text-on-surface text-sm"
                  >
                    <option value="percentage">Phần trăm (%)</option>
                    <option value="fixed">Số tiền cố định</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1">Giá trị *</label>
                  <input
                    type="number"
                    value={form.discount_value}
                    onChange={e => setForm(prev => ({ ...prev, discount_value: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/40 bg-surface text-on-surface text-sm"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1">Đơn tối thiểu</label>
                  <input
                    type="number"
                    value={form.min_order_amount}
                    onChange={e => setForm(prev => ({ ...prev, min_order_amount: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/40 bg-surface text-on-surface text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1">Giảm tối đa</label>
                  <input
                    type="number"
                    value={form.max_discount_amt}
                    onChange={e => setForm(prev => ({ ...prev, max_discount_amt: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/40 bg-surface text-on-surface text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1">Giới hạn lượt dùng</label>
                  <input
                    type="number"
                    value={form.usage_limit}
                    onChange={e => setForm(prev => ({ ...prev, usage_limit: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/40 bg-surface text-on-surface text-sm"
                    placeholder="Không giới hạn"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1">Ngày hết hạn</label>
                  <input
                    type="date"
                    value={form.expires_at}
                    onChange={e => setForm(prev => ({ ...prev, expires_at: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/40 bg-surface text-on-surface text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1">Mô tả</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/40 bg-surface text-on-surface text-sm"
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2.5 rounded-full border-2 border-outline-variant/50 text-on-surface-variant font-bold text-sm hover:border-primary/40 transition-all"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-full bg-primary text-white font-bold text-sm hover:opacity-90 disabled:opacity-50 transition-all"
                >
                  {saving ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
