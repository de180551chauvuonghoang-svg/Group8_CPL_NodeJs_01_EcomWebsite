import React, { useMemo, useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CreditCard, Gift, Minus, Plus, ShieldCheck, ShoppingCart, Trash2, Truck, AlertCircle, UserCheck } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { AuthContext } from '../context/AuthContext';
import { addressService } from '../services/addressService';

const formatPrice = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

export default function Cart() {
  const navigate = useNavigate();
  const { cartItems, promoCode, discountPercentage, removeFromCart, updateQuantity, applyDiscount } = useCart();
  const auth = useContext(AuthContext);

  const [promoInput, setPromoInput] = useState('');
  const [promoError, setPromoError] = useState('');
  const [promoSuccess, setPromoSuccess] = useState(promoCode ? 'Đã áp dụng mã giảm giá' : '');
  const [applyingPromo, setApplyingPromo] = useState(false);

  const [profileValidationMsg, setProfileValidationMsg] = useState('');
  const [checkingProfile, setCheckingProfile] = useState(false);

  const totals = useMemo(() => {
    const subtotal = cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
    const vat = Math.round(subtotal * 0.1);
    const discount = Math.round(subtotal * (discountPercentage / 100));
    return {
      subtotal,
      vat,
      discount,
      total: Math.max(0, subtotal + vat - discount),
      itemCount: cartItems.reduce((acc, item) => acc + item.quantity, 0),
    };
  }, [cartItems, discountPercentage]);

  const handleCheckoutClick = async () => {
    if (!auth?.isAuthenticated || !auth?.user) {
      navigate('/login');
      return;
    }

    const u = auth.user;
    if (!u.phone_number || u.phone_number.trim() === '' || u.phone_number === 'Chưa cập nhật') {
      setProfileValidationMsg('Vui lòng cập nhật đầy đủ Số điện thoại trong Hồ sơ cá nhân trước khi thực hiện thanh toán.');
      return;
    }

    setCheckingProfile(true);
    try {
      const addrs = await addressService.getAddresses();
      const validAddr = addrs.find(a => a.street_address && a.street_address !== 'Chưa cập nhật');
      if (!validAddr) {
        setProfileValidationMsg('Vui lòng thêm Địa chỉ giao hàng chi tiết trong Sổ địa chỉ / Hồ sơ cá nhân trước khi thanh toán.');
        setCheckingProfile(false);
        return;
      }
    } catch (e) {
      // Tiếp tục nếu có lỗi mạng
    }
    setCheckingProfile(false);
    navigate('/checkouts');
  };

  const handleApplyPromo = async (event: React.FormEvent) => {
    event.preventDefault();
    const code = promoInput.trim();
    if (!code) {
      setPromoError('Vui lòng nhập mã giảm giá');
      setPromoSuccess('');
      return;
    }

    setApplyingPromo(true);
    const result = await applyDiscount(code);
    setApplyingPromo(false);

    if (result.ok) {
      setPromoSuccess(result.message);
      setPromoError('');
      return;
    }

    setPromoError(result.message);
    setPromoSuccess('');
  };

  if (cartItems.length === 0) {
    return (
      <main className="min-h-screen bg-background px-6 pb-20 pt-28">
        <section className="mx-auto flex max-w-2xl flex-col items-center text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/20">
            <ShoppingCart size={34} />
          </div>
          <h1 className="text-3xl font-black text-on-surface">Giỏ hàng trống</h1>
          <p className="mt-3 text-on-surface-variant">Bạn chưa có sản phẩm nào trong giỏ. Hãy chọn thêm vài món trước khi thanh toán.</p>
          <Link to="/products" className="mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-white">
            Tiếp tục mua sắm
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-6 pb-24 pt-28 md:px-margin-desktop">
      <section className="mx-auto max-w-container-max">
        <header className="mb-10 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/20">
            <ShoppingCart size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-on-surface md:text-4xl">Giỏ hàng của bạn</h1>
            <p className="mt-1 text-sm text-on-surface-variant">{totals.itemCount} sản phẩm đang chờ thanh toán</p>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <section className="space-y-4 lg:col-span-8">
            <AnimatePresence mode="popLayout">
              {cartItems.map(item => (
                <motion.article
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 40 }}
                  className="overflow-hidden rounded-2xl border border-outline-variant/50 bg-surface-container-lowest shadow-sm"
                >
                  <div className="grid gap-4 p-4 sm:grid-cols-[180px_1fr] md:p-5">
                    <Link to={`/products/${item.product.id}`} className="relative block overflow-hidden rounded-xl bg-surface-container">
                      <img
                        src={item.product.image || 'https://placehold.co/600x600/eef2ff/4f46e5?text=Product'}
                        alt={item.product.name}
                        className="aspect-square h-full w-full object-cover"
                      />
                      <span className="absolute left-3 top-3 rounded-full bg-primary px-3 py-1 text-xs font-bold text-white">
                        {item.product.category || 'Sản phẩm'}
                      </span>
                    </Link>

                    <div className="flex min-w-0 flex-col justify-between gap-5">
                      <div className="flex gap-4">
                        <div className="min-w-0 flex-1">
                          <Link to={`/products/${item.product.id}`} className="line-clamp-2 text-lg font-black text-on-surface hover:text-primary">
                            {item.product.name}
                          </Link>
                          {item.product.seller_name && (
                            <p className="mt-1 text-sm font-semibold text-on-surface-variant">Shop: {item.product.seller_name}</p>
                          )}
                          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-on-surface-variant">
                            {item.selectedColor && <span className="rounded-full bg-surface-container px-3 py-1">{item.selectedColor}</span>}
                            {item.selectedVersion && <span className="rounded-full bg-surface-container px-3 py-1">{item.selectedVersion}</span>}
                          </div>
                        </div>
                        <p className="shrink-0 text-right text-lg font-black text-primary">{formatPrice(item.product.price * item.quantity)}</p>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center rounded-xl border border-outline-variant bg-surface-container-lowest p-1">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, 'remove')}
                            disabled={item.quantity <= 1}
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-primary disabled:text-on-surface-variant/30"
                            aria-label="Giảm số lượng"
                          >
                            <Minus size={16} />
                          </button>
                          <span className="w-10 text-center font-black">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, 'add')}
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-primary"
                            aria-label="Tăng số lượng"
                          >
                            <Plus size={16} />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeFromCart(item.id)}
                          className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-bold text-error transition hover:bg-error/10"
                        >
                          <Trash2 size={16} />
                          Xóa
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.article>
              ))}
            </AnimatePresence>

            <Link to="/products" className="inline-flex items-center gap-2 pt-4 text-sm font-bold text-primary">
              <ArrowLeft size={18} />
              Tiếp tục mua sắm
            </Link>
          </section>

          <aside className="lg:col-span-4">
            <div className="sticky top-28 overflow-hidden rounded-2xl border border-outline-variant/50 bg-surface-container-lowest shadow-xl">
              <div className="bg-[#0f172a] px-6 py-5 text-white">
                <p className="text-xs font-bold uppercase tracking-widest text-white/50">Đơn hàng</p>
                <h2 className="mt-1 text-2xl font-black">Tóm tắt</h2>
              </div>

              <div className="space-y-5 p-6">
                <div className="space-y-3 border-b border-outline-variant/50 pb-5">
                  <div className="flex justify-between text-sm">
                    <span className="text-on-surface-variant">Tạm tính</span>
                    <strong>{formatPrice(totals.subtotal)}</strong>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-on-surface-variant">Phí vận chuyển</span>
                    <strong className="text-primary">Miễn phí</strong>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-on-surface-variant">Thuế VAT 10%</span>
                    <strong>{formatPrice(totals.vat)}</strong>
                  </div>
                  {totals.discount > 0 && (
                    <div className="flex justify-between text-sm text-emerald-600">
                      <span className="font-semibold">Giảm giá</span>
                      <strong>-{formatPrice(totals.discount)}</strong>
                    </div>
                  )}
                </div>

                <form onSubmit={handleApplyPromo} className="space-y-2 border-b border-outline-variant/50 pb-5">
                  <label htmlFor="promo" className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                    Mã giảm giá
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="promo"
                      value={promoInput}
                      onChange={event => {
                        setPromoInput(event.target.value);
                        setPromoError('');
                        setPromoSuccess('');
                      }}
                      placeholder="Thử SHOP1"
                      className="min-w-0 flex-1 rounded-xl border border-outline-variant bg-surface-container px-3 text-sm outline-none focus:border-primary"
                    />
                    <button
                      type="submit"
                      disabled={applyingPromo}
                      className="h-11 rounded-xl bg-primary px-4 text-sm font-bold text-white disabled:opacity-60"
                    >
                      {applyingPromo ? 'Đang áp dụng' : 'Áp dụng'}
                    </button>
                  </div>
                  {promoError && <p className="text-xs font-semibold text-error">{promoError}</p>}
                  {promoSuccess && <p className="text-xs font-semibold text-emerald-600">{promoSuccess}</p>}
                </form>

                <div className="flex items-center justify-between">
                  <span className="text-lg font-black">Tổng thanh toán</span>
                  <span className="text-2xl font-black text-primary">{formatPrice(totals.total)}</span>
                </div>

                <button
                  type="button"
                  onClick={handleCheckoutClick}
                  disabled={checkingProfile}
                  className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-primary text-base font-black text-white shadow-lg shadow-primary/20 hover:brightness-105 active:scale-98 transition-all disabled:opacity-50"
                >
                  <CreditCard size={20} />
                  {checkingProfile ? 'Đang xác thực thông tin...' : 'Thanh toán ngay'}
                </button>

                <div className="grid grid-cols-3 gap-3 pt-1 text-center text-[11px] font-semibold text-on-surface-variant">
                  <span className="flex flex-col items-center gap-1"><ShieldCheck size={18} />Bảo mật</span>
                  <span className="flex flex-col items-center gap-1"><Truck size={18} />Miễn phí</span>
                  <span className="flex flex-col items-center gap-1"><Gift size={18} />Voucher</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* Profile & Address Validation Modal */}
      {profileValidationMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md rounded-3xl border border-amber-500/30 bg-surface dark:bg-surface-container-lowest p-6 shadow-2xl space-y-5 text-center"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/15 text-amber-500">
              <AlertCircle size={36} />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-black text-on-surface">Yêu cầu thông tin cá nhân</h3>
              <p className="text-sm font-medium text-on-surface-variant leading-relaxed">
                {profileValidationMsg}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => setProfileValidationMsg('')}
                className="flex-1 rounded-xl border border-outline-variant py-3 text-sm font-bold text-on-surface-variant hover:bg-surface-container"
              >
                Để sau
              </button>
              <button
                onClick={() => {
                  setProfileValidationMsg('');
                  navigate('/profile');
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white shadow-md shadow-primary/20 hover:brightness-105"
              >
                <UserCheck size={18} />
                Cập nhật ngay
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </main>
  );
}
