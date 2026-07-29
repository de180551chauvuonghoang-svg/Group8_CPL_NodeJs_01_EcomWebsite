import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Ban, CheckCircle2, Image as ImageIcon, Pencil, Plus, X } from 'lucide-react';
import { adminService, AdminBannerRow } from '../services/adminService';
import ImageUploadField from '../components/admin/ImageUploadField';

type FormState = {
  id?: string;
  title: string;
  image_url: string;
  link_url: string;
  sort_order: string;
};

const EMPTY_FORM: FormState = { title: '', image_url: '', link_url: '', sort_order: '0' };

export default function AdminBanners() {
  const [banners, setBanners] = useState<AdminBannerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const loadBanners = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminService.getAdminBanners();
      setBanners(data);
    } catch (err: any) {
      setError(err?.message || 'Không tải được danh sách banner.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBanners();
  }, []);

  const openCreateForm = () => {
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEditForm = (banner: AdminBannerRow) => {
    setForm({
      id: banner.id,
      title: banner.title,
      image_url: banner.image_url,
      link_url: banner.link_url || '',
      sort_order: String(banner.sort_order)
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.image_url.trim()) {
      setError('Vui lòng nhập tiêu đề và ảnh banner.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        title: form.title.trim(),
        image_url: form.image_url.trim(),
        link_url: form.link_url.trim() || undefined,
        sort_order: Number(form.sort_order) || 0
      };
      if (form.id) {
        await adminService.updateBanner(form.id, payload);
      } else {
        await adminService.createBanner(payload);
      }
      setShowForm(false);
      await loadBanners();
    } catch (err: any) {
      setError(err?.message || 'Lưu banner thất bại.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (banner: AdminBannerRow) => {
    setActioningId(banner.id);
    try {
      if (banner.is_active) {
        await adminService.deleteBanner(banner.id);
        setBanners(prev => prev.map(b => (b.id === banner.id ? { ...b, is_active: false } : b)));
      } else {
        await adminService.updateBanner(banner.id, { is_active: true });
        setBanners(prev => prev.map(b => (b.id === banner.id ? { ...b, is_active: true } : b)));
      }
    } catch (err: any) {
      setError(err?.message || 'Cập nhật trạng thái thất bại.');
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="min-h-screen bg-surface p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/30">
              <ImageIcon size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-on-surface">Banner Khuyến Mãi</h1>
              <p className="text-on-surface-variant text-sm">Quản lý banner hiển thị trên trang chủ để quảng bá sản phẩm</p>
            </div>
          </div>
          <button
            onClick={openCreateForm}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary text-white font-bold text-sm hover:opacity-90 transition-all"
          >
            <Plus size={16} />
            Thêm banner
          </button>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {banners.map(banner => (
              <motion.div
                key={banner.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-surface-container-lowest/80 backdrop-blur-xl rounded-3xl border border-outline-variant/30 shadow-sm overflow-hidden"
              >
                <div className="aspect-[21/9] bg-surface-container overflow-hidden">
                  <img src={banner.image_url} alt={banner.title} className="w-full h-full object-cover" />
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="font-bold text-on-surface truncate">{banner.title}</h3>
                    {banner.is_active ? (
                      <span className="text-xs font-bold text-green-600 shrink-0">Đang hiển thị</span>
                    ) : (
                      <span className="text-xs font-bold text-error shrink-0">Đã ẩn</span>
                    )}
                  </div>
                  {banner.link_url && <p className="text-xs text-on-surface-variant truncate mb-3">{banner.link_url}</p>}
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => openEditForm(banner)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-xs border-2 border-primary/40 text-primary hover:bg-primary/5 transition-all"
                    >
                      <Pencil size={14} />
                      Sửa
                    </button>
                    <button
                      onClick={() => handleToggleActive(banner)}
                      disabled={actioningId === banner.id}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-xs border-2 transition-all disabled:opacity-50 ${
                        banner.is_active ? 'border-error/40 text-error hover:bg-error/5' : 'border-primary/40 text-primary hover:bg-primary/5'
                      }`}
                    >
                      {banner.is_active ? <Ban size={14} /> : <CheckCircle2 size={14} />}
                      {banner.is_active ? 'Ẩn' : 'Bật lại'}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
            {banners.length === 0 && (
              <div className="col-span-full py-16 text-center text-on-surface-variant">Chưa có banner nào.</div>
            )}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-on-surface">{form.id ? 'Sửa banner' : 'Thêm banner mới'}</h2>
              <button onClick={() => setShowForm(false)} className="text-on-surface-variant hover:text-on-surface">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1">Tiêu đề *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/40 bg-surface text-on-surface text-sm"
                  required
                />
              </div>
              <ImageUploadField
                label="Ảnh banner"
                value={form.image_url}
                onChange={url => setForm(prev => ({ ...prev, image_url: url }))}
                required
              />
              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1">Link khi bấm vào (tuỳ chọn)</label>
                <input
                  type="text"
                  value={form.link_url}
                  onChange={e => setForm(prev => ({ ...prev, link_url: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/40 bg-surface text-on-surface text-sm"
                  placeholder="/products?category=..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1">Thứ tự hiển thị</label>
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={e => setForm(prev => ({ ...prev, sort_order: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/40 bg-surface text-on-surface text-sm"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2.5 rounded-full border-2 border-outline-variant/50 text-on-surface-variant font-bold text-sm hover:border-primary/40 transition-all"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-full bg-primary text-white font-bold text-sm hover:opacity-90 disabled:opacity-50 transition-all"
                >
                  {saving ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
