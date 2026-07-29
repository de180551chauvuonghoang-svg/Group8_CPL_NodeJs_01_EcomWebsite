import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Ban, CheckCircle2, KeyRound, MapPin, UserCircle2 } from 'lucide-react';
import { adminService, AdminUserDetail as AdminUserDetailType } from '../services/adminService';

const formatMoney = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value || 0));

const STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  processing: 'Đang xử lý',
  shipped: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã huỷ',
  refunded: 'Đã hoàn tiền'
};

const BOOM_WARNING_THRESHOLD = 3;

export default function AdminUserDetail() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<AdminUserDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [acting, setActing] = useState(false);
  const [lockReason, setLockReason] = useState('');
  const [showLockForm, setShowLockForm] = useState(false);

  const load = () => {
    if (!userId) return;
    setLoading(true);
    setError('');
    adminService
      .getUserDetail(userId)
      .then(setUser)
      .catch((err: any) => setError(err?.message || 'Không tải được thông tin khách hàng.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleUnlock = async () => {
    if (!user) return;
    setActing(true);
    try {
      await adminService.setUserStatus(user.id, true);
      setUser({ ...user, is_active: true, suspend_reason: null });
    } catch (err: any) {
      setError(err?.message || 'Mở khoá thất bại.');
    } finally {
      setActing(false);
    }
  };

  const handleLock = async () => {
    if (!user || !lockReason.trim()) {
      setError('Vui lòng nhập lý do khoá tài khoản.');
      return;
    }
    setActing(true);
    try {
      await adminService.setUserStatus(user.id, false, lockReason.trim());
      setUser({ ...user, is_active: false, suspend_reason: lockReason.trim() });
      setShowLockForm(false);
    } catch (err: any) {
      setError(err?.message || 'Khoá tài khoản thất bại.');
    } finally {
      setActing(false);
    }
  };

  const handleResetPassword = async () => {
    if (!user) return;
    if (!window.confirm(`Gửi email đặt lại mật khẩu cho "${user.name}" (${user.email})?`)) return;
    setActing(true);
    setNotice('');
    try {
      const result = await adminService.resetUserPassword(user.id);
      setNotice(result?.message || `Đã gửi email đặt lại mật khẩu cho ${user.email}.`);
    } catch (err: any) {
      setError(err?.message || 'Gửi email đặt lại mật khẩu thất bại.');
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface p-6 lg:p-8 flex flex-col items-center justify-center text-primary">
        <span className="material-symbols-outlined text-4xl animate-spin">sync</span>
        <p className="mt-2 font-semibold">Đang tải...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-surface p-6 lg:p-8">
        <div className="max-w-3xl mx-auto text-error bg-error/10 border border-error/20 rounded-2xl px-4 py-3 text-sm">
          {error || 'Không tìm thấy người dùng này.'}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => navigate('/admin/users')}
          className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary mb-4 transition-colors"
        >
          <ArrowLeft size={16} />
          Quay lại danh sách
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/30">
            <UserCircle2 size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-on-surface">{user.name}</h1>
            <p className="text-on-surface-variant text-sm">
              {user.email}{user.phone_number ? ` · ${user.phone_number}` : ''}
            </p>
          </div>
        </div>

        {notice && (
          <div className="mb-4 text-primary bg-primary/10 border border-primary/20 rounded-2xl px-4 py-3 text-sm">
            {notice}
          </div>
        )}
        {error && (
          <div className="mb-4 text-error bg-error/10 border border-error/20 rounded-2xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-surface-container-lowest/80 backdrop-blur-xl rounded-3xl border border-outline-variant/30 shadow-sm p-5">
            <p className="text-xs font-bold text-on-surface-variant">Tổng chi tiêu</p>
            <p className="text-xl font-black text-on-surface mt-1">{formatMoney(user.total_spent)}</p>
          </div>
          <div className="bg-surface-container-lowest/80 backdrop-blur-xl rounded-3xl border border-outline-variant/30 shadow-sm p-5">
            <p className="text-xs font-bold text-on-surface-variant">Tổng số đơn</p>
            <p className="text-xl font-black text-on-surface mt-1">{user.total_orders}</p>
          </div>
          <div className="bg-surface-container-lowest/80 backdrop-blur-xl rounded-3xl border border-outline-variant/30 shadow-sm p-5">
            <p className="text-xs font-bold text-on-surface-variant">Trạng thái</p>
            <p className={`text-xl font-black mt-1 ${user.is_active ? 'text-green-600' : 'text-error'}`}>
              {user.is_active ? 'Hoạt động' : 'Đã khoá'}
            </p>
          </div>
        </div>

        {(user.boom_count || 0) >= BOOM_WARNING_THRESHOLD && (
          <div className="mb-6 flex items-start gap-2 bg-error/10 text-error rounded-2xl px-4 py-3 text-sm">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            <span>Tài khoản này đã huỷ {(user.boom_count || 0)} đơn COD trong 30 ngày gần đây — nghi ngờ "boom hàng".</span>
          </div>
        )}

        {!user.is_active && user.suspend_reason && (
          <div className="mb-6 bg-surface-container-lowest/80 rounded-2xl px-4 py-3 text-sm border border-outline-variant/30">
            <span className="font-bold text-on-surface-variant">Lý do khoá: </span>
            <span className="text-on-surface">{user.suspend_reason}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-8">
          {user.role !== 'admin' && (
            <button
              onClick={handleResetPassword}
              disabled={acting}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full font-bold text-sm border-2 border-primary/40 text-primary hover:bg-primary/5 transition-all disabled:opacity-50"
            >
              <KeyRound size={16} />
              Đặt lại mật khẩu
            </button>
          )}
          {user.role !== 'admin' && (
            user.is_active ? (
              <button
                onClick={() => setShowLockForm(true)}
                disabled={acting}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full font-bold text-sm border-2 border-error/40 text-error hover:bg-error/5 transition-all disabled:opacity-50"
              >
                <Ban size={16} />
                Khoá tài khoản
              </button>
            ) : (
              <button
                onClick={handleUnlock}
                disabled={acting}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full font-bold text-sm border-2 border-primary/40 text-primary hover:bg-primary/5 transition-all disabled:opacity-50"
              >
                <CheckCircle2 size={16} />
                Mở khoá
              </button>
            )
          )}
        </div>

        {showLockForm && (
          <div className="mb-8 bg-surface-container-lowest/80 backdrop-blur-xl rounded-3xl border border-outline-variant/30 shadow-sm p-5">
            <label className="block text-xs font-bold text-on-surface-variant mb-2">Lý do khoá tài khoản *</label>
            <textarea
              value={lockReason}
              onChange={e => setLockReason(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/40 bg-surface text-on-surface text-sm mb-3"
              placeholder="Ví dụ: Boom hàng nhiều lần, gian lận thanh toán..."
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowLockForm(false)}
                className="px-4 py-2 rounded-full border-2 border-outline-variant/50 text-on-surface-variant font-bold text-sm"
              >
                Huỷ
              </button>
              <button
                onClick={handleLock}
                disabled={acting}
                className="px-4 py-2 rounded-full bg-error text-white font-bold text-sm disabled:opacity-50"
              >
                Xác nhận khoá
              </button>
            </div>
          </div>
        )}

        {user.addresses?.length > 0 && (
          <div className="mb-8">
            <h2 className="font-bold text-on-surface mb-3 flex items-center gap-2">
              <MapPin size={16} />
              Địa chỉ
            </h2>
            <div className="space-y-2">
              {user.addresses.map(addr => (
                <div key={addr.id} className="bg-surface-container-lowest/80 rounded-2xl border border-outline-variant/30 px-4 py-3 text-sm">
                  <p className="font-semibold text-on-surface">{addr.recipient_name} · {addr.phone_number}</p>
                  <p className="text-on-surface-variant">{addr.street_address}{addr.city ? `, ${addr.city}` : ''}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="font-bold text-on-surface mb-3">Lịch sử đơn hàng</h2>
          <div className="bg-surface-container-lowest/80 backdrop-blur-xl rounded-3xl border border-outline-variant/30 shadow-sm overflow-hidden">
            {user.orders.length === 0 ? (
              <div className="py-10 text-center text-on-surface-variant text-sm">Chưa có đơn hàng nào.</div>
            ) : (
              user.orders.map(order => (
                <Link
                  key={order.id}
                  to="/admin/orders"
                  className="flex justify-between items-center px-6 py-3 border-b border-outline-variant/10 last:border-0 hover:bg-surface-container/50 transition-colors text-sm"
                >
                  <span className="font-mono text-xs text-on-surface-variant">{order.id.slice(0, 8)}...</span>
                  <span className="text-on-surface-variant">{STATUS_LABELS[order.status] || order.status}</span>
                  <span className="font-bold text-on-surface">{formatMoney(order.total)}</span>
                  <span className="text-xs text-on-surface-variant">{new Date(order.created_at).toLocaleDateString('vi-VN')}</span>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
