import { useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BadgeCheck,
  Banknote,
  Store,
  Phone,
  MapPin,
  FileText,
  Sparkles,
  ArrowRight,
  ShoppingBag,
  Clock3,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { sellerService } from '../services/sellerService';
import ImageUploadField from '../components/common/ImageUploadField';
import type { ProductImage, SellerApplication } from '../types';
import {
  isValidOptionalBankAccount,
  isValidOptionalIdentityNumber,
  isValidShopPhone,
} from '../utils/sellerValidation';

export default function BecomeSeller() {
  const navigate = useNavigate();
  const authCtx = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [checkingApplication, setCheckingApplication] = useState(true);
  const [applicationError, setApplicationError] = useState('');
  const [application, setApplication] = useState<SellerApplication | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    shopName: '',
    shopPhone: '',
    shopAddress: '',
    pickupAddress: '',
    description: '',
    logoUrl: '',
    logoPublicId: '',
    coverUrl: '',
    coverPublicId: '',
    identityName: '',
    identityNumber: '',
    bankName: '',
    bankAccountNo: '',
    bankAccountHolder: '',
  });

  const loadApplication = useCallback(
    async (silent = false) => {
      if (!silent) setCheckingApplication(true);
      setApplicationError('');
      try {
        const nextApplication = await sellerService.getSellerApplication();
        setApplication(nextApplication);

        if (nextApplication?.status === 'active') {
          await authCtx?.refreshUser();
          navigate('/seller/dashboard', { replace: true });
        }
      } catch (requestError: any) {
        setApplicationError(
          requestError?.data?.message ||
            requestError?.message ||
            'Không thể kiểm tra trạng thái đăng ký người bán.',
        );
      } finally {
        if (!silent) setCheckingApplication(false);
      }
    },
    [authCtx, navigate],
  );

  useEffect(() => {
    void loadApplication();
  }, [loadApplication]);

  useEffect(() => {
    if (application?.status !== 'pending') return undefined;

    const refreshOnFocus = () => void loadApplication(true);
    window.addEventListener('focus', refreshOnFocus);
    return () => window.removeEventListener('focus', refreshOnFocus);
  }, [application?.status, loadApplication]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.shopName.trim() || !form.shopPhone.trim() || !form.shopAddress.trim()) {
      setError('Vui lòng điền đầy đủ tên, số điện thoại và địa chỉ cửa hàng!');
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

    setLoading(true);
    try {
      await sellerService.registerSeller(
        form.shopName,
        form.shopPhone,
        form.shopAddress,
        form.description,
        {
          pickupAddress: form.pickupAddress,
          logoUrl: form.logoUrl,
          logoPublicId: form.logoPublicId,
          coverUrl: form.coverUrl,
          coverPublicId: form.coverPublicId,
          identityName: form.identityName,
          identityNumber: form.identityNumber,
          bankName: form.bankName,
          bankAccountNo: form.bankAccountNo,
          bankAccountHolder: form.bankAccountHolder,
        },
      );
      await loadApplication();
    } catch (err: any) {
      const code = err?.data?.code;
      if (
        code === 'SELLER_APPLICATION_PENDING' ||
        code === 'SELLER_ALREADY_ACTIVE' ||
        code === 'SELLER_SUSPENDED'
      ) {
        await loadApplication();
        return;
      }
      const msg = err?.data?.message || err?.message || 'Đăng ký thất bại. Vui lòng thử lại!';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (checkingApplication) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface text-primary">
        <RefreshCw size={30} className="animate-spin" />
        <span className="ml-3 font-semibold">Đang kiểm tra hồ sơ người bán...</span>
      </div>
    );
  }

  if (applicationError) {
    return (
      <ApplicationStateCard
        icon={<ShieldAlert size={34} />}
        title="Chưa thể kiểm tra hồ sơ"
        description={applicationError}
        actionLabel="Thử lại"
        onAction={() => void loadApplication()}
        onBack={() => navigate('/')}
      />
    );
  }

  if (application?.status === 'pending') {
    return (
      <ApplicationStateCard
        icon={<Clock3 size={34} />}
        title="Hồ sơ đang chờ duyệt"
        description={`Yêu cầu mở ${application.shopName || 'cửa hàng'} đã được gửi. Bạn vẫn dùng tài khoản customer cho đến khi Admin phê duyệt.`}
        meta={
          application.updatedAt
            ? `Cập nhật: ${formatApplicationDate(application.updatedAt)}`
            : undefined
        }
        actionLabel="Kiểm tra trạng thái"
        onAction={() => void loadApplication()}
        onBack={() => navigate('/')}
      />
    );
  }

  if (application?.status === 'suspended') {
    return (
      <ApplicationStateCard
        icon={<ShieldAlert size={34} />}
        title="Cửa hàng đang bị tạm ngưng"
        description="Bạn chưa thể truy cập Kênh người bán hoặc gửi lại hồ sơ. Vui lòng liên hệ bộ phận hỗ trợ để được kiểm tra."
        actionLabel="Kiểm tra lại"
        onAction={() => void loadApplication()}
        onBack={() => navigate('/')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-xl relative z-10"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-3xl mb-4 shadow-2xl shadow-primary/30"
          >
            <Store size={36} className="text-white" />
          </motion.div>
          <h1 className="text-3xl font-black text-on-surface mb-2">Mở Cửa Hàng</h1>
          <p className="text-on-surface-variant">
            Bắt đầu hành trình kinh doanh online của bạn trên E-Com FPT
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-surface-container-lowest/80 backdrop-blur-xl rounded-3xl border border-outline-variant/30 shadow-2xl p-8">
          {application?.status === 'rejected' && (
            <div className="mb-5 rounded-md border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
              Hồ sơ trước chưa được duyệt. Hãy kiểm tra lại thông tin và gửi lại yêu cầu.
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Shop Name */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-on-surface">
                <Store size={16} className="text-primary" />
                Tên Cửa Hàng *
              </label>
              <div className="relative">
                <input
                  id="shopName"
                  name="shopName"
                  type="text"
                  value={form.shopName}
                  onChange={handleChange}
                  placeholder="Vd: Shop Công Nghệ ABC"
                  disabled={loading}
                  className="w-full bg-surface-container rounded-2xl px-5 py-4 text-on-surface placeholder:text-on-surface-variant/50 border-2 border-outline-variant/50 focus:border-primary/50 focus:outline-none transition-all text-sm font-medium"
                />
              </div>
            </div>

            {/* Shop Phone */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-on-surface">
                <Phone size={16} className="text-primary" />
                Số Điện Thoại Cửa Hàng *
              </label>
              <input
                id="shopPhone"
                name="shopPhone"
                type="tel"
                value={form.shopPhone}
                onChange={handleChange}
                placeholder="Vd: 0901234567"
                inputMode="numeric"
                maxLength={10}
                disabled={loading}
                className="w-full bg-surface-container rounded-2xl px-5 py-4 text-on-surface placeholder:text-on-surface-variant/50 border-2 border-outline-variant/50 focus:border-primary/50 focus:outline-none transition-all text-sm font-medium"
              />
            </div>

            {/* Shop Address */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-on-surface">
                <MapPin size={16} className="text-primary" />
                Địa Chỉ Cửa Hàng *
              </label>
              <input
                id="shopAddress"
                name="shopAddress"
                type="text"
                value={form.shopAddress}
                onChange={handleChange}
                placeholder="Vd: 123 Nguyễn Văn A, Quận 1, TP.HCM"
                disabled={loading}
                className="w-full bg-surface-container rounded-2xl px-5 py-4 text-on-surface placeholder:text-on-surface-variant/50 border-2 border-outline-variant/50 focus:border-primary/50 focus:outline-none transition-all text-sm font-medium"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-on-surface">
                <MapPin size={16} className="text-primary" />
                Địa Chỉ Lấy Hàng
                <span className="text-on-surface-variant text-xs font-normal">
                  (có thể giống địa chỉ shop)
                </span>
              </label>
              <input
                id="pickupAddress"
                name="pickupAddress"
                type="text"
                value={form.pickupAddress}
                onChange={handleChange}
                placeholder="Vd: Kho nhận hàng của shop"
                disabled={loading}
                className="w-full bg-surface-container rounded-2xl px-5 py-4 text-on-surface placeholder:text-on-surface-variant/50 border-2 border-outline-variant/50 focus:border-primary/50 focus:outline-none transition-all text-sm font-medium"
              />
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <ImageUploadField
                label="Logo shop"
                purpose="shop_logo"
                images={
                  form.logoUrl
                    ? [{ url: form.logoUrl, publicId: form.logoPublicId, isPrimary: true }]
                    : []
                }
                onChange={(images: ProductImage[]) => {
                  const image = images[0];
                  setForm((current) => ({
                    ...current,
                    logoUrl: image?.url || '',
                    logoPublicId: image?.publicId || '',
                  }));
                }}
                maxImages={1}
                aspect="square"
                uploadScope="application"
                disabled={loading}
              />
              <ImageUploadField
                label="Ảnh bìa shop"
                purpose="shop_cover"
                images={
                  form.coverUrl
                    ? [{ url: form.coverUrl, publicId: form.coverPublicId, isPrimary: true }]
                    : []
                }
                onChange={(images: ProductImage[]) => {
                  const image = images[0];
                  setForm((current) => ({
                    ...current,
                    coverUrl: image?.url || '',
                    coverPublicId: image?.publicId || '',
                  }));
                }}
                maxImages={1}
                aspect="cover"
                uploadScope="application"
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-on-surface">
                  <BadgeCheck size={16} className="text-primary" />
                  Họ Tên Trên CCCD
                </label>
                <input
                  id="identityName"
                  name="identityName"
                  type="text"
                  value={form.identityName}
                  onChange={handleChange}
                  placeholder="Vd: Nguyễn Văn A"
                  disabled={loading}
                  className="w-full bg-surface-container rounded-2xl px-5 py-4 text-on-surface placeholder:text-on-surface-variant/50 border-2 border-outline-variant/50 focus:border-primary/50 focus:outline-none transition-all text-sm font-medium"
                />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-on-surface">
                  <BadgeCheck size={16} className="text-primary" />
                  Số CCCD
                </label>
                <input
                  id="identityNumber"
                  name="identityNumber"
                  type="text"
                  value={form.identityNumber}
                  onChange={handleChange}
                  placeholder="12 chữ số"
                  disabled={loading}
                  className="w-full bg-surface-container rounded-2xl px-5 py-4 text-on-surface placeholder:text-on-surface-variant/50 border-2 border-outline-variant/50 focus:border-primary/50 focus:outline-none transition-all text-sm font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-on-surface">
                  <Banknote size={16} className="text-primary" />
                  Ngân Hàng
                </label>
                <input
                  id="bankName"
                  name="bankName"
                  type="text"
                  value={form.bankName}
                  onChange={handleChange}
                  placeholder="Vd: MBBank"
                  disabled={loading}
                  className="w-full bg-surface-container rounded-2xl px-5 py-4 text-on-surface placeholder:text-on-surface-variant/50 border-2 border-outline-variant/50 focus:border-primary/50 focus:outline-none transition-all text-sm font-medium"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-on-surface">Số Tài Khoản</label>
                <input
                  id="bankAccountNo"
                  name="bankAccountNo"
                  type="text"
                  value={form.bankAccountNo}
                  onChange={handleChange}
                  placeholder="0123456789"
                  disabled={loading}
                  className="w-full bg-surface-container rounded-2xl px-5 py-4 text-on-surface placeholder:text-on-surface-variant/50 border-2 border-outline-variant/50 focus:border-primary/50 focus:outline-none transition-all text-sm font-medium"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-on-surface">Chủ Tài Khoản</label>
                <input
                  id="bankAccountHolder"
                  name="bankAccountHolder"
                  type="text"
                  value={form.bankAccountHolder}
                  onChange={handleChange}
                  placeholder="NGUYEN VAN A"
                  disabled={loading}
                  className="w-full bg-surface-container rounded-2xl px-5 py-4 text-on-surface placeholder:text-on-surface-variant/50 border-2 border-outline-variant/50 focus:border-primary/50 focus:outline-none transition-all text-sm font-medium"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-on-surface">
                <FileText size={16} className="text-primary" />
                Mô Tả Cửa Hàng
                <span className="text-on-surface-variant text-xs font-normal">(tuỳ chọn)</span>
              </label>
              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Mô tả ngắn gọn về cửa hàng của bạn..."
                disabled={loading}
                rows={3}
                className="w-full bg-surface-container rounded-2xl px-5 py-4 text-on-surface placeholder:text-on-surface-variant/50 border-2 border-outline-variant/50 focus:border-primary/50 focus:outline-none transition-all text-sm font-medium resize-none"
              />
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-error bg-error/10 border border-error/20 rounded-2xl px-4 py-3 text-sm"
              >
                <span className="material-symbols-outlined text-base">error</span>
                {error}
              </motion.div>
            )}

            {/* Free Shipping Note */}
            <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-2xl px-4 py-3">
              <ShoppingBag size={18} className="text-primary shrink-0" />
              <p className="text-xs text-on-surface-variant">
                Tất cả sản phẩm của bạn sẽ được mặc định{' '}
                <span className="font-bold text-primary">miễn phí vận chuyển</span> để tối ưu trải
                nghiệm khách hàng.
              </p>
            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-primary to-secondary text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Đang gửi yêu cầu...</span>
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  <span>Gửi Yêu Cầu Mở Cửa Hàng</span>
                  <ArrowRight size={18} />
                </>
              )}
            </motion.button>
          </form>
        </div>

        <p className="text-center text-xs text-on-surface-variant mt-6">
          Bằng cách đăng ký, bạn đồng ý với{' '}
          <span className="text-primary font-semibold cursor-pointer">Điều Khoản Người Bán</span>{' '}
          của E-Com FPT
        </p>
      </motion.div>
    </div>
  );
}

function formatApplicationDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

interface ApplicationStateCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  meta?: string;
  actionLabel: string;
  onAction: () => void;
  onBack: () => void;
}

function ApplicationStateCard({
  icon,
  title,
  description,
  meta,
  actionLabel,
  onAction,
  onBack,
}: ApplicationStateCardProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface p-4">
      <section className="w-full max-w-lg rounded-md border border-outline-variant bg-surface-container-lowest p-8 text-center shadow-xl">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-md bg-primary/10 text-primary">
          {icon}
        </div>
        <h1 className="text-2xl font-black text-on-surface">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-on-surface-variant">{description}</p>
        {meta && <p className="mt-2 text-xs font-semibold text-on-surface-variant">{meta}</p>}
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onBack}
            className="h-11 rounded-md border border-outline-variant font-bold text-on-surface"
          >
            Về trang chủ
          </button>
          <button
            type="button"
            onClick={onAction}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary font-bold text-white"
          >
            <RefreshCw size={17} />
            {actionLabel}
          </button>
        </div>
      </section>
    </main>
  );
}
