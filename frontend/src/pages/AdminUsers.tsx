import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, Ban, CheckCircle2, KeyRound, Search, UserMinus, Users as UsersIcon, X } from 'lucide-react';
import { adminService, AdminUserRow } from '../services/adminService';

type RoleFilter = 'all' | 'customer' | 'seller' | 'admin';

const ROLE_LABELS: Record<string, string> = {
  customer: 'Khách hàng',
  seller: 'Người bán',
  admin: 'Admin'
};

const BOOM_WARNING_THRESHOLD = 3;

export default function AdminUsers() {
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [lockTarget, setLockTarget] = useState<AdminUserRow | null>(null);
  const [lockReason, setLockReason] = useState('');

  const loadUsers = async (role: RoleFilter, q: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await adminService.getUsers({
        role: role === 'all' ? undefined : role,
        q: q.trim() || undefined
      });
      setUsers(data);
    } catch (err: any) {
      setError(err?.message || 'Không tải được danh sách người dùng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => loadUsers(roleFilter, search), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter, search]);

  const handleUnlock = async (user: AdminUserRow) => {
    setActioningId(user.id);
    try {
      await adminService.setUserStatus(user.id, true);
      setUsers(prev => prev.map(u => (u.id === user.id ? { ...u, is_active: true, suspend_reason: null } : u)));
    } catch (err: any) {
      setError(err?.message || 'Mở khoá thất bại.');
    } finally {
      setActioningId(null);
    }
  };

  const openLockModal = (user: AdminUserRow) => {
    setLockReason('');
    setLockTarget(user);
  };

  const handleConfirmLock = async () => {
    if (!lockTarget) return;
    if (!lockReason.trim()) {
      setError('Vui lòng nhập lý do khoá tài khoản.');
      return;
    }
    setActioningId(lockTarget.id);
    try {
      await adminService.setUserStatus(lockTarget.id, false, lockReason.trim());
      setUsers(prev =>
        prev.map(u => (u.id === lockTarget.id ? { ...u, is_active: false, suspend_reason: lockReason.trim() } : u))
      );
      setLockTarget(null);
    } catch (err: any) {
      setError(err?.message || 'Khoá tài khoản thất bại.');
    } finally {
      setActioningId(null);
    }
  };

  const handleDemote = async (user: AdminUserRow) => {
    if (!window.confirm(`Hạ tài khoản "${user.name}" xuống lại User? Shop của họ sẽ bị khoá.`)) return;
    setActioningId(user.id);
    try {
      await adminService.demoteSeller(user.id);
      setUsers(prev => prev.map(u => (u.id === user.id ? { ...u, role: 'customer' } : u)));
    } catch (err: any) {
      setError(err?.message || 'Hạ quyền thất bại.');
    } finally {
      setActioningId(null);
    }
  };

  const handleResetPassword = async (user: AdminUserRow) => {
    if (!window.confirm(`Gửi email đặt lại mật khẩu cho "${user.name}" (${user.email})?`)) return;
    setActioningId(user.id);
    setError('');
    setNotice('');
    try {
      const result = await adminService.resetUserPassword(user.id);
      setNotice(result?.message || `Đã gửi email đặt lại mật khẩu cho ${user.email}.`);
    } catch (err: any) {
      setError(err?.message || 'Gửi email đặt lại mật khẩu thất bại.');
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="min-h-screen bg-surface p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/30">
            <UsersIcon size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-on-surface">Quản Lý Người Dùng</h1>
            <p className="text-on-surface-variant text-sm">Xem, khoá/mở khoá, đặt lại mật khẩu và hạ quyền tài khoản</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-start gap-3 mb-6">
          <div className="flex gap-2 flex-wrap">
            {(['all', 'customer', 'seller', 'admin'] as RoleFilter[]).map(role => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={`px-4 py-2 rounded-full text-sm font-bold border-2 transition-all ${
                  roleFilter === role
                    ? 'bg-primary text-white border-primary'
                    : 'border-outline-variant/50 text-on-surface-variant hover:border-primary/40'
                }`}
              >
                {role === 'all' ? 'Tất cả' : ROLE_LABELS[role]}
              </button>
            ))}
          </div>
          <div className="relative md:ml-auto md:w-72">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tên, email, SĐT..."
              className="w-full pl-10 pr-4 py-2.5 rounded-full border border-outline-variant/40 bg-surface-container-lowest text-on-surface text-sm"
            />
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

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-primary">
            <span className="material-symbols-outlined text-4xl animate-spin">sync</span>
            <p className="mt-2 font-semibold">Đang tải...</p>
          </div>
        ) : (
          <div className="bg-surface-container-lowest/80 backdrop-blur-xl rounded-3xl border border-outline-variant/30 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant/30 text-left text-on-surface-variant">
                  <th className="px-6 py-3 font-semibold">Tên</th>
                  <th className="px-6 py-3 font-semibold">Email</th>
                  <th className="px-6 py-3 font-semibold">SĐT</th>
                  <th className="px-6 py-3 font-semibold">Vai trò</th>
                  <th className="px-6 py-3 font-semibold">Trạng thái</th>
                  <th className="px-6 py-3 font-semibold text-right">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b border-outline-variant/10 last:border-0"
                  >
                    <td className="px-6 py-4 font-semibold text-on-surface">
                      <div className="flex items-center gap-2">
                        <Link to={`/admin/users/${user.id}`} className="hover:text-primary hover:underline">
                          {user.name}
                        </Link>
                        {(user.boom_count || 0) >= BOOM_WARNING_THRESHOLD && (
                          <span
                            title={`${user.boom_count} đơn COD bị huỷ trong 30 ngày gần đây`}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-error/10 text-error"
                          >
                            <AlertTriangle size={11} />
                            Boom hàng x{user.boom_count}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant">{user.email}</td>
                    <td className="px-6 py-4 text-on-surface-variant">{user.phone_number || '—'}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary">
                        {ROLE_LABELS[user.role] || user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {user.is_active ? (
                        <span className="text-xs font-bold text-green-600">Đang hoạt động</span>
                      ) : (
                        <div>
                          <span className="text-xs font-bold text-error">Đã khoá</span>
                          {user.suspend_reason && (
                            <p className="text-[11px] text-on-surface-variant mt-0.5 max-w-[180px] truncate" title={user.suspend_reason}>
                              Lý do: {user.suspend_reason}
                            </p>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 flex-wrap">
                        {user.role !== 'admin' && (
                          <button
                            onClick={() => handleResetPassword(user)}
                            disabled={actioningId === user.id}
                            title="Gửi email đặt lại mật khẩu"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-xs border-2 border-primary/40 text-primary hover:bg-primary/5 transition-all disabled:opacity-50"
                          >
                            <KeyRound size={14} />
                            Reset mật khẩu
                          </button>
                        )}
                        {user.role === 'seller' && (
                          <button
                            onClick={() => handleDemote(user)}
                            disabled={actioningId === user.id}
                            title="Hạ xuống User (khoá luôn shop)"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-xs border-2 border-error/40 text-error hover:bg-error/5 transition-all disabled:opacity-50"
                          >
                            <UserMinus size={14} />
                            Hạ xuống User
                          </button>
                        )}
                        {user.role !== 'admin' && (
                          user.is_active ? (
                            <button
                              onClick={() => openLockModal(user)}
                              disabled={actioningId === user.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-xs border-2 border-error/40 text-error hover:bg-error/5 transition-all disabled:opacity-50"
                            >
                              <Ban size={14} />
                              Khoá
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUnlock(user)}
                              disabled={actioningId === user.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-xs border-2 border-primary/40 text-primary hover:bg-primary/5 transition-all disabled:opacity-50"
                            >
                              <CheckCircle2 size={14} />
                              Mở khoá
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && (
              <div className="py-16 text-center text-on-surface-variant">Không có người dùng nào.</div>
            )}
          </div>
        )}
      </div>

      {lockTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 shadow-xl w-full max-w-md p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-on-surface">Khoá tài khoản "{lockTarget.name}"</h2>
              <button onClick={() => setLockTarget(null)} className="text-on-surface-variant hover:text-on-surface">
                <X size={20} />
              </button>
            </div>
            {(lockTarget.boom_count || 0) >= BOOM_WARNING_THRESHOLD && (
              <div className="mb-4 flex items-start gap-2 bg-error/10 text-error rounded-2xl px-4 py-3 text-xs">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <span>Tài khoản này đã huỷ {lockTarget.boom_count} đơn COD trong 30 ngày gần đây — nghi ngờ "boom hàng".</span>
              </div>
            )}
            <label className="block text-xs font-bold text-on-surface-variant mb-1">Lý do khoá *</label>
            <textarea
              value={lockReason}
              onChange={e => setLockReason(e.target.value)}
              rows={3}
              autoFocus
              placeholder="Ví dụ: Boom hàng nhiều lần, gian lận thanh toán..."
              className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/40 bg-surface text-on-surface text-sm"
            />
            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => setLockTarget(null)}
                className="px-4 py-2.5 rounded-full border-2 border-outline-variant/50 text-on-surface-variant font-bold text-sm hover:border-primary/40 transition-all"
              >
                Huỷ
              </button>
              <button
                onClick={handleConfirmLock}
                disabled={actioningId === lockTarget.id}
                className="px-5 py-2.5 rounded-full bg-error text-white font-bold text-sm hover:opacity-90 disabled:opacity-50 transition-all"
              >
                {actioningId === lockTarget.id ? 'Đang khoá...' : 'Xác nhận khoá'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
