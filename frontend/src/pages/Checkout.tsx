import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../context/CartContext';
import { AuthContext } from '../context/AuthContext';
import { paymentService, ShippingInfo } from '../services/paymentService';
import { addressService, Address } from '../services/addressService';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (v: number) => new Intl.NumberFormat('vi-VN').format(v) + '₫';

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepDot({ step, current, label }: { step: number; current: number; label: string }) {
  const done   = step < current;
  const active = step === current;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300
        ${done   ? 'bg-primary border-primary text-white'  : ''}
        ${active ? 'border-primary text-primary bg-primary/10' : ''}
        ${!done && !active ? 'border-white/15 text-on-surface-variant' : ''}`}>
        {done
          ? <span className="material-symbols-outlined text-[18px]">check</span>
          : step}
      </div>
      <span className={`text-[11px] font-semibold ${active ? 'text-primary' : 'text-on-surface-variant'}`}>{label}</span>
    </div>
  );
}

// ─── Input component ───────────────────────────────────────────────────────────
function Field({ label, icon, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; icon: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">{label}</label>
      <div className="relative">
        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">{icon}</span>
        <input
          {...props}
          className="w-full h-12 pl-10 pr-4 rounded-xl text-sm font-medium text-on-surface bg-white/5 border border-white/10
                     focus:outline-none focus:border-primary/60 focus:bg-primary/5 transition-all placeholder:text-on-surface-variant/50"
        />
      </div>
    </div>
  );
}

// ─── Payment method card ───────────────────────────────────────────────────────
function PaymentCard({
  method, selected, onSelect, icon, title, subtitle, badge,
}: { method: string; selected: string; onSelect: (m: string) => void; icon: string; title: string; subtitle: string; badge?: string }) {
  const isSelected = method === selected;
  return (
    <motion.button
      onClick={() => onSelect(method)}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={`w-full p-4 rounded-2xl border-2 flex items-center gap-4 text-left transition-all duration-200
        ${isSelected ? 'border-primary bg-primary/8' : 'border-white/10 bg-white/4 hover:border-white/20'}`}
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all
        ${isSelected ? 'bg-primary text-white' : 'bg-white/8 text-on-surface-variant'}`}>
        <span className="material-symbols-outlined text-[22px]">{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`font-bold text-sm ${isSelected ? 'text-on-surface' : 'text-on-surface-variant'}`}>{title}</p>
          {badge && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
              style={{ background: 'rgba(0,74,198,0.15)', color: '#4a90e2' }}>{badge}</span>
          )}
        </div>
        <p className="text-xs text-on-surface-variant mt-0.5">{subtitle}</p>
      </div>
      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all
        ${isSelected ? 'border-primary' : 'border-white/20'}`}>
        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
      </div>
    </motion.button>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function Checkout() {
  const navigate  = useNavigate();
  const { cartItems, promoCode, discountPercentage, clearCart } = useCart();
  const auth      = useContext(AuthContext);
  const user      = auth?.user;

  const [step,       setStep]       = useState(1);
  const [method,     setMethod]     = useState<'cod' | 'qr'>('qr');
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [addresses,  setAddresses]  = useState<Address[]>([]);
  const [selectedAddr, setSelectedAddr] = useState<Address | null>(null);
  const [qrUrl,      setQrUrl]      = useState('');
  const [createdOrderId, setCreatedOrderId] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [form, setForm] = useState<ShippingInfo>({
    name: user?.name || '',
    phone: user?.phone_number || '',
    address: '',
    city: '',
    note: '',
  });

  // Compute totals
  const subtotal    = cartItems.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const discount    = Math.round(subtotal * (discountPercentage / 100));
  const shippingFee = subtotal >= 5_000_000 ? 0 : 50_000;
  const total       = subtotal - discount + shippingFee;

  // Load saved addresses
  useEffect(() => {
    if (!auth?.isAuthenticated) return;
    addressService.getAddresses().then(list => {
      setAddresses(list);
      const def = list.find(a => a.is_default) || list[0];
      if (def) {
        setSelectedAddr(def);
        setForm(f => ({
          ...f,
          name:    def.recipient_name,
          phone:   def.phone_number,
          address: def.street_address,
          city:    def.city,
        }));
      }
    }).catch(() => {});
  }, [auth?.isAuthenticated]);

  const handleAddressSelect = (addr: Address) => {
    setSelectedAddr(addr);
    setForm(f => ({ ...f, name: addr.recipient_name, phone: addr.phone_number, address: addr.street_address, city: addr.city }));
  };

  const handleSubmit = async () => {
    if (!form.name || !form.phone || !form.address) {
      setError('Vui lòng điền đầy đủ thông tin giao hàng');
      return;
    }
    setError('');
    setLoading(true);

    const shippingAddress = `${form.name} | ${form.phone}\n${form.address}${form.city ? ', ' + form.city : ''}`;
    const payload = {
      items: cartItems,
      shippingAddress,
      paymentMethod: method,
      totalAmount: total
    };

    try {
      const res = await paymentService.placeOrder(payload);
      setCreatedOrderId(res.orderId);
      if (method === 'qr' && res.qrUrl) {
        setQrUrl(res.qrUrl);
        setLoading(false);
      } else {
        clearCart();
        setShowSuccessModal(true);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Đã xảy ra lỗi, vui lòng thử lại');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (cartItems.length === 0 && !showSuccessModal) {
      navigate('/cart');
    }
  }, [cartItems.length, showSuccessModal, navigate]);

  if (cartItems.length === 0 && !showSuccessModal) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-background text-on-surface pt-24 pb-20"
    >
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(0,74,198,0.06) 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(0,74,198,0.04) 0%, transparent 70%)' }} />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Hoàn tất đặt hàng
          </h1>
          <p className="text-on-surface-variant text-sm">Chỉ còn {step === 1 ? 'một' : 'một'} bước nữa thôi!</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-0 mb-10">
          <StepDot step={1} current={step} label="Giao hàng" />
          <div className={`w-20 h-0.5 mb-4 mx-1 rounded transition-all duration-500 ${step >= 2 ? 'bg-primary' : 'bg-white/10'}`} />
          <StepDot step={2} current={step} label="Thanh toán" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-start">
          {/* Left — main form */}
          <div>
            <AnimatePresence mode="wait">
              {/* ── STEP 1: Shipping info ── */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 30 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="rounded-3xl p-6 md:p-8 border border-white/8"
                  style={{ background: 'rgba(255,255,255,0.03)' }}
                >
                  <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">local_shipping</span>
                    Thông tin giao hàng
                  </h2>

                  {/* Saved addresses */}
                  {addresses.length > 0 && (
                    <div className="mb-6">
                      <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-3">Địa chỉ đã lưu</p>
                      <div className="flex flex-col gap-2">
                        {addresses.map(addr => (
                          <button
                            key={addr.id}
                            onClick={() => handleAddressSelect(addr)}
                            className={`text-left p-3 rounded-xl border transition-all text-sm
                              ${selectedAddr?.id === addr.id ? 'border-primary bg-primary/8 text-on-surface' : 'border-white/10 text-on-surface-variant hover:border-white/20'}`}
                          >
                            <span className="font-semibold">{addr.recipient_name}</span>
                            <span className="mx-2 text-white/20">·</span>
                            <span>{addr.phone_number}</span>
                            <br />
                            <span className="text-xs">{addr.street_address}, {addr.city}</span>
                            {addr.is_default && <span className="ml-2 text-[10px] text-primary font-bold">[Mặc định]</span>}
                          </button>
                        ))}
                      </div>
                      <div className="my-5 flex items-center gap-3">
                        <div className="flex-1 h-px bg-white/8" />
                        <span className="text-xs text-on-surface-variant">hoặc nhập địa chỉ mới</span>
                        <div className="flex-1 h-px bg-white/8" />
                      </div>
                    </div>
                  )}

                  {/* Manual form */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Họ và tên" icon="person" placeholder="Nguyễn Văn A"
                      value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                    <Field label="Số điện thoại" icon="phone" placeholder="0901 234 567" type="tel"
                      value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                    <div className="sm:col-span-2">
                      <Field label="Địa chỉ" icon="home" placeholder="123 Đường ABC, Phường XYZ"
                        value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
                    </div>
                    <Field label="Tỉnh / Thành phố" icon="location_city" placeholder="Hà Nội"
                      value={form.city || ''} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
                    <Field label="Ghi chú (tuỳ chọn)" icon="notes" placeholder="Giao giờ hành chính..."
                      value={form.note || ''} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
                  </div>

                  {error && (
                    <p className="mt-4 text-sm text-red-400 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">error</span>{error}
                    </p>
                  )}

                  <motion.button
                    onClick={() => { if (!form.name || !form.phone || !form.address) { setError('Vui lòng điền đủ thông tin'); return; } setError(''); setStep(2); }}
                    whileHover={{ scale: 1.02, boxShadow: '0 20px 40px -8px rgba(0,74,198,0.45)' }}
                    whileTap={{ scale: 0.98 }}
                    className="mt-6 w-full h-14 rounded-2xl font-black text-white flex items-center justify-center gap-2"
                    style={{ background: 'var(--accent-gradient)' }}
                  >
                    Tiếp theo — Chọn thanh toán
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </motion.button>
                </motion.div>
              )}

              {/* ── STEP 2: Payment method ── */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="rounded-3xl p-6 md:p-8 border border-white/8"
                  style={{ background: 'rgba(255,255,255,0.03)' }}
                >
                  <button onClick={() => setStep(1)} className="flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface mb-6 transition-colors">
                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                    Quay lại
                  </button>

                  <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">payment</span>
                    Phương thức thanh toán
                  </h2>

                  <div className="flex flex-col gap-3 mb-8">
                    <PaymentCard
                      method="qr" selected={method} onSelect={m => setMethod(m as 'cod' | 'qr')}
                      icon="qr_code"
                      title="Chuyển khoản VietQR"
                      subtitle="Quét mã QR bằng App Ngân hàng bất kỳ"
                    />
                    <PaymentCard
                      method="cod" selected={method} onSelect={m => setMethod(m as 'cod' | 'qr')}
                      icon="payments"
                      title="Thanh toán khi nhận hàng (COD)"
                      subtitle="Trả tiền mặt khi shipper giao đến tay bạn"
                    />
                  </div>

                  {error && (
                    <p className="mb-4 text-sm text-red-400 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">error</span>{error}
                    </p>
                  )}

                  {qrUrl ? (
                    <div className="mt-6 p-6 rounded-3xl border border-primary/20 bg-primary/5 text-center animate-in fade-in zoom-in duration-300">
                      <p className="text-sm font-bold text-primary mb-3">Vui lòng quét mã QR dưới đây để thanh toán</p>
                      <div className="bg-white p-4 rounded-2xl inline-block border border-white/10 mb-4 shadow-lg">
                        <img src={qrUrl} alt="VietQR" className="w-56 h-56 object-contain rounded-xl" />
                      </div>
                      <motion.button
                        onClick={() => { clearCart(); setShowSuccessModal(true); }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full h-12 rounded-xl bg-primary text-white font-bold hover:shadow-lg hover:shadow-primary/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-[20px]">check_circle</span>
                        Tôi đã thanh toán xong
                      </motion.button>
                    </div>
                  ) : (
                    <motion.button
                      onClick={handleSubmit}
                      disabled={loading}
                      whileHover={loading ? {} : { scale: 1.02, boxShadow: '0 20px 40px -8px rgba(0,74,198,0.45)' }}
                      whileTap={loading ? {} : { scale: 0.98 }}
                      className="w-full h-16 rounded-2xl font-black text-white flex items-center justify-center gap-3 relative overflow-hidden"
                      style={{
                        background: loading ? '#6b7280' : 'var(--accent-gradient)',
                        cursor: loading ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {loading
                        ? <><span className="material-symbols-outlined animate-spin">sync</span>Đang xử lý...</>
                        : method === 'qr'
                          ? <><span className="material-symbols-outlined">qr_code</span>Thanh toán {fmt(total)} qua VietQR</>
                          : <><span className="material-symbols-outlined">check_circle</span>Đặt hàng COD — {fmt(total)}</>
                      }
                    </motion.button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right — Order summary */}
          <motion.aside
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-3xl p-6 border border-white/8 sticky top-28"
            style={{ background: 'rgba(255,255,255,0.03)' }}
          >
            <h3 className="font-bold text-base mb-4">Tóm tắt đơn hàng</h3>

            {/* Items */}
            <div className="flex flex-col gap-3 mb-5 max-h-52 overflow-y-auto pr-1">
              {cartItems.map(item => (
                <div key={item.id} className="flex items-center gap-3">
                  <img src={item.product.image} alt={item.product.name}
                    className="w-12 h-12 rounded-xl object-cover bg-white/5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.product.name}</p>
                    <p className="text-xs text-on-surface-variant">× {item.quantity}</p>
                  </div>
                  <p className="text-sm font-bold shrink-0">{fmt(item.product.price * item.quantity)}</p>
                </div>
              ))}
            </div>

            <div className="h-px bg-white/8 mb-4" />

            {/* Price breakdown */}
            {[
              { label: 'Tạm tính', value: subtotal },
              { label: 'Giảm giá', value: -discount },
              { label: 'Phí vận chuyển', value: shippingFee === 0 ? 'Miễn phí' : shippingFee },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm mb-2">
                <span className="text-on-surface-variant">{label}</span>
                <span className={typeof value === 'number' && value < 0 ? 'text-green-400 font-semibold' : 'font-semibold'}>
                  {typeof value === 'string' ? value : fmt(Math.abs(value))}
                </span>
              </div>
            ))}

            <div className="h-px bg-white/8 my-4" />
            <div className="flex justify-between items-center">
              <span className="font-bold">Tổng cộng</span>
              <span className="text-xl font-black text-primary">{fmt(total)}</span>
            </div>

            {/* Trust badges */}
            <div className="mt-5 flex justify-center gap-6">
              {[{ icon: 'verified_user', label: 'Bảo mật SSL' }, { icon: 'cached', label: 'Đổi trả 30 ngày' }].map(({ icon, label }) => (
                <div key={icon} className="flex flex-col items-center gap-1">
                  <span className="material-symbols-outlined text-[20px] text-on-surface-variant">{icon}</span>
                  <span className="text-[10px] text-on-surface-variant font-semibold">{label}</span>
                </div>
              ))}
            </div>
          </motion.aside>
        </div>
      </div>

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccessModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-md p-8 rounded-3xl border border-slate-100 text-center shadow-2xl relative overflow-hidden bg-white"
            >
              {/* Animated Success Badge */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 10, stiffness: 100, delay: 0.2 }}
                className="w-20 h-20 rounded-full bg-green-50 border border-green-100 flex items-center justify-center mx-auto mb-6"
              >
                <span className="material-symbols-outlined text-green-500 text-[40px] font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_circle
                </span>
              </motion.div>

              <h2 className="text-2xl font-black mb-2 text-slate-800" style={{ fontFamily: 'Outfit, sans-serif' }}>
                🎉 Đặt hàng thành công!
              </h2>
              <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                Cảm ơn bạn đã mua sắm tại <strong className="text-blue-600">Volitify</strong>. Đơn hàng của bạn đã được ghi nhận và đang trong quá trình xử lý.
              </p>

              {/* Order Info */}
              {createdOrderId && (
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-6 text-left text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Mã đơn hàng:</span>
                    <span className="font-mono font-bold text-slate-700">#{createdOrderId.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Phương thức:</span>
                    <span className="font-bold text-slate-700">{method === 'qr' ? 'Chuyển khoản VietQR' : 'Thanh toán COD'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tổng thanh toán:</span>
                    <span className="font-black text-blue-600">{fmt(total)}</span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-3">
                <motion.button
                  onClick={() => { navigate('/profile', { state: { tab: 'orders' } }); }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full h-12 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                  Xem đơn hàng của tôi
                </motion.button>
                <motion.button
                  onClick={() => { navigate('/'); }}
                  whileHover={{ scale: 1.02, boxShadow: '0 10px 20px -5px rgba(37,99,235,0.3)' }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
                >
                  <span className="material-symbols-outlined text-[18px]">home</span>
                  Quay lại Trang chủ
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
