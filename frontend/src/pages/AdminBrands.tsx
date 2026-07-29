import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Ban, CheckCircle2, Pencil, Plus, Tag, X } from 'lucide-react';
import { adminService, AdminBrandRow } from '../services/adminService';
import ImageUploadField from '../components/admin/ImageUploadField';

type FormState = {
  id?: string;
  name: string;
  logo_url: string;
  description: string;
};

const EMPTY_FORM: FormState = { name: '', logo_url: '', description: '' };

export default function AdminBrands() {
  const [brands, setBrands] = useState<AdminBrandRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const loadBrands = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminService.getBrands();
      setBrands(data);
    } catch (err: any) {
      setError(err?.message || 'Không tải được danh sách thương hiệu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBrands();
  }, []);

  const openCreateForm = () => {
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEditForm = (brand: AdminBrandRow) => {
    setForm({
      id: brand.id,
      name: brand.name,
      logo_url: brand.logo_url || '',
      description: brand.description || ''
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Vui lòng nhập tên thương hiệu.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: form.name.trim(),
        logo_url: form.logo_url.trim() || undefined,
        description: form.description.trim() || undefined
      };
      if (form.id) {
        await adminService.updateBrand(form.id, payload);
      } else {
        await adminService.createBrand(payload);
      }
      setShowForm(false);
      await loadBrands();
    } catch (err: any) {
      setError(err?.message || 'Lưu thương hiệu thất bại.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (brand: AdminBrandRow) => {
    const nextStatus = brand.status === 'active' ? 'inactive' : 'active';
    setActioningId(brand.id);
    try {
      await adminService.setBrandStatus(brand.id, nextStatus);
      setBrands(prev => prev.map(b => (b.id === brand.id ? { ...b, status: nextStatus } : b)));
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
              <Tag size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-on-surface">Nhà Cung Cấp / Thương Hiệu</h1>
              <p className="text-on-surface-variant text-sm">Quản lý thương hiệu thiết bị (Panasonic, Philips, Sino...)</p>
            </div>
          </div>
          <button
            onClick={openCreateForm}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary text-white font-bold text-sm hover:opacity-90 transition-all"
          >
            <Plus size={16} />
            Thêm thương hiệu
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {brands.map(brand => (
              <motion.div
                key={brand.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-surface-container-lowest/80 backdrop-blur-xl rounded-3xl border border-outline-variant/30 shadow-sm p-5 flex flex-col gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center overflow-hidden shrink-0">
                    {brand.logo_url ? (
                      <img src={brand.logo_url} alt={brand.name} className="w-full h-full object-cover" />
                    ) : (
                      <Tag size={20} className="text-on-surface-variant" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-bold text-on-surface truncate">{brand.name}</h2>
                    {brand.status === 'active' ? (
                      <span className="text-xs font-bold text-green-600">Đang hiển thị</span>
                    ) : (
                      <span className="text-xs font-bold text-error">Đã ẩn</span>
                    )}
                  </div>
                </div>
                {brand.description && (
                  <p className="text-sm text-on-surface-variant line-clamp-2">{brand.description}</p>
                )}
                <div className="flex items-center gap-2 mt-auto pt-2">
                  <button
                    onClick={() => openEditForm(brand)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-xs border-2 border-primary/40 text-primary hover:bg-primary/5 transition-all"
                  >
                    <Pencil size={14} />
                    Sửa
                  </button>
                  <button
                    onClick={() => handleToggleStatus(brand)}
                    disabled={actioningId === brand.id}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-xs border-2 transition-all disabled:opacity-50 ${
                      brand.status === 'active'
                        ? 'border-error/40 text-error hover:bg-error/5'
                        : 'border-primary/40 text-primary hover:bg-primary/5'
                    }`}
                  >
                    {brand.status === 'active' ? <Ban size={14} /> : <CheckCircle2 size={14} />}
                    {brand.status === 'active' ? 'Ẩn' : 'Bật lại'}
                  </button>
                </div>
              </motion.div>
            ))}
            {brands.length === 0 && (
              <div className="col-span-full py-16 text-center text-on-surface-variant">Chưa có thương hiệu nào.</div>
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
              <h2 className="text-lg font-black text-on-surface">
                {form.id ? 'Sửa thương hiệu' : 'Thêm thương hiệu mới'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-on-surface-variant hover:text-on-surface">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1">Tên thương hiệu *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/40 bg-surface text-on-surface text-sm"
                  placeholder="Panasonic, Philips, Sino..."
                  required
                />
              </div>
              <ImageUploadField
                label="Logo thương hiệu"
                value={form.logo_url}
                onChange={url => setForm(prev => ({ ...prev, logo_url: url }))}
              />
              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1">Mô tả</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/40 bg-surface text-on-surface text-sm"
                  rows={3}
                  placeholder="Chính sách bảo hành, nguồn gốc xuất xứ..."
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
