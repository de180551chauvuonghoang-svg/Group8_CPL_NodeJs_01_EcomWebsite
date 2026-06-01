import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform, useAnimate } from 'framer-motion';

// ─── Animated counter hook ───────────────────────────────────────────────
function useAnimatedNumber(value: number) {
  const [display, setDisplay] = useState(value);
  useEffect(() => {
    let start: number | null = null;
    let frameId: number;
    const from = display;
    const to = value;
    const duration = 500;
    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      }
    };
    frameId = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [value]);
  return display;
}

// ─── 3D tilt card ─────────────────────────────────────────────────────────
function TiltCard({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [6, -6]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-6, 6]), { stiffness: 300, damping: 30 });
  const glowX = useSpring(useTransform(x, [-0.5, 0.5], [0, 100]), { stiffness: 200, damping: 25 });
  const glowY = useSpring(useTransform(y, [-0.5, 0.5], [0, 100]), { stiffness: 200, damping: 25 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };
  const handleMouseLeave = () => { x.set(0); y.set(0); };

  return (
    <motion.div
      ref={ref}
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d', perspective: 1000, ...style }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
    >
      {/* Glow overlay that follows cursor */}
      <motion.div
        className="absolute inset-0 pointer-events-none rounded-3xl z-0"
        style={{
          background: useTransform(
            [glowX, glowY],
            ([gx, gy]) =>
              `radial-gradient(circle at ${gx}% ${gy}%, rgba(0,74,198,0.07) 0%, transparent 60%)`
          ),
        }}
      />
      <div style={{ transform: 'translateZ(20px)' }} className="relative z-10 h-full">
        {children}
      </div>
    </motion.div>
  );
}

// ─── Item card variants ────────────────────────────────────────────────────
const cardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.96 },
  visible: (i: number) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] as const }
  }),
  exit: { opacity: 0, x: 120, scale: 0.92, transition: { duration: 0.35, ease: [0.4, 0, 1, 1] as const } }
};

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } }
};

// ─── Quantity button ───────────────────────────────────────────────────────
function QtyButton({ onClick, disabled, icon }: { onClick: () => void; disabled?: boolean; icon: string }) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? {} : { scale: 1.15, backgroundColor: 'rgba(0,74,198,0.12)' }}
      whileTap={disabled ? {} : { scale: 0.9 }}
      className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors
        ${disabled ? 'opacity-25 cursor-not-allowed text-on-surface-variant' : 'text-primary cursor-pointer'}`}
    >
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
    </motion.button>
  );
}

// ─── Main component ────────────────────────────────────────────────────────
export default function Cart() {
  const navigate = useNavigate();
  const { cartItems, promoCode, discountPercentage, removeFromCart, updateQuantity, applyDiscount, clearCart } = useCart();

  const [promoInput, setPromoInput] = useState('');
  const [promoError, setPromoError] = useState('');
  const [promoSuccess, setPromoSuccess] = useState(promoCode ? 'Đã áp dụng mã giảm giá 10%' : '');
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [scope, animate] = useAnimate();

  const subtotal   = cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const vat        = Math.round(subtotal * 0.1);
  const discount   = Math.round(subtotal * (discountPercentage / 100));
  const total      = subtotal + vat - discount;

  const animatedTotal = useAnimatedNumber(total);

  const formatPrice = (v: number) => new Intl.NumberFormat('vi-VN').format(v) + '₫';

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoInput.trim()) { setPromoError('Vui lòng nhập mã giảm giá'); setPromoSuccess(''); return; }
    const ok = applyDiscount(promoInput);
    if (ok) { setPromoSuccess('🎉 Áp dụng thành công! Giảm 10%'); setPromoError(''); }
    else     { setPromoError('Mã không hợp lệ hoặc đã hết hạn'); setPromoSuccess(''); }
  };

  const handleCheckout = async () => {
    if (scope.current) {
      await animate(scope.current, { scale: [1, 0.98, 1.02, 1] }, { duration: 0.4 });
    }
    setCheckoutSuccess(true);
    setTimeout(() => { clearCart(); setCheckoutSuccess(false); navigate('/'); }, 3000);
  };

  const totalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen bg-background text-on-surface select-none pt-24 pb-28 overflow-hidden relative"
    >
      {/* ─── ambient background blobs ─── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <motion.div
          animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
          transition={{ repeat: Infinity, duration: 18, ease: 'easeInOut' }}
          className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(0,74,198,0.06) 0%, transparent 70%)' }}
        />
        <motion.div
          animate={{ x: [0, -50, 0], y: [0, 40, 0] }}
          transition={{ repeat: Infinity, duration: 22, ease: 'easeInOut', delay: 5 }}
          className="absolute -bottom-20 -right-20 w-[500px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(86,94,116,0.07) 0%, transparent 70%)' }}
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ repeat: Infinity, duration: 12, ease: 'easeInOut', delay: 3 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full"
          style={{ background: 'radial-gradient(ellipse, rgba(0,74,198,0.03) 0%, transparent 70%)' }}
        />
      </div>

      <div className="max-w-container-max mx-auto px-6 md:px-margin-desktop relative z-10">

        {/* ─── Page header ─── */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-14"
        >
          <div className="flex items-center gap-3 mb-3">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 260, damping: 20 }}
              className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20"
              style={{ background: 'var(--accent-gradient)' }}
            >
              <span className="material-symbols-outlined text-white text-[22px]">shopping_cart</span>
            </motion.div>
            <div>
              <h1 className="font-headline-md text-headline-md text-on-surface leading-none">Giỏ hàng của bạn</h1>
              <motion.p
                key={totalItems}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-on-surface-variant text-body-md mt-1"
              >
                {totalItems > 0 ? (
                  <><span className="font-bold text-primary">{totalItems}</span> sản phẩm đang chờ bạn</>
                ) : 'Chưa có sản phẩm nào'}
              </motion.p>
            </div>
          </div>
        </motion.div>

        {/* ─── Checkout Success banner ─── */}
        <AnimatePresence>
          {checkoutSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="mb-8 p-6 rounded-3xl flex items-center gap-5 relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #004ac6 0%, #2563eb 100%)',
                boxShadow: '0 20px 60px -10px rgba(0,74,198,0.5)'
              }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
                className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center shrink-0"
              >
                <span className="material-symbols-outlined text-white text-[32px]">verified</span>
              </motion.div>
              <div>
                <h3 className="font-bold text-xl text-white">Đặt hàng thành công! 🎉</h3>
                <p className="text-white/80 text-body-md">Cảm ơn bạn đã lựa chọn Volitify. Đơn hàng đang được xử lý — chuyển về trang chủ trong giây lát...</p>
              </div>
              {/* Progress bar */}
              <motion.div
                className="absolute bottom-0 left-0 h-1 bg-white/40 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 3, ease: 'linear' }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Main content ─── */}
        <AnimatePresence mode="wait">
          {cartItems.length === 0 ? (
            /* Empty state */
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              className="flex flex-col items-center justify-center py-32 text-center"
            >
              <motion.div
                animate={{ y: [0, -12, 0] }}
                transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                className="relative mb-8"
              >
                <div
                  className="w-32 h-32 rounded-3xl flex items-center justify-center mx-auto shadow-2xl"
                  style={{ background: 'linear-gradient(135deg, #004ac6, #2563eb)', boxShadow: '0 30px 60px -10px rgba(0,74,198,0.35)' }}
                >
                  <span className="material-symbols-outlined text-white text-[56px]">shopping_cart_off</span>
                </div>
                <motion.div
                  animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                  className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-20 h-4 rounded-full blur-xl"
                  style={{ background: 'rgba(0,74,198,0.3)' }}
                />
              </motion.div>
              <h3 className="font-headline-md text-headline-md text-on-surface mb-3">Giỏ hàng trống</h3>
              <p className="text-on-surface-variant text-body-lg max-w-md mb-10">
                Bạn chưa có sản phẩm nào trong giỏ. Hãy khám phá hệ sinh thái công nghệ Volitify!
              </p>
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                <Link
                  to="/"
                  className="inline-flex items-center gap-3 px-10 py-4 rounded-2xl text-white font-bold text-body-lg shadow-xl hover:shadow-2xl transition-shadow"
                  style={{ background: 'linear-gradient(135deg, #004ac6, #2563eb)', boxShadow: '0 20px 40px -8px rgba(0,74,198,0.4)' }}
                >
                  <span className="material-symbols-outlined">explore</span>
                  Khám phá sản phẩm
                </Link>
              </motion.div>
            </motion.div>
          ) : (
            /* Cart grid */
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start"
            >

              {/* ─── Cart items ─── */}
              <motion.div
                className="lg:col-span-8 space-y-5"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                <AnimatePresence mode="popLayout">
                  {cartItems.map((item, i) => (
                    <motion.div
                      key={item.id}
                      custom={i}
                      variants={cardVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      layout
                    >
                      <TiltCard className="relative overflow-hidden rounded-3xl border bg-white/60 backdrop-blur-sm shadow-sm hover:shadow-xl hover:shadow-primary/8 transition-all duration-500"
                        style={{ borderColor: 'rgba(195,198,215,0.4)' }}
                      >
                        <div className="flex flex-col md:flex-row gap-0 rounded-3xl overflow-hidden">
                          {/* Product image */}
                          <div className="relative w-full md:w-52 h-52 shrink-0 overflow-hidden">
                            <motion.img
                              alt={item.product.name}
                              className="w-full h-full object-cover"
                              src={item.product.image}
                              whileHover={{ scale: 1.08 }}
                              transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                            />
                            {/* Category badge */}
                            <div className="absolute top-3 left-3">
                              <span className="text-xs font-bold px-3 py-1 rounded-full text-white backdrop-blur-sm"
                                style={{ background: 'rgba(0,74,198,0.75)' }}>
                                {item.product.category}
                              </span>
                            </div>
                          </div>

                          {/* Content */}
                          <div className="flex-grow flex flex-col justify-between p-6">
                            <div>
                              <div className="flex justify-between items-start gap-4 mb-3">
                                <h3 className="font-bold text-on-surface leading-snug" style={{ fontSize: '18px' }}>
                                  {item.product.name}
                                </h3>
                                <motion.p
                                  key={item.product.price * item.quantity}
                                  initial={{ scale: 1.15, color: '#2563eb' }}
                                  animate={{ scale: 1, color: '#004ac6' }}
                                  transition={{ duration: 0.3 }}
                                  className="font-black whitespace-nowrap text-xl leading-none"
                                >
                                  {formatPrice(item.product.price * item.quantity)}
                                </motion.p>
                              </div>

                              {/* Variant chips */}
                              <div className="flex flex-wrap gap-2 mt-2">
                                {item.selectedColor && (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                                    style={{ background: 'rgba(0,74,198,0.08)', color: '#004ac6' }}>
                                    <span className="material-symbols-outlined text-[13px]">palette</span>
                                    {item.selectedColor}
                                  </span>
                                )}
                                {item.selectedVersion && (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                                    style={{ background: 'rgba(86,94,116,0.1)', color: '#434655' }}>
                                    <span className="material-symbols-outlined text-[13px]">settings</span>
                                    {item.selectedVersion}
                                  </span>
                                )}
                                {/* Rating badge */}
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
                                  style={{ background: 'rgba(245,158,11,0.12)', color: '#b45309' }}>
                                  <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                  {item.product.rating}
                                </span>
                              </div>
                            </div>

                            {/* Qty & Delete */}
                            <div className="flex items-center justify-between mt-6">
                              <div className="flex items-center gap-1 px-1 py-1 rounded-2xl border"
                                style={{ background: 'rgba(247,249,251,0.8)', borderColor: 'rgba(195,198,215,0.5)' }}>
                                <QtyButton onClick={() => updateQuantity(item.id, 'remove')} disabled={item.quantity <= 1} icon="remove" />
                                <motion.span
                                  key={item.quantity}
                                  initial={{ scale: 1.4, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                                  className="w-10 text-center font-black text-on-surface"
                                  style={{ fontSize: '16px' }}
                                >
                                  {item.quantity}
                                </motion.span>
                                <QtyButton onClick={() => updateQuantity(item.id, 'add')} icon="add" />
                              </div>

                              <motion.button
                                onClick={() => removeFromCart(item.id)}
                                whileHover={{ scale: 1.04, backgroundColor: 'rgba(186,26,26,0.08)' }}
                                whileTap={{ scale: 0.95 }}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-colors"
                                style={{ color: '#ba1a1a' }}
                              >
                                <motion.span
                                  className="material-symbols-outlined text-[17px]"
                                  whileHover={{ rotate: [0, -15, 15, 0] }}
                                  transition={{ duration: 0.4 }}
                                >delete</motion.span>
                                Xóa
                              </motion.button>
                            </div>
                          </div>
                        </div>
                      </TiltCard>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Continue shopping */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className="pt-4"
                >
                  <motion.div whileHover={{ x: -4 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
                    <Link to="/" className="inline-flex items-center gap-2 text-primary font-semibold text-body-md">
                      <span className="material-symbols-outlined">arrow_back</span>
                      Tiếp tục mua sắm
                    </Link>
                  </motion.div>
                </motion.div>
              </motion.div>

              {/* ─── Summary sidebar ─── */}
              <motion.aside
                className="lg:col-span-4 lg:sticky lg:top-28"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              >
                {/* Order summary card */}
                <div className="rounded-3xl overflow-hidden shadow-2xl"
                  style={{ boxShadow: '0 30px 80px -20px rgba(0,74,198,0.18), 0 0 0 1px rgba(195,198,215,0.3)' }}>
                  
                  {/* Dark header */}
                  <div className="px-8 pt-8 pb-6 relative overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1e2a40 100%)' }}>
                    <motion.div
                      animate={{ opacity: [0.3, 0.6, 0.3] }}
                      transition={{ repeat: Infinity, duration: 4 }}
                      className="absolute top-0 right-0 w-40 h-40 rounded-full -translate-y-1/2 translate-x-1/2"
                      style={{ background: 'radial-gradient(circle, rgba(0,74,198,0.4) 0%, transparent 70%)' }}
                    />
                    <p className="text-white/50 text-sm font-semibold uppercase tracking-widest mb-1">Đơn hàng</p>
                    <h2 className="text-white font-black text-2xl">Tóm tắt</h2>
                  </div>

                  {/* White body */}
                  <div className="bg-white px-8 pb-8">
                    {/* Price breakdown */}
                    <div className="py-6 space-y-4 border-b" style={{ borderColor: '#f0f2f5' }}>
                      {[
                        { label: 'Tạm tính', value: formatPrice(subtotal), highlight: false },
                        { label: 'Phí vận chuyển', value: 'Miễn phí 🚚', highlight: true },
                        { label: 'Thuế (VAT 10%)', value: formatPrice(vat), highlight: false },
                      ].map(({ label, value, highlight }) => (
                        <div key={label} className="flex justify-between items-center">
                          <span className="text-on-surface-variant text-sm">{label}</span>
                          <span className={`text-sm font-semibold ${highlight ? 'text-primary' : 'text-on-surface'}`}>{value}</span>
                        </div>
                      ))}

                      <AnimatePresence>
                        {discountPercentage > 0 && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="flex justify-between items-center overflow-hidden"
                          >
                            <span className="text-sm font-semibold" style={{ color: '#10b981' }}>
                              🎁 Giảm giá ({discountPercentage}%)
                            </span>
                            <span className="text-sm font-black" style={{ color: '#10b981' }}>
                              -{formatPrice(discount)}
                            </span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Promo input */}
                    <div className="py-6 border-b" style={{ borderColor: '#f0f2f5' }}>
                      <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-3">Mã giảm giá</p>
                      <form onSubmit={handleApplyPromo}>
                        <div className="flex gap-2">
                          <input
                            id="promo"
                            type="text"
                            placeholder="Thử ECOM2026"
                            value={promoInput}
                            onChange={e => { setPromoInput(e.target.value); setPromoError(''); setPromoSuccess(''); }}
                            className="flex-grow h-11 px-4 rounded-xl border text-sm outline-none transition-all"
                            style={{
                              background: '#f7f9fb',
                              borderColor: promoError ? '#ba1a1a' : promoSuccess ? '#10b981' : '#e0e3e5',
                            }}
                          />
                          <motion.button
                            type="submit"
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.95 }}
                            className="px-5 h-11 rounded-xl text-sm font-bold text-white shrink-0"
                            style={{ background: 'linear-gradient(135deg, #004ac6, #2563eb)' }}
                          >
                            Áp dụng
                          </motion.button>
                        </div>
                        <AnimatePresence mode="wait">
                          {promoError && (
                            <motion.p key="err" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                              className="text-xs mt-2 font-medium" style={{ color: '#ba1a1a' }}>
                              ✕ {promoError}
                            </motion.p>
                          )}
                          {promoSuccess && (
                            <motion.p key="ok" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                              className="text-xs mt-2 font-medium" style={{ color: '#10b981' }}>
                              {promoSuccess}
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </form>
                    </div>

                    {/* Total */}
                    <div className="py-6">
                      <div className="flex justify-between items-center mb-6">
                        <span className="font-bold text-on-surface text-lg">Tổng thanh toán</span>
                        <motion.span
                          key={animatedTotal}
                          className="font-black text-2xl tracking-tight"
                          style={{ color: '#004ac6' }}
                        >
                          {formatPrice(animatedTotal)}
                        </motion.span>
                      </div>

                      {/* Checkout button */}
                      <motion.button
                        ref={scope}
                        onClick={handleCheckout}
                        disabled={checkoutSuccess}
                        whileHover={checkoutSuccess ? {} : {
                          scale: 1.02,
                          boxShadow: '0 24px 48px -8px rgba(0,74,198,0.55)'
                        }}
                        whileTap={checkoutSuccess ? {} : { scale: 0.97 }}
                        className="w-full h-16 rounded-2xl font-black text-white text-lg flex items-center justify-center gap-3 relative overflow-hidden transition-all"
                        style={{
                          background: checkoutSuccess
                            ? '#9ca3af'
                            : 'var(--accent-gradient)',
                          boxShadow: checkoutSuccess
                            ? 'none'
                            : '0 16px 40px -8px rgba(0,74,198,0.4)',
                          cursor: checkoutSuccess ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {/* Shimmer */}
                        {!checkoutSuccess && (
                          <motion.div
                            className="absolute inset-0 -skew-x-12"
                            animate={{ x: ['-200%', '200%'] }}
                            transition={{ repeat: Infinity, duration: 3, ease: 'linear', repeatDelay: 2 }}
                            style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)', width: '60%' }}
                          />
                        )}
                        <span className="material-symbols-outlined">
                          {checkoutSuccess ? 'check_circle' : 'payment'}
                        </span>
                        {checkoutSuccess ? 'Đang xử lý...' : 'Thanh toán ngay'}
                        {!checkoutSuccess && <span className="material-symbols-outlined">chevron_right</span>}
                      </motion.button>

                      {/* Trust badges */}
                      <div className="mt-6 flex items-center justify-center gap-6">
                        {[
                          { icon: 'verified_user', label: 'Bảo mật' },
                          { icon: 'credit_card', label: 'An toàn' },
                          { icon: 'local_shipping', label: 'Miễn phí' },
                        ].map(({ icon, label }) => (
                          <motion.div
                            key={icon}
                            whileHover={{ scale: 1.1, y: -2 }}
                            className="flex flex-col items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[22px]" style={{ color: '#c3c6d7' }}>{icon}</span>
                            <span className="text-[10px] font-semibold" style={{ color: '#c3c6d7' }}>{label}</span>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Upsell card */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="mt-5 p-5 rounded-3xl relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, rgba(0,74,198,0.06), rgba(86,94,116,0.06))',
                    border: '1px solid rgba(0,74,198,0.12)'
                  }}
                >
                  <div className="flex gap-3 items-start">
                    <motion.span
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
                      className="material-symbols-outlined text-[24px]"
                      style={{ color: '#004ac6', fontVariationSettings: "'FILL' 1" }}
                    >
                      card_giftcard
                    </motion.span>
                    <p className="text-sm text-on-surface-variant leading-relaxed">
                      Đơn hàng đủ điều kiện nhận miễn phí <strong className="text-on-surface">Volitify Cleaning Kit</strong> trị giá <strong className="text-primary">299.000₫</strong>!
                    </p>
                  </div>
                </motion.div>
              </motion.aside>

            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
