import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Landmark,
  Loader2,
  Pencil,
  Save,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import SellerPageHeader from '../components/seller/SellerPageHeader';
import SellerStatePanel from '../components/seller/SellerStatePanel';
import { useToast } from '../context/ToastContext';
import { sellerService } from '../services/sellerService';
import { walletService } from '../services/walletService';
import type { Seller, SellerWalletOverview } from '../types';
import { getApiErrorMessage } from '../utils/apiErrors';

const EMPTY_BANK_FORM = {
  bankName: '',
  bankAccountNo: '',
  bankAccountHolder: '',
};

const getBankForm = (seller: Seller) => ({
  bankName: seller.bank_name || '',
  bankAccountNo: seller.bank_account_no || '',
  bankAccountHolder: seller.bank_account_holder || '',
});

const hasCompleteBankInfo = (seller: Seller) =>
  Boolean(seller.bank_name && seller.bank_account_no && seller.bank_account_holder);

const maskAccountNumber = (value: string) => {
  if (!value) return '-';
  if (value.length <= 4) return value;
  return `${'•'.repeat(Math.min(8, value.length - 4))}${value.slice(-4)}`;
};

export default function SellerBank() {
  const toast = useToast();
  const [seller, setSeller] = useState<Seller | null>(null);
  const [wallet, setWallet] = useState<SellerWalletOverview | null>(null);
  const [form, setForm] = useState(EMPTY_BANK_FORM);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [profileData, walletData] = await Promise.all([
        sellerService.getSellerProfile() as Promise<Seller>,
        walletService.getWallet(),
      ]);
      setSeller(profileData);
      setWallet(walletData);
      setForm(getBankForm(profileData));
      setEditing(!hasCompleteBankInfo(profileData));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Không thể tải thông tin ngân hàng.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => void load(), []);

  const update = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError('');
  };

  const cancelEditing = () => {
    if (!seller) return;
    setForm(getBankForm(seller));
    setError('');
    setEditing(false);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!seller) return;

    const bankName = form.bankName.trim();
    const bankAccountNo = form.bankAccountNo.trim();
    const bankAccountHolder = form.bankAccountHolder.trim().toUpperCase();
    if (!bankName) {
      setError('Tên ngân hàng là bắt buộc.');
      return;
    }
    if (!/^\d{6,20}$/.test(bankAccountNo)) {
      setError('Số tài khoản phải gồm từ 6 đến 20 chữ số.');
      return;
    }
    if (!bankAccountHolder) {
      setError('Tên chủ tài khoản là bắt buộc.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const updated = await sellerService.updateSellerProfile({
        shopName: seller.shop_name,
        shopPhone: seller.shop_phone,
        shopAddress: seller.shop_address,
        pickupAddress: seller.pickup_address || seller.shop_address,
        logoUrl: seller.logo_url || '',
        logoPublicId: seller.logo_public_id || '',
        coverUrl: seller.cover_url || '',
        coverPublicId: seller.cover_public_id || '',
        description: seller.description || '',
        identityName: seller.identity_name || '',
        identityNumber: seller.identity_number || '',
        bankName,
        bankAccountNo,
        bankAccountHolder,
      });
      setSeller(updated);
      setForm({ bankName, bankAccountNo, bankAccountHolder });
      setWallet(await walletService.getWallet());
      setEditing(false);
      toast.success('Đã cập nhật ngân hàng', 'Yêu cầu rút tiền mới sẽ dùng thông tin này.');
    } catch (requestError) {
      const message = getApiErrorMessage(requestError, 'Không thể lưu thông tin ngân hàng.');
      setError(message);
      toast.error('Cập nhật chưa thành công', message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface p-5 lg:p-8">
        <SellerStatePanel state="loading" title="Đang tải thông tin ngân hàng" />
      </div>
    );
  }

  const bankName = wallet?.bankInfo.bankName || seller?.bank_name || '-';
  const accountHolder = wallet?.bankInfo.accountHolder || seller?.bank_account_holder || '-';
  const maskedAccountNo =
    wallet?.bankInfo.maskedAccountNo || maskAccountNumber(seller?.bank_account_no || '');
  const hasBankInfo = Boolean(seller && hasCompleteBankInfo(seller));

  return (
    <div className="min-h-screen bg-surface p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl">
        <SellerPageHeader
          icon={Landmark}
          eyebrow="Cửa hàng"
          title="Thông tin ngân hàng"
          description="Quản lý tài khoản nhận tiền của shop. Số tài khoản được che khi hiển thị ở các màn tài chính."
          actions={
            <Link
              to="/seller/wallet"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-outline-variant bg-surface-container-lowest px-4 text-sm font-bold transition hover:border-primary/40 hover:text-primary"
            >
              <ArrowLeft size={17} /> Về ví shop
            </Link>
          }
        />

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-md bg-error/10 px-4 py-3 text-sm font-semibold text-error"
          >
            {error}
          </div>
        )}

        <section aria-label="Tài khoản nhận tiền">
          <div className="relative mx-auto max-w-2xl overflow-hidden rounded-lg border border-primary/20 bg-primary/5 p-5 sm:p-7">
            <Landmark
              aria-hidden="true"
              size={150}
              strokeWidth={1}
              className="pointer-events-none absolute -bottom-8 right-4 text-primary/10"
            />

            <div className="relative flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-2 text-sm text-on-surface">
                <UserRound size={17} className="shrink-0" />
                <span>Chủ tài khoản:</span>
                <strong className="truncate">{accountHolder}</strong>
              </div>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-bold text-white transition hover:bg-primary/90"
              >
                <Pencil size={15} /> Sửa
              </button>
            </div>

            <dl className="relative mt-7 grid gap-x-8 gap-y-4 text-sm sm:grid-cols-[150px_1fr]">
              <BankInfoRow label="Tên ngân hàng" value={bankName} />
              <BankInfoRow label="Số tài khoản" value={maskedAccountNo} />
              <BankInfoRow
                label="Trạng thái"
                value={hasBankInfo ? 'Đã cập nhật' : 'Chưa cập nhật'}
              />
            </dl>
          </div>
        </section>

        {editing && (
          <form
            onSubmit={save}
            className="mt-5 rounded-lg border border-outline-variant/40 bg-surface-container-lowest p-5 sm:p-6"
          >
            <div className="flex items-start justify-between gap-4 border-b border-outline-variant/35 pb-5">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <ShieldCheck size={19} />
                </span>
                <div>
                  <h2 className="font-black text-on-surface">Cập nhật tài khoản nhận tiền</h2>
                  <p className="mt-1 text-sm leading-6 text-on-surface-variant">
                    Kiểm tra kỹ tên chủ tài khoản và số tài khoản trước khi lưu.
                  </p>
                </div>
              </div>
              {hasBankInfo && (
                <button
                  type="button"
                  onClick={cancelEditing}
                  title="Đóng biểu mẫu"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-on-surface-variant hover:bg-surface-container"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <BankField
                label="Tên ngân hàng *"
                value={form.bankName}
                onChange={(value) => update('bankName', value)}
              />
              <BankField
                label="Số tài khoản *"
                value={form.bankAccountNo}
                onChange={(value) => update('bankAccountNo', value.replace(/\D/g, '').slice(0, 20))}
                inputMode="numeric"
              />
              <BankField
                label="Tên chủ tài khoản *"
                value={form.bankAccountHolder}
                onChange={(value) => update('bankAccountHolder', value.toUpperCase())}
                className="sm:col-span-2"
              />
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-bold text-white disabled:opacity-60"
              >
                {saving ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
                {saving ? 'Đang lưu...' : 'Lưu thông tin ngân hàng'}
              </button>
              {hasBankInfo && (
                <button
                  type="button"
                  onClick={cancelEditing}
                  disabled={saving}
                  className="inline-flex h-11 items-center justify-center rounded-md border border-outline-variant px-5 text-sm font-bold text-on-surface disabled:opacity-60"
                >
                  Hủy
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function BankField({
  label,
  value,
  onChange,
  inputMode,
  className = '',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  inputMode?: 'text' | 'numeric';
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="mb-1.5 block text-sm font-bold text-on-surface">{label}</span>
      <input
        value={value}
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-md border border-outline-variant bg-surface-container px-4 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}

function BankInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-on-surface-variant">{label}</dt>
      <dd className="break-words font-bold text-on-surface">{value}</dd>
    </>
  );
}
