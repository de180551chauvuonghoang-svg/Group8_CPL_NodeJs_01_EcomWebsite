import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { paymentService, OrderStatusData } from '../services/paymentService';

// ─── Particle confetti (CSS only, no library) ──────────────────────────────────
const CONFETTI_COLORS = ['#004ac6', '#6366f1', '#34d399', '#fbbf24', '#f472b6'];
function Confetti() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      {Array.from({ length: 30 }).map((_, i) => {
        const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
        const left  = `${(i * 3.33) % 100}%`;
        const size  = 6 + (i % 5) * 2;
        const delay = `${(i * 0.12).toFixed(2)}s`;
        const dur   = `${2.5 + (i % 4) * 0.4}s`;
        return (
          <motion.div
            key={i}
            style={{ position: 'absolute', top: '-20px', left, width: size, height: size, borderRadius: i % 2 === 0 ? '50%' : 2, background: color }}
            animate={{ y: '110vh', rotate: i % 2 === 0 ? 360 : -360, opacity: [1, 1, 0] }}
            transition={{ duration: parseFloat(dur), delay: parseFloat(delay), ease: 'linear', repeat: 0 }}
          />
        );
      })}
    </div>
  );
}

// ─── Status badge ──────────────────────────────────────────────────────────────
const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending:   { label: 'Chờ xử lý',   color: '#fbbf24' },
  confirmed: { label: 'Đã xác nhận', color: '#34d399' },
  paid:      { label: 'Đã thanh toán', color: '#34d399' },
  cod:       { label: 'COD',          color: '#60a5fa' },
  momo:      { label: 'MoMo',         color: '#ae2070' },
  failed:    { label: 'Thất bại',     color: '#f87171' },
};
const StatusBadge = ({ value }: { value: string }) => {
  const s = STATUS_MAP[value] || { label: value, color: '#94a3b8' };
  return (
    <span className="text-xs font-bold px-2.5 py-1 rounded-full"
      style={{ background: `${s.color}20`, color: s.color }}>{s.label}</span>
  );
};

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function PaymentReturn() {
  const [params]   = useSearchParams();
  const navigate   = useNavigate();
  const resultCode = Number(params.get('resultCode') ?? 1);
  const orderId    = params.get('orderId') ?? '';
  const method     = params.get('method') ?? 'momo'; // 'momo' | 'cod'
  const isSuccess  = resultCode === 0;

  const [order,   setOrder]   = useState<OrderStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const fmt = (v: number) => new Intl.NumberFormat('vi-VN').format(v) + '₫';

  useEffect(() => {
    if (!orderId) { setLoading(false); return; }
    paymentService.getOrderStatus(orderId)
      .then(setOrder)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orderId]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-background text-on-surface flex flex-col items-center justify-center px-4 pt-24 pb-20 relative"
    >
      {/* Ambient */}
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
        <div className="absolute inset-0" style={{
          background: isSuccess
            ? 'radial-gradient(ellipse at 50% 30%, rgba(52,211,153,0.06) 0%, transparent 65%)'
            : 'radial-gradient(ellipse at 50% 30%, rgba(248,113,113,0.06) 0%, transparent 65%)'
        }} />
      </div>

      {isSuccess && <Confetti />}

      <div className="relative z-10 w-full max-w-lg">
        {/* Icon */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
          className="mx-auto mb-6 w-24 h-24 rounded-full flex items-center justify-center"
          style={{
            background: isSuccess
              ? 'linear-gradient(135deg, rgba(52,211,153,0.2), rgba(52,211,153,0.05))'
              : 'linear-gradient(135deg, rgba(248,113,113,0.2), rgba(248,113,113,0.05))',
            border: `2px solid ${isSuccess ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)'}`,
          }}
        >
          <span
            className="material-symbols-outlined text-[52px]"
            style={{ color: isSuccess ? '#34d399' : '#f87171', fontVariationSettings: "'FILL' 1" }}
          >
            {isSuccess ? 'check_circle' : 'cancel'}
          </span>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-black mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
            {isSuccess ? '🎉 Đặt hàng thành công!' : 'Thanh toán thất bại'}
          </h1>
          <p className="text-on-surface-variant text-sm leading-relaxed">
            {isSuccess
              ? method === 'cod'
                ? 'Đơn hàng của bạn đã được tiếp nhận. Chúng tôi sẽ liên hệ xác nhận sớm nhất.'
                : 'Thanh toán MoMo thành công. Đơn hàng của bạn đang được xử lý.'
              : 'Thanh toán không thành công. Bạn có thể thử lại hoặc chọn phương thức khác.'}
          </p>
        </motion.div>

        {/* Order detail card */}
        {isSuccess && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="rounded-3xl p-6 border border-white/8 mb-6"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            {loading ? (
              <div className="flex items-center gap-3 text-on-surface-variant text-sm">
                <span className="material-symbols-outlined animate-spin text-primary">sync</span>
                Đang tải thông tin đơn hàng...
              </div>
            ) : order ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs text-on-surface-variant font-semibold uppercase tracking-wider">Mã đơn hàng</p>
                  <p className="text-sm font-mono font-bold text-primary">#{order.id.substring(0, 12).toUpperCase()}</p>
                </div>
                <div className="h-px bg-white/8 mb-4" />
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-on-surface-variant mb-1">Người nhận</p>
                    <p className="font-semibold">{order.shipping_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-on-surface-variant mb-1">Tổng tiền</p>
                    <p className="font-black text-primary">{fmt(order.total)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-on-surface-variant mb-1">Trạng thái đơn</p>
                    <StatusBadge value={order.order_status} />
                  </div>
                  <div>
                    <p className="text-xs text-on-surface-variant mb-1">Thanh toán</p>
                    <StatusBadge value={order.payment_method || method} />
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-on-surface-variant mb-1">Địa chỉ giao hàng</p>
                    <p className="text-xs">{order.shipping_address}</p>
                  </div>
                  {order.transaction_ref && (
                    <div className="col-span-2">
                      <p className="text-xs text-on-surface-variant mb-1">Mã giao dịch MoMo</p>
                      <p className="text-xs font-mono">{order.transaction_ref}</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-on-surface-variant">
                Mã đơn hàng: <span className="font-mono text-primary">#{orderId.substring(0, 12).toUpperCase()}</span>
              </p>
            )}
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="flex flex-col sm:flex-row gap-3"
        >
          {isSuccess ? (
            <>
              <Link to="/profile" className="flex-1 h-12 rounded-2xl border border-white/15 flex items-center justify-center gap-2 text-sm font-bold text-on-surface hover:border-white/30 hover:bg-white/5 transition-all">
                <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                Xem đơn hàng
              </Link>
              <Link to="/"
                className="flex-1 h-12 rounded-2xl flex items-center justify-center gap-2 text-sm font-black text-white transition-all"
                style={{ background: 'var(--accent-gradient)' }}>
                <span className="material-symbols-outlined text-[18px]">home</span>
                Về trang chủ
              </Link>
            </>
          ) : (
            <>
              <button onClick={() => navigate('/checkout')}
                className="flex-1 h-12 rounded-2xl flex items-center justify-center gap-2 text-sm font-black text-white"
                style={{ background: 'var(--accent-gradient)' }}>
                <span className="material-symbols-outlined text-[18px]">refresh</span>
                Thử lại
              </button>
              <Link to="/cart"
                className="flex-1 h-12 rounded-2xl border border-white/15 flex items-center justify-center gap-2 text-sm font-bold text-on-surface hover:border-white/30 hover:bg-white/5 transition-all">
                <span className="material-symbols-outlined text-[18px]">shopping_cart</span>
                Về giỏ hàng
              </Link>
            </>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
