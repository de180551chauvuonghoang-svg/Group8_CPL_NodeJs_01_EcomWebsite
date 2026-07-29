import { useState, useContext } from 'react';
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
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { sellerService } from '../services/sellerService';
import ImageUploadField from '../components/common/ImageUploadField';
import type { ProductImage } from '../types';
import {
  isValidOptionalBankAccount,
  isValidOptionalIdentityNumber,
  isValidShopPhone,
} from '../utils/sellerValidation';

export default function BecomeSeller() {
  const navigate = useNavigate();
  const authCtx = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
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
      const data = await sellerService.registerSeller(
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
      // Cập nhật user trong AuthContext với role mới và token mới
      if (authCtx && data.user) {
        authCtx.updateUser(data.user);
      }
      navigate('/seller/dashboard');
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err?.message || 'Đăng ký thất bại. Vui lòng thử lại!';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

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
                  <span>Đang tạo cửa hàng...</span>
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  <span>Mở Cửa Hàng Ngay</span>
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
