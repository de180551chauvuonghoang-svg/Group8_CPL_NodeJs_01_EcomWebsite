import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Loader2, Plus, Power, Trash2, TicketPercent } from 'lucide-react';
import { sellerService } from '../services/sellerService';
import { SellerCoupon } from '../types';

const formatNumber = (value?: number) => new Intl.NumberFormat('vi-VN').format(Number(value || 0));

const toLocalInputDateTime = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60 * 1000).toISOString().slice(0, 16);
};

const nowInputDateTime = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60 * 1000).toISOString().slice(0, 16);
};

const endOfTodayInputDateTime = () => {
  const date = new Date();
  date.setHours(23, 59, 0, 0);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60 * 1000).toISOString().slice(0, 16);
};

const formatDateTime = (value?: string) => {
  if (!value) return 'Chưa đặt';
  try {
    return new Date(value).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return value;
  }
};

const initialForm = {
  code: '',
  description: '',
  discountType: 'percentage' as 'percentage' | 'fixed',
  discountValue: '',
  minOrderAmount: '',
  maxDiscountAmt: '',
  usageLimit: '',
  startsAt: nowInputDateTime(),
  expiresAt: endOfTodayInputDateTime(),
};

export default function SellerVouchers() {
  const minDateTime = useMemo(() => nowInputDateTime(), []);
  const [coupons, setCoupons] = useState<SellerCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState(initialForm);
  const [dateDrafts, setDateDrafts] = useState<Record<string, { startsAt: string; expiresAt: string }>>({});

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const data = await sellerService.getCoupons();
      const list = Array.isArray(data) ? data : [];
      setCoupons(list);
      setDateDrafts(Object.fromEntries(list.map(coupon => [
        coupon.id,
        {
          startsAt: toLocalInputDateTime(coupon.starts_at),
          expiresAt: toLocalInputDateTime(coupon.expires_at),
        }
      ])));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const updateForm = (key: keyof typeof form, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setError('');
  };

  const validateForm = () => {
    if (!form.code.trim()) return 'Vui lòng nhập mã voucher.';
    if (!form.discountValue || Number(form.discountValue) <= 0) return 'Giá trị giảm phải lớn hơn 0.';
    if (form.discountType === 'percentage' && Number(form.discountValue) > 100) return 'Voucher phần trăm không được vượt quá 100%.';
    if (form.usageLimit && Number(form.usageLimit) <= 0) return 'Số lượt dùng phải lớn hơn 0.';
    if (!form.startsAt) return 'Vui lòng chọn thời gian bắt đầu.';
    if (!form.expiresAt) return 'Vui lòng chọn thời gian hết hạn.';
    if (new Date(form.startsAt) >= new Date(form.expiresAt)) return 'Thời gian hết hạn phải sau thời gian bắt đầu.';
    if (form.expiresAt < minDateTime) return 'Thời gian hết hạn không được nhỏ hơn hiện tại.';
    return '';
  };

  const createCoupon = async (event: React.FormEvent) => {
    event.preventDefault();
    const message = validateForm();
    if (message) {
      setError(message);
      return;
    }

    setSubmitting(true);
    try {
      await sellerService.createCoupon({
        code: form.code.trim(),
        description: form.description.trim() || undefined,
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : undefined,
        maxDiscountAmt: form.maxDiscountAmt ? Number(form.maxDiscountAmt) : undefined,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
        startsAt: new Date(form.startsAt).toISOString(),
        expiresAt: new Date(form.expiresAt).toISOString(),
      });
      setForm({ ...initialForm, startsAt: nowInputDateTime(), expiresAt: endOfTodayInputDateTime() });
      await fetchCoupons();
    } catch (err: any) {
      setError(err?.data?.message || err?.message || 'Không tạo được voucher.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleCoupon = async (coupon: SellerCoupon) => {
    setWorkingId(coupon.id);
    try {
      await sellerService.updateCoupon(coupon.id, { isActive: !coupon.is_active });
      setCoupons(prev => prev.map(item => item.id === coupon.id ? { ...item, is_active: !item.is_active } : item));
    } finally {
      setWorkingId(null);
    }
  };

  const updateDates = async (coupon: SellerCoupon) => {
    const draft = dateDrafts[coupon.id];
    if (!draft?.expiresAt) {
      setError('Vui lòng chọn thời gian hết hạn mới.');
      return;
    }
    if (draft.startsAt && new Date(draft.startsAt) >= new Date(draft.expiresAt)) {
      setError('Thời gian hết hạn phải sau thời gian bắt đầu.');
      return;
    }
    if (draft.expiresAt < minDateTime) {
      setError('Thời gian hết hạn không được nhỏ hơn hiện tại.');
      return;
    }

    setWorkingId(coupon.id);
    try {
      await sellerService.updateCoupon(coupon.id, {
        startsAt: draft.startsAt ? new Date(draft.startsAt).toISOString() : undefined,
        expiresAt: new Date(draft.expiresAt).toISOString(),
      });
      setCoupons(prev => prev.map(item => item.id === coupon.id
        ? { ...item, starts_at: draft.startsAt || item.starts_at, expires_at: draft.expiresAt }
        : item
      ));
      setError('');
    } catch (err: any) {
      setError(err?.data?.message || err?.message || 'Không cập nhật được thời gian voucher.');
    } finally {
      setWorkingId(null);
    }
  };

  const deleteCoupon = async (coupon: SellerCoupon) => {
    const ok = window.confirm(`Xóa voucher ${coupon.code}?`);
    if (!ok) return;

    setWorkingId(coupon.id);
    try {
      await sellerService.deleteCoupon(coupon.id);
      setCoupons(prev => prev.filter(item => item.id !== coupon.id));
      setDateDrafts(prev => {
        const next = { ...prev };
        delete next[coupon.id];
        return next;
      });
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-surface p-5 lg:p-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6">
          <h1 className="text-2xl font-black">Voucher của shop</h1>
          <p className="mt-1 text-sm text-on-surface-variant">Tạo và quản lý mã giảm giá riêng cho sản phẩm trong shop.</p>
        </header>

        <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
          <form onSubmit={createCoupon} className="rounded-2xl bg-surface-container-lowest p-5 shadow-sm ring-1 ring-outline-variant/40">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <TicketPercent size={20} />
              </div>
              <div>
                <p className="font-black">Tạo voucher</p>
                <p className="text-xs text-on-surface-variant">Mã sẽ được chuẩn hóa in hoa ở backend.</p>
              </div>
            </div>

            <div className="space-y-3">
              <input value={form.code} onChange={event => updateForm('code', event.target.value)} placeholder="Mã: SHOP10" className="h-11 w-full rounded-xl border border-outline-variant bg-surface-container px-3 text-sm outline-none focus:border-primary" />
              <input value={form.description} onChange={event => updateForm('description', event.target.value)} placeholder="Mô tả ngắn" className="h-11 w-full rounded-xl border border-outline-variant bg-surface-container px-3 text-sm outline-none focus:border-primary" />
              <select value={form.discountType} onChange={event => updateForm('discountType', event.target.value)} className="h-11 w-full rounded-xl border border-outline-variant bg-surface-container px-3 text-sm outline-none focus:border-primary">
                <option value="percentage">Giảm theo phần trăm</option>
                <option value="fixed">Giảm số tiền cố định</option>
              </select>
              <input type="number" min="1" max={form.discountType === 'percentage' ? 100 : undefined} value={form.discountValue} onChange={event => updateForm('discountValue', event.target.value)} placeholder={form.discountType === 'percentage' ? 'Giá trị: 10 (%)' : 'Giá trị: 50000'} className="h-11 w-full rounded-xl border border-outline-variant bg-surface-container px-3 text-sm outline-none focus:border-primary" />
              <input type="number" min="0" value={form.minOrderAmount} onChange={event => updateForm('minOrderAmount', event.target.value)} placeholder="Đơn tối thiểu" className="h-11 w-full rounded-xl border border-outline-variant bg-surface-container px-3 text-sm outline-none focus:border-primary" />
              {form.discountType === 'percentage' && (
                <input type="number" min="0" value={form.maxDiscountAmt} onChange={event => updateForm('maxDiscountAmt', event.target.value)} placeholder="Giảm tối đa" className="h-11 w-full rounded-xl border border-outline-variant bg-surface-container px-3 text-sm outline-none focus:border-primary" />
              )}
              <input type="number" min="1" value={form.usageLimit} onChange={event => updateForm('usageLimit', event.target.value)} placeholder="Số lượt dùng" className="h-11 w-full rounded-xl border border-outline-variant bg-surface-container px-3 text-sm outline-none focus:border-primary" />
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-on-surface-variant">Bắt đầu</span>
                <input type="datetime-local" min={minDateTime} value={form.startsAt} onChange={event => updateForm('startsAt', event.target.value)} className="h-11 w-full rounded-xl border border-outline-variant bg-surface-container px-3 text-sm outline-none focus:border-primary" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-on-surface-variant">Hết hạn</span>
                <input type="datetime-local" min={minDateTime} value={form.expiresAt} onChange={event => updateForm('expiresAt', event.target.value)} className="h-11 w-full rounded-xl border border-outline-variant bg-surface-container px-3 text-sm outline-none focus:border-primary" />
              </label>
            </div>

            {error && <p className="mt-3 rounded-xl bg-error/10 px-3 py-2 text-sm text-error">{error}</p>}

            <button disabled={submitting} className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-60">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Tạo voucher
            </button>
          </form>

          <section className="rounded-2xl bg-surface-container-lowest shadow-sm ring-1 ring-outline-variant/40">
            <div className="border-b border-outline-variant/30 px-5 py-4">
              <p className="font-black">Danh sách voucher</p>
              <p className="text-xs text-on-surface-variant">{coupons.length} mã của shop</p>
            </div>

            {loading ? (
              <div className="flex h-56 items-center justify-center">
                <Loader2 size={28} className="animate-spin text-primary" />
              </div>
            ) : coupons.length === 0 ? (
              <div className="p-10 text-center text-sm text-on-surface-variant">Shop chưa có voucher nào.</div>
            ) : (
              <div className="divide-y divide-outline-variant/30">
                {coupons.map(coupon => (
                  <article key={coupon.id} className="grid gap-4 p-5 xl:grid-cols-[1fr_auto] xl:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-black">{coupon.code}</p>
                        <span className={`rounded-lg px-2 py-1 text-xs font-bold ${coupon.is_active ? 'bg-success/10 text-success' : 'bg-surface-container text-on-surface-variant'}`}>
                          {coupon.is_active ? 'Đang bật' : 'Đã tắt'}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-on-surface-variant">{coupon.description || 'Voucher shop'}</p>
                      <p className="mt-1 text-xs text-on-surface-variant">
                        {coupon.discount_type === 'percentage' ? `Giảm ${formatNumber(coupon.discount_value)}%` : `Giảm ${formatNumber(coupon.discount_value)}đ`}
                        {coupon.min_order_amount ? ` · Đơn từ ${formatNumber(coupon.min_order_amount)}đ` : ''}
                        {coupon.usage_limit ? ` · ${coupon.used_count}/${coupon.usage_limit} lượt` : ''}
                      </p>
                      <p className="mt-1 text-xs text-on-surface-variant">
                        Hiệu lực {formatDateTime(coupon.starts_at)} · Hết hạn {formatDateTime(coupon.expires_at)}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 xl:min-w-[440px]">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <label className="flex items-center gap-2 rounded-xl border border-outline-variant bg-surface-container px-2">
                          <CalendarClock size={15} className="text-on-surface-variant" />
                          <input
                            type="datetime-local"
                            min={minDateTime}
                            value={dateDrafts[coupon.id]?.startsAt || ''}
                            onChange={event => setDateDrafts(prev => ({
                              ...prev,
                              [coupon.id]: { ...(prev[coupon.id] || { startsAt: '', expiresAt: '' }), startsAt: event.target.value }
                            }))}
                            className="h-10 min-w-0 bg-transparent text-sm outline-none"
                          />
                        </label>
                        <label className="flex items-center gap-2 rounded-xl border border-outline-variant bg-surface-container px-2">
                          <CalendarClock size={15} className="text-on-surface-variant" />
                          <input
                            type="datetime-local"
                            min={minDateTime}
                            value={dateDrafts[coupon.id]?.expiresAt || ''}
                            onChange={event => setDateDrafts(prev => ({
                              ...prev,
                              [coupon.id]: { ...(prev[coupon.id] || { startsAt: '', expiresAt: '' }), expiresAt: event.target.value }
                            }))}
                            className="h-10 min-w-0 bg-transparent text-sm outline-none"
                          />
                        </label>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                        <button onClick={() => updateDates(coupon)} disabled={workingId === coupon.id} className="h-10 rounded-xl border border-outline-variant px-3 text-sm font-bold text-on-surface-variant transition hover:border-primary/40 hover:text-primary disabled:opacity-60">
                          Lưu thời gian
                        </button>
                        <button onClick={() => toggleCoupon(coupon)} disabled={workingId === coupon.id} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-outline-variant px-3 text-sm font-bold text-on-surface-variant transition hover:border-primary/40 hover:text-primary disabled:opacity-60">
                          <Power size={15} />
                          {coupon.is_active ? 'Tắt' : 'Bật'}
                        </button>
                        <button onClick={() => deleteCoupon(coupon)} disabled={workingId === coupon.id} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-error/30 px-3 text-sm font-bold text-error transition hover:bg-error/10 disabled:opacity-60">
                          <Trash2 size={15} />
                          Xóa
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
