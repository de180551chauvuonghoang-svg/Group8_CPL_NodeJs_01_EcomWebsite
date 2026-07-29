import { useEffect, useState } from 'react';
import { Mail, Save } from 'lucide-react';
import { adminService, AdminNotificationTemplateRow } from '../services/adminService';

const KNOWN_TEMPLATES: Array<{ code: string; label: string; variables: string[] }> = [
  { code: 'order_confirmed', label: 'Đặt hàng thành công', variables: ['customer_name', 'order_id', 'total'] },
  { code: 'order_cancelled', label: 'Đơn hàng đã huỷ', variables: ['customer_name', 'order_id'] },
  { code: 'order_shipped', label: 'Đơn hàng đang giao', variables: ['customer_name', 'order_id', 'tracking_code'] }
];

export default function AdminNotifications() {
  const [templates, setTemplates] = useState<AdminNotificationTemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [activeCode, setActiveCode] = useState(KNOWN_TEMPLATES[0].code);
  const [subject, setSubject] = useState('');
  const [htmlBody, setHtmlBody] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadTemplates = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminService.getNotificationTemplates();
      setTemplates(data);
    } catch (err: any) {
      setError(err?.message || 'Không tải được danh sách mẫu thông báo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    const existing = templates.find(t => t.code === activeCode);
    if (existing) {
      setSubject(existing.subject);
      setHtmlBody(existing.html_body);
      setIsActive(existing.is_active);
    } else {
      setSubject('');
      setHtmlBody('');
      setIsActive(true);
    }
  }, [activeCode, templates]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !htmlBody.trim()) {
      setError('Vui lòng nhập đầy đủ tiêu đề và nội dung.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await adminService.saveNotificationTemplate({
        code: activeCode,
        subject: subject.trim(),
        html_body: htmlBody,
        is_active: isActive
      });
      setNotice('Đã lưu mẫu thông báo.');
      await loadTemplates();
    } catch (err: any) {
      setError(err?.message || 'Lưu mẫu thất bại.');
    } finally {
      setSaving(false);
    }
  };

  const activeMeta = KNOWN_TEMPLATES.find(t => t.code === activeCode)!;

  return (
    <div className="min-h-screen bg-surface p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/30">
            <Mail size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-on-surface">Nội Dung Email / Thông Báo</h1>
            <p className="text-on-surface-variant text-sm">Soạn nội dung email tự động gửi cho khách hàng khi đơn hàng thay đổi trạng thái</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {KNOWN_TEMPLATES.map(t => {
            const exists = templates.some(tpl => tpl.code === t.code);
            return (
              <button
                key={t.code}
                onClick={() => setActiveCode(t.code)}
                className={`px-4 py-2 rounded-full text-sm font-bold border-2 transition-all ${
                  activeCode === t.code
                    ? 'bg-primary text-white border-primary'
                    : 'border-outline-variant/50 text-on-surface-variant hover:border-primary/40'
                }`}
              >
                {t.label}
                {!exists && <span className="ml-1.5 opacity-60">(chưa có)</span>}
              </button>
            );
          })}
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
          <form onSubmit={handleSave} className="bg-surface-container-lowest/80 backdrop-blur-xl rounded-3xl border border-outline-variant/30 shadow-sm p-6 space-y-4">
            <div className="text-xs text-on-surface-variant bg-surface-container rounded-xl px-4 py-2.5">
              Biến có thể dùng trong tiêu đề/nội dung: {activeMeta.variables.map(v => `{{${v}}}`).join(', ')}
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface-variant mb-1">Tiêu đề email *</label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/40 bg-surface text-on-surface text-sm"
                placeholder="VD: [Volitify] Đơn hàng {{order_id}} đã được xác nhận"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface-variant mb-1">Nội dung (HTML) *</label>
              <textarea
                value={htmlBody}
                onChange={e => setHtmlBody(e.target.value)}
                rows={12}
                className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/40 bg-surface text-on-surface text-sm font-mono"
                placeholder="<p>Chào {{customer_name}}, đơn hàng {{order_id}} của bạn...</p>"
                required
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-on-surface-variant">
              <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
              Kích hoạt — tự động gửi khi có sự kiện tương ứng
            </label>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-white font-bold text-sm hover:opacity-90 disabled:opacity-50 transition-all"
              >
                <Save size={16} />
                {saving ? 'Đang lưu...' : 'Lưu mẫu'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
