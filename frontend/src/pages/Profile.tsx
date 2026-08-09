import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Spinner from '../components/common/Spinner';
import { motion, AnimatePresence } from 'framer-motion';
import { authService } from '../services/authService';
import AddressBook from '../components/profile/AddressBook';
import { paymentService, UserOrder } from '../services/paymentService';

export default function Profile() {
  const auth = useContext(AuthContext);
  if (!auth) {
    throw new Error('Profile must be used within an AuthProvider');
  }
  const { user, isAuthenticated, loading } = auth;
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState(location.state?.tab || 'profile');

  // Sync tab from router state (e.g. when redirecting from checkout to orders tab)
  useEffect(() => {
    if (location.state?.tab) {
      setActiveTab(location.state.tab);
    }
  }, [location.state]);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [orders, setOrders] = useState<UserOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  // Sync state with logged in user
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login');
    }
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone_number || '');
      setAvatarUrl(user.avatar_url || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDhH6M7taxWH1fH8jTLXjRXGASClEEtDR2CeN1In1IG7iwj64RxGDXue_IrlAPsCh41fcDvOX2I0Y5f1uqquYN8sj-82ClnMvoTNMJUiR0vgoRIFfmu1IL2QzFIFxE-VtnptRxpbOCPz8UXctOdWuPrMrdikuSt8hWHnj0pMEtwfY_X2BVQw9jHTwuIeohbkOIiyDL6muCfSyf8AQug9Zm-78TqSIfnEjCyMBV52LNRsPfZpq9fldsRuAOW9wiGUUhzBuM0rXTpKIXR');
      setBio(user.bio || '');
    }
  }, [user, isAuthenticated, loading, navigate]);

  // Load orders when tab is active
  useEffect(() => {
    if (activeTab !== 'orders') return;
    setOrdersLoading(true);
    paymentService.getUserOrders()
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setOrdersLoading(false));
  }, [activeTab]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    // Check file size (e.g. limit to 4MB)
    if (file.size > 4 * 1024 * 1024) {
      setErrorMsg('Dung lượng ảnh vượt quá giới hạn cho phép (Tối đa 4MB).');
      return;
    }

    setUploading(true);
    setErrorMsg('');
    setSuccessMsg('');

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      const base64Data = reader.result as string;

      try {
        const secureUrl = await authService.uploadAvatar(base64Data);
        if (secureUrl) {
          setAvatarUrl(secureUrl);
          setSuccessMsg('Đã tải ảnh đại diện lên thành công! Hãy nhấn "Lưu thay đổi" để áp dụng.');
        } else {
          throw new Error('Không nhận được URL ảnh từ server.');
        }
      } catch (err: unknown) {
        let errMsg = 'Lỗi hệ thống khi tải ảnh lên server.';
        if (err instanceof Error) {
          errMsg = err.message;
        } else if (typeof err === 'string') {
          errMsg = err;
        }
        setErrorMsg(errMsg);
      } finally {
        setUploading(false);
      }
    };
    reader.onerror = () => {
      setErrorMsg('Lỗi đọc tệp tin hình ảnh.');
      setUploading(false);
    };
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl('https://lh3.googleusercontent.com/aida-public/AB6AXuDhH6M7taxWH1fH8jTLXjRXGASClEEtDR2CeN1In1IG7iwj64RxGDXue_IrlAPsCh41fcDvOX2I0Y5f1uqquYN8sj-82ClnMvoTNMJUiR0vgoRIFfmu1IL2QzFIFxE-VtnptRxpbOCPz8UXctOdWuPrMrdikuSt8hWHnj0pMEtwfY_X2BVQw9jHTwuIeohbkOIiyDL6muCfSyf8AQug9Zm-78TqSIfnEjCyMBV52LNRsPfZpq9fldsRuAOW9wiGUUhzBuM0rXTpKIXR');
    setSuccessMsg('Đã gỡ ảnh đại diện! Hãy nhấn "Lưu thay đổi" để áp dụng.');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const updatedUser = await authService.updateProfile(name, phone, avatarUrl, bio);
      setSuccessMsg('Đã lưu các thay đổi hồ sơ thành công!');

      // Update global context state immediately
      auth.updateUser(updatedUser);

      setTimeout(() => {
        setSuccessMsg('');
      }, 3000);
    } catch (err: unknown) {
      let errMsg = 'Cập nhật hồ sơ thất bại. Vui lòng thử lại.';
      if (err instanceof Error) {
        errMsg = err.message;
      } else if (typeof err === 'string') {
        errMsg = err;
      }
      setErrorMsg(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Spinner fullPage message="Đang nạp thông tin hồ sơ..." />;

  return (
    <div className="bg-background text-on-surface min-h-screen">
      <main className="pt-8 pb-16 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto w-full flex flex-col lg:flex-row gap-gutter">

        {/* Side Navigation Shell - Centralized glass style applied */}
        <aside className="w-full lg:w-64 flex-shrink-0">
          <div className="glass-panel p-6 shadow-xl space-y-2 sticky top-28 transition-all duration-300">
            <div className="mb-8 px-2">
              <h2 className="font-headline-md text-title-lg font-black text-primary">Cài đặt</h2>
              <p className="font-label-md text-xs text-on-surface-variant">Quản lý tài khoản của bạn</p>
            </div>
            <nav className="space-y-1">
              <button
                onClick={() => setActiveTab('profile')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-transform hover:translate-x-1 ${activeTab === 'profile' ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
              >
                <span className="material-symbols-outlined text-[20px]">person</span>
                <span className="font-label-md text-sm">Hồ sơ</span>
              </button>
              <button
                onClick={() => setActiveTab('address')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-transform hover:translate-x-1 ${activeTab === 'address' ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
              >
                <span className="material-symbols-outlined text-[20px]">location_on</span>
                <span className="font-label-md text-sm">Sổ địa chỉ</span>
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-transform hover:translate-x-1 ${activeTab === 'orders' ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
              >
                <span className="material-symbols-outlined text-[20px]">receipt_long</span>
                <span className="font-label-md text-sm">Đơn hàng</span>
              </button>
              <a className="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-container-high rounded-xl transition-transform hover:translate-x-1" href="#security">
                <span className="material-symbols-outlined text-[20px]">security</span>
                <span className="font-label-md text-sm">Bảo mật</span>
              </a>
              <a className="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-container-high rounded-xl transition-transform hover:translate-x-1" href="#notifications">
                <span className="material-symbols-outlined text-[20px]">notifications</span>
                <span className="font-label-md text-sm">Thông báo</span>
              </a>
              <a className="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-container-high rounded-xl transition-transform hover:translate-x-1" href="#payments">
                <span className="material-symbols-outlined text-[20px]">payments</span>
                <span className="font-label-md text-sm">Thanh toán</span>
              </a>
            </nav>
            <div className="pt-8 px-2">
              <button className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-full font-bold text-sm hover:shadow-lg transition-all active:scale-95">
                <span className="material-symbols-outlined text-sm">add</span>
                Thiết bị mới
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <section className="flex-grow space-y-8">
          {/* Header Section */}
          <div className="space-y-2">
            <h1 className="font-headline-lg text-headline-md text-on-surface font-extrabold">Thông tin cá nhân</h1>
            <p className="font-body-lg text-body-md text-on-surface-variant">
              Cập nhật ảnh đại diện và thông tin cơ bản để cá nhân hóa trải nghiệm của bạn trên Volitify.
            </p>
          </div>

          {/* Success Notification - Glassmorphism alert applied */}
          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-alert glass-alert--success"
            >
              <span className="material-symbols-outlined">check_circle</span>
              <span className="font-semibold">{successMsg}</span>
            </motion.div>
          )}

          {/* Error Notification - Glassmorphism alert applied */}
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-alert glass-alert--error"
            >
              <span className="material-symbols-outlined">error</span>
              <span className="font-semibold">{errorMsg}</span>
            </motion.div>
          )}

          {/* Content Area Based on Tab */}
          {activeTab === 'profile' ? (
            <div className="glass-panel p-8 lg:p-12 shadow-xl">
              <form className="space-y-12" onSubmit={handleSubmit}>

                {/* Avatar Section */}
                <div className="flex flex-col md:flex-row items-center gap-8 pb-12 border-b border-outline-variant/30">
                  <div className="relative group">
                    <div className="w-32 h-32 rounded-3xl overflow-hidden shadow-lg border-2 border-white ring-4 ring-primary/5">
                      {uploading ? (
                        <div className="w-full h-full bg-surface-container-low flex flex-col items-center justify-center gap-2">
                          <span className="material-symbols-outlined text-primary text-3xl animate-spin">sync</span>
                          <span className="text-[10px] text-primary font-bold">Đang tải...</span>
                        </div>
                      ) : (
                        <img
                          className="w-full h-full object-cover"
                          id="avatar-preview"
                          alt="User Avatar"
                          src={avatarUrl}
                        />
                      )}
                    </div>
                    <label
                      htmlFor="avatar-file-input"
                      className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl flex items-center justify-center cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-white text-3xl">photo_camera</span>
                    </label>
                  </div>

                  <input
                    type="file"
                    id="avatar-file-input"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                    disabled={uploading || submitting}
                  />

                  <div className="space-y-4 text-center md:text-left">
                    <h3 className="font-title-lg text-title-lg text-on-surface font-bold">Ảnh đại diện của bạn</h3>
                    <p className="font-body-md text-xs text-on-surface-variant">PNG hoặc JPG. Tối đa 4MB.</p>
                    <div className="flex flex-wrap justify-center md:justify-start gap-4">
                      <button
                        onClick={() => document.getElementById('avatar-file-input')?.click()}
                        className="pill-button pill-button--accent"
                        type="button"
                        disabled={uploading || submitting}
                      >
                        {uploading ? 'Đang tải lên...' : 'Tải lên ảnh mới'}
                      </button>
                      <button
                        onClick={handleRemoveAvatar}
                        className="pill-button"
                        type="button"
                        disabled={uploading || submitting}
                      >
                        Gỡ bỏ
                      </button>
                    </div>
                  </div>
                </div>

                {/* Personal Info Form - Centralized glass inputs applied */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="font-label-md text-xs text-on-surface-variant font-bold ml-2 block">Họ và tên</label>
                    <input
                      className="glass-input"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="font-label-md text-xs text-on-surface-variant font-bold ml-2 block">Email (Đã xác minh)</label>
                    <div className="relative">
                      <input
                        className="glass-input"
                        disabled
                        type="email"
                        value={email}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-primary font-fill">verified</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="font-label-md text-xs text-on-surface-variant font-bold ml-2 block">Số điện thoại</label>
                    <input
                      className="glass-input"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="font-label-md text-xs text-on-surface-variant font-bold ml-2 block">Tiểu sử</label>
                    <textarea
                      className="glass-input h-32 py-4 resize-none"
                      placeholder=""
                      rows={4}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                    />
                  </div>
                </div>

                {/* Action Footer - Pill buttons with active effects applied */}
                <div className="pt-12 border-t border-outline-variant/30 flex flex-col sm:flex-row justify-end gap-4">
                  <button
                    onClick={() => navigate('/')}
                    className="order-2 sm:order-1 pill-button"
                    type="button"
                  >
                    Hủy
                  </button>
                  <button
                    className="order-1 sm:order-2 pill-button pill-button--accent"
                    type="submit"
                    disabled={submitting}
                  >
                    {submitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                </div>
              </form>
            </div>
          ) : activeTab === 'address' ? (
            <AddressBook />
          ) : (
            /* ── ORDERS TAB ── */
            <div className="space-y-4">
              <h2 className="text-xl font-black" style={{ fontFamily: 'Outfit, sans-serif' }}>Lịch sử đơn hàng</h2>
              {ordersLoading ? (
                <div className="flex items-center gap-3 text-on-surface-variant py-8">
                  <span className="material-symbols-outlined animate-spin text-primary">sync</span>
                  Đang tải đơn hàng...
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-16">
                  <span className="material-symbols-outlined text-[56px] text-on-surface-variant/30" style={{ fontVariationSettings: "'FILL' 1" }}>shopping_bag</span>
                  <p className="mt-4 text-on-surface-variant">Bạn chưa có đơn hàng nào</p>
                </div>
              ) : (
                orders.map((order, i) => {
                  const fmt = (v: number) => new Intl.NumberFormat('vi-VN').format(v) + '₫';
                  
                  // 1. Payment Status Badge
                  const isPaid = order.payment_status === 'completed' || order.status === 'paid' || order.status === 'confirmed';
                  const paymentBadge = isPaid
                    ? { label: '💳 Đã thanh toán', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
                    : order.status === 'cancelled'
                    ? { label: '💳 Đã hủy thanh toán', bg: 'bg-slate-50 text-slate-500 border-slate-200' }
                    : { label: '⏳ Chờ thanh toán', bg: 'bg-amber-50 text-amber-700 border-amber-200' };

                  // 2. Order Fulfillment Status Badge
                  const ORDER_STATUS_MAP: Record<string, { label: string; bg: string }> = {
                    pending: { label: '📦 Đang xử lý đơn hàng', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
                    paid: { label: '📦 Đang xử lý đơn hàng', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
                    confirmed: { label: '📦 Đang xử lý đơn hàng', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
                    processing: { label: '⚙️ Đang chuẩn bị hàng', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
                    shipped: { label: '🚚 Đang giao hàng', bg: 'bg-purple-50 text-purple-700 border-purple-200' },
                    delivered: { label: '✅ Đã giao hàng', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                    cancelled: { label: '❌ Đã hủy', bg: 'bg-rose-50 text-rose-700 border-rose-200' },
                  };

                  const orderBadge = ORDER_STATUS_MAP[order.status] || {
                    label: '📦 Đang xử lý đơn hàng',
                    bg: 'bg-blue-50 text-blue-700 border-blue-200'
                  };

                  const pm = order.payment_method === 'momo' ? 'MoMo' : order.payment_method === 'cod' ? 'COD' : order.payment_method === 'qr' ? 'Chuyển khoản VietQR' : order.payment_method;
                  return (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                      onClick={() => setSelectedOrder(order)}
                      className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-lg hover:border-blue-200 cursor-pointer transition-all duration-200 text-slate-700 group"
                    >
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Mã đơn hàng</p>
                          <p className="font-mono font-bold text-sm text-blue-600 group-hover:underline">#{order.id.toUpperCase()}</p>
                        </div>
                        
                        {/* 2 BADGES RIÊNG BIỆT: THANH TOÁN & ĐƠN HÀNG */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-bold px-3 py-1 rounded-full border ${paymentBadge.bg}`}>
                            {paymentBadge.label}
                          </span>
                          <span className={`text-xs font-bold px-3 py-1 rounded-full border ${orderBadge.bg}`}>
                            {orderBadge.label}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-xs text-slate-400 mb-1">Tổng tiền</p>
                          <p className="font-black text-blue-600 text-base">{fmt(order.total)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 mb-1">Thanh toán</p>
                          <p className="font-bold text-slate-700">{pm}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 mb-1">Ngày đặt hàng</p>
                          <p className="font-bold text-slate-700">{new Date(order.created_at).toLocaleDateString('vi-VN')}</p>
                        </div>
                        <div className="col-span-2 sm:col-span-3">
                          <p className="text-xs text-slate-400 mb-1">Địa chỉ giao hàng</p>
                          <p className="text-xs font-medium text-slate-600">{order.shipping_address}</p>
                        </div>
                      </div>

                      {/* Clickable CTA footer */}
                      <div className="mt-4 pt-3 border-t border-slate-100/80 flex items-center justify-between text-xs font-bold text-blue-600 group-hover:text-blue-700">
                        <span>📦 {order.items?.length || 0} sản phẩm trong đơn hàng</span>
                        <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                          Xem chi tiết <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                        </span>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          )}
        </section>
      </main>

      {/* ── ORDER DETAIL MODAL ── */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Chi tiết đơn hàng</span>
                  <h3 className="text-lg font-black text-slate-800 font-mono">#{selectedOrder.id.toUpperCase()}</h3>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="w-9 h-9 rounded-full bg-slate-200/60 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto space-y-6 text-slate-700 text-sm">
                {/* Status Badges */}
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className={`text-xs font-bold px-3.5 py-1.5 rounded-full border ${
                    selectedOrder.payment_status === 'completed' || selectedOrder.status === 'paid' || selectedOrder.status === 'confirmed'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : selectedOrder.status === 'cancelled'
                      ? 'bg-slate-50 text-slate-500 border-slate-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {selectedOrder.payment_status === 'completed' || selectedOrder.status === 'paid' || selectedOrder.status === 'confirmed'
                      ? '💳 Đã thanh toán'
                      : selectedOrder.status === 'cancelled'
                      ? '💳 Đã hủy thanh toán'
                      : '⏳ Chờ thanh toán'}
                  </span>

                  <span className="text-xs font-bold px-3.5 py-1.5 rounded-full border bg-blue-50 text-blue-700 border-blue-200">
                    📦 Đang xử lý đơn hàng
                  </span>
                </div>

                {/* Recipient & Delivery Address */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-1.5">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Thông tin nhận hàng</p>
                  <p className="font-bold text-slate-800">{selectedOrder.shipping_name || user?.name || 'Khách hàng'}</p>
                  {selectedOrder.shipping_phone && (
                    <p className="text-xs text-slate-600 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">call</span> SĐT: {selectedOrder.shipping_phone}
                    </p>
                  )}
                  <p className="text-xs text-slate-600 flex items-start gap-1">
                    <span className="material-symbols-outlined text-[14px] mt-0.5">location_on</span>
                    Địa chỉ: {selectedOrder.shipping_address}{selectedOrder.shipping_city ? `, ${selectedOrder.shipping_city}` : ''}
                  </p>
                </div>

                {/* Order Items List */}
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Sản phẩm trong đơn hàng ({selectedOrder.items?.length || 0})</p>
                  <div className="space-y-2.5">
                    {selectedOrder.items && selectedOrder.items.length > 0 ? (
                      selectedOrder.items.map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
                          <div>
                            <p className="font-bold text-slate-800 text-sm">{item.product_name}</p>
                            {item.variant_info && <p className="text-xs text-slate-500 mt-0.5">{item.variant_info}</p>}
                            <p className="text-xs text-slate-400 mt-1">
                              Đơn giá: <span className="font-semibold text-slate-600">{new Intl.NumberFormat('vi-VN').format(item.unit_price)}₫</span> × {item.quantity}
                            </p>
                          </div>
                          <span className="font-black text-blue-600 text-base">{new Intl.NumberFormat('vi-VN').format(item.total_price)}₫</span>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center bg-slate-50 rounded-2xl text-xs text-slate-400">
                        Thông tin tổng quan đơn hàng đã được ghi nhận.
                      </div>
                    )}
                  </div>
                </div>

                {/* Summary Details */}
                <div className="pt-4 border-t border-slate-100 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Phương thức thanh toán:</span>
                    <span className="font-bold text-slate-800">
                      {selectedOrder.payment_method === 'momo' ? 'MoMo' : selectedOrder.payment_method === 'cod' ? 'Thanh toán COD' : selectedOrder.payment_method === 'qr' ? 'Chuyển khoản VietQR' : selectedOrder.payment_method}
                    </span>
                  </div>
                  {selectedOrder.transaction_ref && (
                    <div className="flex justify-between text-slate-500">
                      <span>Mã giao dịch / SePay:</span>
                      <span className="font-mono font-bold text-blue-600">{selectedOrder.transaction_ref}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-500">
                    <span>Thời gian đặt hàng:</span>
                    <span className="font-semibold text-slate-800">{new Date(selectedOrder.created_at).toLocaleString('vi-VN')}</span>
                  </div>

                  <div className="flex justify-between text-base font-black text-blue-600 pt-3 border-t border-slate-100">
                    <span>Tổng tiền thanh toán:</span>
                    <span className="text-lg">{new Intl.NumberFormat('vi-VN').format(selectedOrder.total)}₫</span>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="px-6 py-2.5 rounded-full bg-slate-800 text-white font-bold text-xs hover:bg-slate-900 transition-all active:scale-95 shadow-md"
                >
                  Đóng
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
