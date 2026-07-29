import { Fragment, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp, History } from 'lucide-react';
import { adminService, AdminAuditLogRow } from '../services/adminService';

const ACTION_LABELS: Record<string, string> = {
  approve_seller: 'Duyệt shop',
  reject_seller: 'Từ chối shop',
  suspend_seller: 'Khoá shop',
  lock_user: 'Khoá tài khoản',
  unlock_user: 'Mở khoá tài khoản',
  reset_user_password: 'Đặt lại mật khẩu KH',
  create_category: 'Tạo danh mục',
  update_category: 'Sửa danh mục',
  delete_category: 'Xoá danh mục',
  create_brand: 'Tạo thương hiệu',
  update_brand: 'Sửa thương hiệu',
  set_brand_status: 'Đổi trạng thái thương hiệu',
  adjust_inventory: 'Điều chỉnh tồn kho',
  confirm_payment: 'Xác nhận thanh toán',
  create_banner: 'Tạo banner',
  update_banner: 'Sửa banner',
  delete_banner: 'Ẩn banner',
  create_coupon: 'Tạo voucher',
  update_coupon: 'Sửa voucher',
  delete_coupon: 'Xoá voucher',
  save_notification_template: 'Sửa mẫu thông báo'
};

export default function AdminAuditLog() {
  const [logs, setLogs] = useState<AdminAuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError('');
    adminService
      .getAuditLogs()
      .then(setLogs)
      .catch((err: any) => setError(err?.message || 'Không tải được nhật ký hoạt động.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-surface p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/30">
            <History size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-on-surface">Nhật Ký Hoạt Động</h1>
            <p className="text-on-surface-variant text-sm">Theo dõi các thao tác nhạy cảm của Admin (sửa giá, xoá sản phẩm, khoá tài khoản...)</p>
          </div>
        </div>

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
                  <th className="px-6 py-3 font-semibold">Admin</th>
                  <th className="px-6 py-3 font-semibold">Hành động</th>
                  <th className="px-6 py-3 font-semibold">Đối tượng</th>
                  <th className="px-6 py-3 font-semibold">Thời gian</th>
                  <th className="px-6 py-3 font-semibold text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <Fragment key={log.id}>
                    <motion.tr
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border-b border-outline-variant/10 last:border-0"
                    >
                      <td className="px-6 py-4">
                        <p className="font-semibold text-on-surface">{log.admin_name}</p>
                        <p className="text-xs text-on-surface-variant">{log.admin_email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary">
                          {ACTION_LABELS[log.action] || log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-on-surface-variant text-xs">
                        {log.entity_type}{log.entity_id ? ` · ${log.entity_id.slice(0, 8)}...` : ''}
                      </td>
                      <td className="px-6 py-4 text-on-surface-variant text-xs">
                        {new Date(log.created_at).toLocaleString('vi-VN')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {(log.before_data || log.after_data) && (
                          <button
                            onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                          >
                            {expandedId === log.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            Xem
                          </button>
                        )}
                      </td>
                    </motion.tr>
                    {expandedId === log.id && (
                      <tr className="bg-surface-container/40">
                        <td colSpan={5} className="px-6 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                            {log.before_data && (
                              <div>
                                <p className="font-bold text-on-surface-variant mb-1">Trước:</p>
                                <pre className="whitespace-pre-wrap break-all bg-surface rounded-xl p-3">{log.before_data}</pre>
                              </div>
                            )}
                            {log.after_data && (
                              <div>
                                <p className="font-bold text-on-surface-variant mb-1">Sau:</p>
                                <pre className="whitespace-pre-wrap break-all bg-surface rounded-xl p-3">{log.after_data}</pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
            {logs.length === 0 && (
              <div className="py-16 text-center text-on-surface-variant">Chưa có nhật ký nào.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
