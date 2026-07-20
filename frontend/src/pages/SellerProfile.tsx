import { useEffect, useState } from 'react';
import { Loader2, Save, Store } from 'lucide-react';
import { sellerService } from '../services/sellerService';
import { Seller } from '../types';

const emptyForm = {
  shopName: '',
  shopPhone: '',
  shopAddress: '',
  pickupAddress: '',
  logoUrl: '',
  coverUrl: '',
  description: '',
  identityName: '',
  identityNumber: '',
  bankName: '',
  bankAccountNo: '',
  bankAccountHolder: '',
};

export default function SellerProfile() {
  const [seller, setSeller] = useState<Seller | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    sellerService.getSellerProfile()
      .then((data: Seller) => {
        setSeller(data);
        setForm({
          shopName: data.shop_name || '',
          shopPhone: data.shop_phone || '',
          shopAddress: data.shop_address || '',
          pickupAddress: data.pickup_address || '',
          logoUrl: data.logo_url || '',
          coverUrl: data.cover_url || '',
          description: data.description || '',
          identityName: data.identity_name || '',
          identityNumber: data.identity_number || '',
          bankName: data.bank_name || '',
          bankAccountNo: data.bank_account_no || '',
          bankAccountHolder: data.bank_account_holder || '',
        });
      })
      .catch(() => setError('Không tải được hồ sơ shop.'))
      .finally(() => setLoading(false));
  }, []);

  const update = (key: keyof typeof form, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setMessage('');
    setError('');
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.shopName.trim() || !form.shopPhone.trim() || !form.shopAddress.trim()) {
      setError('Tên shop, số điện thoại và địa chỉ shop là bắt buộc.');
      return;
    }

    setSaving(true);
    try {
      const updated = await sellerService.updateSellerProfile(form);
      setSeller(updated);
      setMessage('Đã lưu hồ sơ shop.');
    } catch (err: any) {
      setError(err?.data?.message || err?.message || 'Không lưu được hồ sơ shop.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <Loader2 size={30} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface p-5 lg:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white">
            <Store size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-black">Hồ sơ shop</h1>
            <p className="text-sm text-on-surface-variant">Xem và chỉnh thông tin cửa hàng, định danh, ngân hàng.</p>
          </div>
        </div>

        <form onSubmit={save} className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <section className="space-y-5 rounded-2xl bg-surface-container-lowest p-5 shadow-sm ring-1 ring-outline-variant/40">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tên shop *" value={form.shopName} onChange={v => update('shopName', v)} />
              <Field label="Số điện thoại shop *" value={form.shopPhone} onChange={v => update('shopPhone', v)} />
              <Field label="Địa chỉ shop *" value={form.shopAddress} onChange={v => update('shopAddress', v)} className="sm:col-span-2" />
              <Field label="Địa chỉ lấy hàng" value={form.pickupAddress} onChange={v => update('pickupAddress', v)} className="sm:col-span-2" />
              <Field label="Logo URL" value={form.logoUrl} onChange={v => update('logoUrl', v)} />
              <Field label="Ảnh bìa URL" value={form.coverUrl} onChange={v => update('coverUrl', v)} />
            </div>

            <label className="block">
              <span className="mb-1.5 block text-sm font-bold">Mô tả shop</span>
              <textarea
                value={form.description}
                onChange={e => update('description', e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-outline-variant bg-surface-container px-4 py-3 text-sm outline-none focus:border-primary"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Họ tên trên CCCD" value={form.identityName} onChange={v => update('identityName', v)} />
              <Field label="Số CCCD" value={form.identityNumber} onChange={v => update('identityNumber', v)} />
              <Field label="Ngân hàng" value={form.bankName} onChange={v => update('bankName', v)} />
              <Field label="Số tài khoản" value={form.bankAccountNo} onChange={v => update('bankAccountNo', v)} />
              <Field label="Chủ tài khoản" value={form.bankAccountHolder} onChange={v => update('bankAccountHolder', v)} className="sm:col-span-2" />
            </div>

            {error && <p className="rounded-xl bg-error/10 px-3 py-2 text-sm text-error">{error}</p>}
            {message && <p className="rounded-xl bg-success/10 px-3 py-2 text-sm text-success">{message}</p>}

            <button disabled={saving} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-white disabled:opacity-60">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Lưu hồ sơ shop
            </button>
          </section>

          <aside className="rounded-2xl bg-surface-container-lowest p-5 shadow-sm ring-1 ring-outline-variant/40">
            <div className="h-32 overflow-hidden rounded-2xl bg-surface-container">
              {form.coverUrl ? <img src={form.coverUrl} alt="Ảnh bìa shop" className="h-full w-full object-cover" /> : null}
            </div>
            <div className="-mt-8 ml-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-primary text-white ring-4 ring-surface-container-lowest">
              {form.logoUrl ? <img src={form.logoUrl} alt="Logo shop" className="h-full w-full object-cover" /> : <Store size={26} />}
            </div>
            <h2 className="mt-3 font-black">{form.shopName || seller?.shop_name || 'Tên shop'}</h2>
            <p className="mt-1 text-sm text-on-surface-variant">{form.description || 'Mô tả shop sẽ hiển thị ở đây.'}</p>
            <div className="mt-4 space-y-2 text-xs text-on-surface-variant">
              <p>SĐT: {form.shopPhone || '-'}</p>
              <p>Địa chỉ: {form.shopAddress || '-'}</p>
              <p>Ngân hàng: {form.bankName || '-'}</p>
            </div>
          </aside>
        </form>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, className = '' }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-bold">{label}</span>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-outline-variant bg-surface-container px-4 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}
