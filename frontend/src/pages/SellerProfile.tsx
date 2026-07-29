import { useEffect, useState } from 'react';
import { Loader2, Save, Store } from 'lucide-react';
import ImageUploadField from '../components/common/ImageUploadField';
import SellerPageHeader from '../components/seller/SellerPageHeader';
import SellerStatePanel from '../components/seller/SellerStatePanel';
import { sellerService } from '../services/sellerService';
import type { ProductImage, Seller } from '../types';
import {
  isValidOptionalBankAccount,
  isValidOptionalIdentityNumber,
  isValidShopPhone,
} from '../utils/sellerValidation';

const EMPTY_FORM = {
  shopName: '',
  shopPhone: '',
  shopAddress: '',
  pickupAddress: '',
  logoUrl: '',
  logoPublicId: '',
  coverUrl: '',
  coverPublicId: '',
  description: '',
  identityName: '',
  identityNumber: '',
  bankName: '',
  bankAccountNo: '',
  bankAccountHolder: '',
};

export default function SellerProfile() {
  const [seller, setSeller] = useState<Seller | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    sellerService
      .getSellerProfile()
      .then((data: Seller) => {
        setSeller(data);
        setForm({
          shopName: data.shop_name || '',
          shopPhone: data.shop_phone || '',
          shopAddress: data.shop_address || '',
          pickupAddress: data.pickup_address || '',
          logoUrl: data.logo_url || '',
          logoPublicId: data.logo_public_id || '',
          coverUrl: data.cover_url || '',
          coverPublicId: data.cover_public_id || '',
          description: data.description || '',
          identityName: data.identity_name || '',
          identityNumber: data.identity_number || '',
          bankName: data.bank_name || '',
          bankAccountNo: data.bank_account_no || '',
          bankAccountHolder: data.bank_account_holder || '',
        });
      })
      .catch((requestError: any) =>
        setError(
          requestError?.data?.message || requestError?.message || 'Không tải được hồ sơ shop.',
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  const update = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setMessage('');
    setError('');
  };

  const setLogo = (images: ProductImage[]) => {
    const image = images[0];
    setForm((current) => ({
      ...current,
      logoUrl: image?.url || '',
      logoPublicId: image?.publicId || '',
    }));
  };

  const setCover = (images: ProductImage[]) => {
    const image = images[0];
    setForm((current) => ({
      ...current,
      coverUrl: image?.url || '',
      coverPublicId: image?.publicId || '',
    }));
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.shopName.trim() || !form.shopPhone.trim() || !form.shopAddress.trim()) {
      setError('Tên shop, số điện thoại và địa chỉ shop là bắt buộc.');
      return;
    }
    if (!isValidShopPhone(form.shopPhone)) {
      setError('Số điện thoại shop phải gồm 10 chữ số và bắt đầu bằng số 0.');
      return;
    }
    if (!isValidOptionalIdentityNumber(form.identityNumber)) {
      setError('Số CCCD phải gồm đúng 12 chữ số.');
      return;
    }
    if (!isValidOptionalBankAccount(form.bankAccountNo)) {
      setError('Số tài khoản phải gồm từ 6 đến 20 chữ số.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const updated = await sellerService.updateSellerProfile(form);
      setSeller(updated);
      setMessage('Đã lưu hồ sơ shop.');
    } catch (requestError: any) {
      setError(
        requestError?.data?.message || requestError?.message || 'Không lưu được hồ sơ shop.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface p-5 lg:p-8">
        <SellerStatePanel state="loading" title="Đang tải hồ sơ shop" />
      </div>
    );
  }

  const logoImages: ProductImage[] = form.logoUrl
    ? [{ url: form.logoUrl, publicId: form.logoPublicId || null, isPrimary: true }]
    : [];
  const coverImages: ProductImage[] = form.coverUrl
    ? [{ url: form.coverUrl, publicId: form.coverPublicId || null, isPrimary: true }]
    : [];

  return (
    <div className="min-h-screen bg-surface p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl">
        <SellerPageHeader
          icon={Store}
          eyebrow="Thiết lập"
          title="Hồ sơ shop"
          description="Quản lý hình ảnh, thông tin liên hệ, định danh và tài khoản nhận tiền."
        />

        <form onSubmit={save} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section className="space-y-6 rounded-lg border border-outline-variant/40 bg-surface-container-lowest p-5 sm:p-6">
            <div>
              <h2 className="text-base font-black">Thông tin cửa hàng</h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                Thông tin này được hiển thị trên trang shop công khai.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Tên shop *"
                value={form.shopName}
                onChange={(value) => update('shopName', value)}
              />
              <Field
                label="Số điện thoại shop *"
                value={form.shopPhone}
                onChange={(value) => update('shopPhone', value.replace(/\D/g, '').slice(0, 10))}
                inputMode="numeric"
              />
              <Field
                label="Địa chỉ shop *"
                value={form.shopAddress}
                onChange={(value) => update('shopAddress', value)}
                className="sm:col-span-2"
              />
              <Field
                label="Địa chỉ lấy hàng"
                value={form.pickupAddress}
                onChange={(value) => update('pickupAddress', value)}
                className="sm:col-span-2"
              />
            </div>

            <label className="block">
              <span className="mb-1.5 block text-sm font-bold">Mô tả shop</span>
              <textarea
                value={form.description}
                onChange={(event) => update('description', event.target.value)}
                rows={4}
                maxLength={2000}
                className="w-full rounded-md border border-outline-variant bg-surface-container px-4 py-3 text-sm outline-none focus:border-primary"
                placeholder="Giới thiệu ngắn về cửa hàng, sản phẩm và cam kết dịch vụ"
              />
            </label>

            <div className="grid gap-5 sm:grid-cols-2">
              <ImageUploadField
                label="Logo shop"
                purpose="shop_logo"
                images={logoImages}
                onChange={setLogo}
                maxImages={1}
                aspect="square"
                disabled={saving}
              />
              <ImageUploadField
                label="Ảnh bìa shop"
                purpose="shop_cover"
                images={coverImages}
                onChange={setCover}
                maxImages={1}
                aspect="cover"
                disabled={saving}
              />
            </div>

            <div className="border-t border-outline-variant/40 pt-6">
              <h2 className="text-base font-black">Định danh và thanh toán</h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                Dùng để xác minh chủ shop và nhận tiền từ hệ thống.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Họ tên trên CCCD"
                value={form.identityName}
                onChange={(value) => update('identityName', value)}
              />
              <Field
                label="Số CCCD"
                value={form.identityNumber}
                onChange={(value) =>
                  update('identityNumber', value.replace(/\D/g, '').slice(0, 12))
                }
                inputMode="numeric"
              />
              <Field
                label="Ngân hàng"
                value={form.bankName}
                onChange={(value) => update('bankName', value)}
              />
              <Field
                label="Số tài khoản"
                value={form.bankAccountNo}
                onChange={(value) => update('bankAccountNo', value.replace(/\D/g, '').slice(0, 20))}
                inputMode="numeric"
              />
              <Field
                label="Chủ tài khoản"
                value={form.bankAccountHolder}
                onChange={(value) => update('bankAccountHolder', value)}
                className="sm:col-span-2"
              />
            </div>

            {error && (
              <p className="rounded-md bg-error/10 px-4 py-3 text-sm font-semibold text-error">
                {error}
              </p>
            )}
            {message && (
              <p className="rounded-md bg-success/10 px-4 py-3 text-sm font-semibold text-success">
                {message}
              </p>
            )}

            <button
              disabled={saving}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-bold text-white disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Lưu hồ sơ shop
            </button>
          </section>

          <aside className="h-fit overflow-hidden rounded-lg border border-outline-variant/40 bg-surface-container-lowest lg:sticky lg:top-6">
            <div className="aspect-[8/3] bg-surface-container">
              {form.coverUrl && (
                <img
                  src={form.coverUrl}
                  alt="Ảnh bìa shop"
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <div className="p-5">
              <div className="-mt-12 flex h-20 w-20 items-center justify-center overflow-hidden rounded-md bg-primary text-white ring-4 ring-surface-container-lowest">
                {form.logoUrl ? (
                  <img src={form.logoUrl} alt="Logo shop" className="h-full w-full object-cover" />
                ) : (
                  <Store size={30} />
                )}
              </div>
              <h2 className="mt-4 text-xl font-black">
                {form.shopName || seller?.shop_name || 'Tên shop'}
              </h2>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                {form.description || 'Mô tả shop sẽ hiển thị ở đây.'}
              </p>
              <dl className="mt-5 space-y-3 border-t border-outline-variant/40 pt-4 text-sm">
                <PreviewRow label="Số điện thoại" value={form.shopPhone} />
                <PreviewRow label="Địa chỉ" value={form.shopAddress} />
                <PreviewRow label="Ngân hàng" value={form.bankName} />
              </dl>
            </div>
          </aside>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  className = '',
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  inputMode?: 'text' | 'numeric';
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-bold">{label}</span>
      <input
        value={value}
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-md border border-outline-variant bg-surface-container px-4 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[100px_1fr] gap-3">
      <dt className="text-on-surface-variant">{label}</dt>
      <dd className="break-words font-semibold text-on-surface">{value || '-'}</dd>
    </div>
  );
}
