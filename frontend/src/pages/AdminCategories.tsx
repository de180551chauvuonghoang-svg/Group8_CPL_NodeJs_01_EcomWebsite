import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { FolderTree, Pencil, Plus, Trash2, X } from 'lucide-react';
import { adminService, AdminCategoryRow } from '../services/adminService';
import ImageUploadField from '../components/admin/ImageUploadField';

type FormState = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  parent_id: string;
  sort_order: string;
};

const EMPTY_FORM: FormState = {
  name: '',
  slug: '',
  description: '',
  image_url: '',
  parent_id: '',
  sort_order: '0'
};

const slugify = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

export default function AdminCategories() {
  const [categories, setCategories] = useState<AdminCategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const loadCategories = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminService.getCategories();
      setCategories(data);
    } catch (err: any) {
      setError(err?.message || 'Không tải được danh sách danh mục.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const categoryMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);

  const openCreateForm = () => {
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEditForm = (cat: AdminCategoryRow) => {
    setForm({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description || '',
      image_url: cat.image_url || '',
      parent_id: cat.parent_id || '',
      sort_order: String(cat.sort_order ?? 0)
    });
    setShowForm(true);
  };

  const handleNameChange = (name: string) => {
    setForm(prev => ({
      ...prev,
      name,
      slug: prev.id ? prev.slug : slugify(name)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.slug.trim()) {
      setError('Vui lòng nhập đầy đủ tên và slug.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        description: form.description.trim() || undefined,
        image_url: form.image_url.trim() || undefined,
        parent_id: form.parent_id || null,
        sort_order: Number(form.sort_order) || 0
      };
      if (form.id) {
        await adminService.updateCategory(form.id, payload);
      } else {
        await adminService.createCategory(payload);
      }
      setShowForm(false);
      await loadCategories();
    } catch (err: any) {
      setError(err?.message || 'Lưu danh mục thất bại.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat: AdminCategoryRow) => {
    if (!window.confirm(`Ẩn danh mục "${cat.name}"? Sản phẩm cũ vẫn giữ liên kết, chỉ ẩn khỏi trang mua hàng.`)) return;
    setActioningId(cat.id);
    try {
      await adminService.deleteCategory(cat.id);
      setCategories(prev => prev.map(c => (c.id === cat.id ? { ...c, is_active: false } : c)));
    } catch (err: any) {
      setError(err?.message || 'Xoá danh mục thất bại.');
    } finally {
      setActioningId(null);
    }
  };

  const handleRestore = async (cat: AdminCategoryRow) => {
    setActioningId(cat.id);
    try {
      await adminService.updateCategory(cat.id, { is_active: true });
      setCategories(prev => prev.map(c => (c.id === cat.id ? { ...c, is_active: true } : c)));
    } catch (err: any) {
      setError(err?.message || 'Khôi phục danh mục thất bại.');
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
              <FolderTree size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-on-surface">Danh Mục Sản Phẩm</h1>
              <p className="text-on-surface-variant text-sm">Tổ chức dữ liệu sản phẩm theo cây danh mục cha/con</p>
            </div>
          </div>
          <button
            onClick={openCreateForm}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary text-white font-bold text-sm hover:opacity-90 transition-all"
          >
            <Plus size={16} />
            Thêm danh mục
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
          <div className="bg-surface-container-lowest/80 backdrop-blur-xl rounded-3xl border border-outline-variant/30 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant/30 text-left text-on-surface-variant">
                  <th className="px-6 py-3 font-semibold">Tên</th>
                  <th className="px-6 py-3 font-semibold">Slug</th>
                  <th className="px-6 py-3 font-semibold">Danh mục cha</th>
                  <th className="px-6 py-3 font-semibold">Thứ tự</th>
                  <th className="px-6 py-3 font-semibold">Trạng thái</th>
                  <th className="px-6 py-3 font-semibold text-right">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {categories.map(cat => (
                  <motion.tr
                    key={cat.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b border-outline-variant/10 last:border-0"
                  >
                    <td className="px-6 py-4 font-semibold text-on-surface">{cat.name}</td>
                    <td className="px-6 py-4 text-on-surface-variant">{cat.slug}</td>
                    <td className="px-6 py-4 text-on-surface-variant">
                      {cat.parent_id ? categoryMap.get(cat.parent_id)?.name || '—' : '—'}
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant">{cat.sort_order}</td>
                    <td className="px-6 py-4">
                      {cat.is_active ? (
                        <span className="text-xs font-bold text-green-600">Hiển thị</span>
                      ) : (
                        <span className="text-xs font-bold text-error">Đã ẩn</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditForm(cat)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-xs border-2 border-primary/40 text-primary hover:bg-primary/5 transition-all"
                        >
                          <Pencil size={14} />
                          Sửa
                        </button>
                        {cat.is_active ? (
                          <button
                            onClick={() => handleDelete(cat)}
                            disabled={actioningId === cat.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-xs border-2 border-error/40 text-error hover:bg-error/5 disabled:opacity-50 transition-all"
                          >
                            <Trash2 size={14} />
                            Ẩn
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRestore(cat)}
                            disabled={actioningId === cat.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-xs border-2 border-primary/40 text-primary hover:bg-primary/5 disabled:opacity-50 transition-all"
                          >
                            Khôi phục
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            {categories.length === 0 && (
              <div className="py-16 text-center text-on-surface-variant">Chưa có danh mục nào.</div>
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
                {form.id ? 'Sửa danh mục' : 'Thêm danh mục mới'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-on-surface-variant hover:text-on-surface">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1">Tên danh mục *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => handleNameChange(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/40 bg-surface text-on-surface text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1">Slug *</label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={e => setForm(prev => ({ ...prev, slug: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/40 bg-surface text-on-surface text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1">Danh mục cha</label>
                <select
                  value={form.parent_id}
                  onChange={e => setForm(prev => ({ ...prev, parent_id: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/40 bg-surface text-on-surface text-sm"
                >
                  <option value="">— Không có (danh mục gốc) —</option>
                  {categories
                    .filter(c => c.id !== form.id)
                    .map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1">Thứ tự sắp xếp</label>
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={e => setForm(prev => ({ ...prev, sort_order: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/40 bg-surface text-on-surface text-sm"
                />
              </div>
              <ImageUploadField
                label="Ảnh danh mục"
                value={form.image_url}
                onChange={url => setForm(prev => ({ ...prev, image_url: url }))}
              />
              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1">Mô tả</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/40 bg-surface text-on-surface text-sm"
                  rows={3}
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
