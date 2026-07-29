import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  Archive,
  DollarSign,
  FileText,
  Image,
  Loader2,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
  Zap
} from 'lucide-react';
import { sellerService } from '../services/sellerService';
import { SellerFlashSale, SellerProduct } from '../types';

type FormData = {
  name: string;
  price: string;
  description: string;
  image: string;
  stock: string;
  categoryId: string;
  brandId: string;
  isActive: boolean;
};

const defaultForm: FormData = {
  name: '',
  price: '',
  description: '',
  image: '',
  stock: '',
  categoryId: '',
  brandId: '',
  isActive: true
};

const isSaleRunning = (sale: SellerFlashSale) => {
  const now = Date.now();
  return sale.status === 'active'
    && new Date(sale.starts_at).getTime() <= now
    && new Date(sale.ends_at).getTime() >= now;
};

const isSaleUpcomingOrRunning = (sale: SellerFlashSale) => {
  return sale.status === 'active' && new Date(sale.ends_at).getTime() >= Date.now();
};

export default function SellerProducts() {
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [flashSales, setFlashSales] = useState<SellerFlashSale[]>([]);
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState<SellerProduct | null>(null);
  const [form, setForm] = useState<FormData>(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SellerProduct | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);
  const [flashTarget, setFlashTarget] = useState<SellerProduct | null>(null);
  const [flashForm, setFlashForm] = useState({ salePrice: '', startsAt: '', endsAt: '' });
  const [flashSubmitting, setFlashSubmitting] = useState(false);
  const [stoppingSaleId, setStoppingSaleId] = useState<string | null>(null);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const [productData, saleData] = await Promise.all([
        sellerService.getProducts(),
        sellerService.getFlashSales().catch(() => []),
      ]);
      setProducts(Array.isArray(productData) ? productData : []);
      setFlashSales(Array.isArray(saleData) ? saleData : []);
    } catch {
      setProducts([]);
      setFlashSales([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
    sellerService.getCategories()
      .then(data => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setCategories([]));
    sellerService.getBrands()
      .then(data => setBrands(Array.isArray(data) ? data : []))
      .catch(() => setBrands([]));
  }, []);

  const saleByProduct = useMemo(() => {
    const map = new Map<string, SellerFlashSale>();
    flashSales
      .filter(isSaleUpcomingOrRunning)
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
      .forEach(sale => {
        if (!map.has(sale.product_id)) map.set(sale.product_id, sale);
      });
    return map;
  }, [flashSales]);

  const filtered = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = searchParams.get('filter') === 'low-stock'
      ? (product.stock_qty ?? 0) > 0 && (product.stock_qty ?? 0) <= 5
      : true;
    return matchesSearch && matchesFilter;
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

  const openCreate = () => {
    setEditProduct(null);
    setForm(defaultForm);
    setError('');
    setShowModal(true);
  };

  const openEdit = (product: SellerProduct) => {
    setEditProduct(product);
    setForm({
      name: product.name,
      price: String(product.base_price),
      description: product.description || '',
      image: product.image_url || '',
      stock: product.stock_qty != null ? String(product.stock_qty) : '',
      categoryId: product.category_id || '',
      brandId: product.brand_id || '',
      isActive: product.is_active
    });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.price || !form.categoryId) {
      setError('Tên sản phẩm, giá và danh mục là bắt buộc.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const payload = {
        name: form.name.trim(),
        price: Number(form.price),
        description: form.description,
        image: form.image || undefined,
        stock: form.stock ? Number(form.stock) : editProduct ? undefined : 0,
        categoryId: form.categoryId,
        brandId: form.brandId,
        isActive: form.isActive
      };

      if (editProduct) {
        await sellerService.updateProduct(editProduct.id, payload);
      } else {
        await sellerService.createProduct(payload);
      }
      setShowModal(false);
      loadProducts();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Có lỗi xảy ra.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError('');
    try {
      await sellerService.deleteProduct(deleteTarget.id);
      setDeleteTarget(null);
      loadProducts();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Xóa thất bại.');
    } finally {
      setDeleting(false);
    }
  };

  const openFlashSale = (product: SellerProduct) => {
    const now = new Date();
    const start = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    const endDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const end = new Date(endDate.getTime() - endDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setFlashTarget(product);
    setFlashForm({ salePrice: '', startsAt: start, endsAt: end });
    setError('');
  };

  const createFlashSale = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!flashTarget) return;

    const originalPrice = Number(flashTarget.base_price);
    const salePrice = Number(flashForm.salePrice);

    if (!salePrice || salePrice <= 0) {
      setError('Giá sale phải lớn hơn 0.');
      return;
    }
    if (salePrice >= originalPrice) {
      setError('Giá sale phải nhỏ hơn giá gốc.');
      return;
    }
    if (!flashForm.startsAt || !flashForm.endsAt) {
      setError('Vui lòng chọn thời gian bắt đầu và kết thúc.');
      return;
    }
    if (new Date(flashForm.startsAt) >= new Date(flashForm.endsAt)) {
      setError('Thời gian kết thúc phải sau thời gian bắt đầu.');
      return;
    }

    setFlashSubmitting(true);
    setError('');
    try {
      await sellerService.createFlashSale({
        productId: flashTarget.id,
        variantId: null,
        originalPrice,
        salePrice,
        startsAt: new Date(flashForm.startsAt).toISOString(),
        endsAt: new Date(flashForm.endsAt).toISOString(),
        status: 'active'
      });
      setFlashTarget(null);
      loadProducts();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Không tạo được flash sale.');
    } finally {
      setFlashSubmitting(false);
    }
  };

  const stopFlashSale = async (sale: SellerFlashSale) => {
    setStoppingSaleId(sale.id);
    try {
      await sellerService.deleteFlashSale(sale.id);
      setFlashSales(prev => prev.map(item => item.id === sale.id ? { ...item, status: 'inactive' } : item));
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Không ngừng được flash sale.');
    } finally {
      setStoppingSaleId(null);
    }
  };

  return (
    <div className="min-h-screen bg-surface p-6 lg:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-on-surface">Quản lý sản phẩm</h1>
            <p className="mt-1 text-sm text-on-surface-variant">{products.length} sản phẩm trong cửa hàng</p>
          </div>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={openCreate} className="flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white shadow-lg shadow-primary/25">
            <Plus size={18} />
            Thêm sản phẩm
          </motion.button>
        </div>

        <div className="relative mb-6">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            type="text"
            placeholder="Tìm kiếm sản phẩm..."
            value={search}
            onChange={event => setSearch(event.target.value)}
            className="w-full rounded-2xl border-2 border-outline-variant/50 bg-surface-container py-3.5 pl-11 pr-5 text-sm text-on-surface outline-none transition focus:border-primary/50"
          />
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 size={32} className="animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-outline-variant bg-surface-container-lowest/50 py-20 text-center">
            <Package size={48} className="mx-auto mb-4 text-on-surface-variant/30" />
            <h3 className="font-bold text-on-surface">Chưa có sản phẩm nào</h3>
            <p className="mt-1 text-sm text-on-surface-variant">Nhấn "Thêm sản phẩm" để bắt đầu</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((product, index) => {
              const sale = saleByProduct.get(product.id);
              const running = sale ? isSaleRunning(sale) : false;
              const stock = product.stock_qty ?? 0;
              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className="group overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-lowest/80 backdrop-blur-xl transition hover:border-primary/30 hover:shadow-lg"
                >
                  <div className="relative h-40 overflow-hidden bg-surface-container">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Image size={32} className="text-on-surface-variant/30" />
                      </div>
                    )}
                    {sale && (
                      <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-black uppercase text-white ${running ? 'bg-error' : 'bg-warning'}`}>
                        {running ? 'Đang sale' : 'Sắp sale'}
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="mb-1 line-clamp-2 text-sm font-bold leading-tight text-on-surface">{product.name}</h3>
                    <div className="flex flex-wrap items-end gap-2">
                      {sale && running ? (
                        <>
                          <p className="text-lg font-black text-error">{formatCurrency(Number(sale.sale_price))}</p>
                          <p className="pb-0.5 text-xs font-semibold text-on-surface-variant line-through">{formatCurrency(product.base_price)}</p>
                        </>
                      ) : (
                        <p className="text-lg font-black text-primary">{formatCurrency(product.base_price)}</p>
                      )}
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="rounded-xl bg-surface-container px-3 py-2">
                        <p className="text-[10px] font-bold uppercase text-on-surface-variant">Tồn kho</p>
                        <p className={`mt-0.5 text-sm font-black ${stock <= 5 ? 'text-warning' : 'text-on-surface'}`}>{stock} SP</p>
                      </div>
                      <div className="rounded-xl bg-surface-container px-3 py-2">
                        <p className="text-[10px] font-bold uppercase text-on-surface-variant">Trạng thái</p>
                        <p className={`mt-0.5 text-sm font-black ${product.is_active ? 'text-success' : 'text-on-surface-variant'}`}>{product.is_active ? 'Đang bán' : 'Đã ẩn'}</p>
                      </div>
                    </div>

                    {sale && (
                      <p className="mt-2 text-xs font-semibold text-on-surface-variant">
                        Sale đến {new Date(sale.ends_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                      </p>
                    )}

                    <div className="mt-3 flex gap-2">
                      {sale ? (
                        <motion.button whileTap={{ scale: 0.95 }} onClick={() => stopFlashSale(sale)} disabled={stoppingSaleId === sale.id} className="flex items-center justify-center gap-1.5 rounded-xl border border-error/20 bg-error/10 px-3 py-2 text-xs font-semibold text-error transition hover:bg-error/20 disabled:opacity-60">
                          {stoppingSaleId === sale.id ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
                          Ngừng sale
                        </motion.button>
                      ) : (
                        <motion.button whileTap={{ scale: 0.95 }} onClick={() => openFlashSale(product)} className="flex items-center justify-center gap-1.5 rounded-xl border border-warning/20 bg-warning/10 px-3 py-2 text-xs font-semibold text-warning transition hover:bg-warning/20">
                          <Zap size={13} />
                          Sale
                        </motion.button>
                      )}
                      <motion.button whileTap={{ scale: 0.95 }} onClick={() => openEdit(product)} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-outline-variant bg-surface-container py-2 text-xs font-semibold text-on-surface transition hover:border-primary/30 hover:bg-primary/10 hover:text-primary">
                        <Pencil size={13} />
                        Sửa
                      </motion.button>
                      <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setDeleteTarget(product); setError(''); }} className="flex items-center justify-center rounded-xl border border-error/20 bg-error/10 px-3 py-2 text-xs font-semibold text-error transition hover:bg-error/20">
                        <Trash2 size={13} />
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={event => { if (event.target === event.currentTarget) setShowModal(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-6 shadow-2xl">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-black text-on-surface">{editProduct ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}</h2>
                <button onClick={() => setShowModal(false)} className="rounded-xl p-2 transition hover:bg-surface-container">
                  <X size={20} className="text-on-surface-variant" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {[
                  { id: 'name', icon: FileText, label: 'Tên sản phẩm *', type: 'text', placeholder: 'VD: Chuột gaming' },
                  { id: 'price', icon: DollarSign, label: 'Giá (VND) *', type: 'number', placeholder: 'VD: 4500000' },
                  { id: 'stock', icon: Archive, label: 'Số lượng tồn kho', type: 'number', placeholder: 'VD: 50' },
                  { id: 'image', icon: Image, label: 'Link ảnh sản phẩm', type: 'url', placeholder: 'https://...' }
                ].map(({ id, icon: Icon, label, type, placeholder }) => (
                  <div key={id} className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-sm font-semibold text-on-surface">
                      <Icon size={14} className="text-primary" />
                      {label}
                    </label>
                    <input type={type} value={form[id as keyof FormData] as string} onChange={event => setForm(previous => ({ ...previous, [id]: event.target.value }))} placeholder={placeholder} disabled={submitting} className="w-full rounded-xl border-2 border-outline-variant/50 bg-surface-container px-4 py-3 text-sm text-on-surface outline-none transition focus:border-primary/50" />
                  </div>
                ))}

                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-sm font-semibold text-on-surface">
                    <Package size={14} className="text-primary" />
                    Danh mục *
                  </label>
                  <select value={form.categoryId} onChange={event => setForm(previous => ({ ...previous, categoryId: event.target.value }))} disabled={submitting} className="w-full rounded-xl border-2 border-outline-variant/50 bg-surface-container px-4 py-3 text-sm text-on-surface outline-none transition focus:border-primary/50">
                    <option value="">Chọn danh mục</option>
                    {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-sm font-semibold text-on-surface">
                    <Package size={14} className="text-primary" />
                    Thương hiệu
                    <span className="text-on-surface-variant text-xs font-normal">(tuỳ chọn)</span>
                  </label>
                  <select value={form.brandId} onChange={event => setForm(previous => ({ ...previous, brandId: event.target.value }))} disabled={submitting} className="w-full rounded-xl border-2 border-outline-variant/50 bg-surface-container px-4 py-3 text-sm text-on-surface outline-none transition focus:border-primary/50">
                    <option value="">Không gắn thương hiệu</option>
                    {brands.map(brand => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
                  </select>
                </div>

                <label className="flex items-center justify-between rounded-xl bg-surface-container px-4 py-3 text-sm font-semibold text-on-surface">
                  <span>Hiển thị sản phẩm</span>
                  <input type="checkbox" checked={form.isActive} onChange={event => setForm(previous => ({ ...previous, isActive: event.target.checked }))} disabled={submitting} className="h-4 w-4 accent-primary" />
                </label>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-on-surface">Mô tả</label>
                  <textarea value={form.description} onChange={event => setForm(previous => ({ ...previous, description: event.target.value }))} placeholder="Mô tả chi tiết sản phẩm..." disabled={submitting} rows={3} className="w-full resize-none rounded-xl border-2 border-outline-variant/50 bg-surface-container px-4 py-3 text-sm text-on-surface outline-none transition focus:border-primary/50" />
                </div>

                {error && <p className="flex items-center gap-2 rounded-xl border border-error/20 bg-error/10 px-3 py-2 text-sm text-error"><AlertTriangle size={14} />{error}</p>}

                <motion.button type="submit" disabled={submitting} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 font-bold text-white shadow-lg disabled:opacity-60">
                  {submitting ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                  {editProduct ? 'Lưu thay đổi' : 'Tạo sản phẩm'}
                </motion.button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {flashTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={event => { if (event.target === event.currentTarget) setFlashTarget(null); }}>
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="w-full max-w-md rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-6 shadow-2xl">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-on-surface">Tạo flash sale</h2>
                  <p className="mt-1 line-clamp-1 text-sm text-on-surface-variant">{flashTarget.name}</p>
                </div>
                <button onClick={() => setFlashTarget(null)} className="rounded-xl p-2 transition hover:bg-surface-container">
                  <X size={20} className="text-on-surface-variant" />
                </button>
              </div>

              <form onSubmit={createFlashSale} className="space-y-4">
                <div className="rounded-2xl border border-outline-variant/50 bg-surface-container p-4">
                  <p className="text-xs font-semibold uppercase text-on-surface-variant">Giá gốc</p>
                  <p className="mt-1 text-xl font-black text-on-surface">{formatCurrency(flashTarget.base_price)}</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-on-surface">Giá sale *</label>
                  <input type="number" min="1" value={flashForm.salePrice} onChange={event => setFlashForm(previous => ({ ...previous, salePrice: event.target.value }))} placeholder="VD: 990000" disabled={flashSubmitting} className="w-full rounded-xl border-2 border-outline-variant/50 bg-surface-container px-4 py-3 text-sm text-on-surface outline-none transition focus:border-primary/50" />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-on-surface">Bắt đầu *</label>
                    <input type="datetime-local" value={flashForm.startsAt} onChange={event => setFlashForm(previous => ({ ...previous, startsAt: event.target.value }))} disabled={flashSubmitting} className="w-full rounded-xl border-2 border-outline-variant/50 bg-surface-container px-4 py-3 text-sm text-on-surface outline-none transition focus:border-primary/50" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-on-surface">Kết thúc *</label>
                    <input type="datetime-local" value={flashForm.endsAt} onChange={event => setFlashForm(previous => ({ ...previous, endsAt: event.target.value }))} disabled={flashSubmitting} className="w-full rounded-xl border-2 border-outline-variant/50 bg-surface-container px-4 py-3 text-sm text-on-surface outline-none transition focus:border-primary/50" />
                  </div>
                </div>
                {error && <p className="flex items-center gap-2 rounded-xl border border-error/20 bg-error/10 px-3 py-2 text-sm text-error"><AlertTriangle size={14} />{error}</p>}
                <div className="flex gap-3">
                  <button type="button" onClick={() => setFlashTarget(null)} disabled={flashSubmitting} className="flex-1 rounded-2xl border-2 border-outline-variant py-3 text-sm font-semibold text-on-surface-variant transition hover:bg-surface-container">Hủy</button>
                  <motion.button type="submit" disabled={flashSubmitting} whileTap={{ scale: 0.95 }} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-warning py-3 text-sm font-bold text-white shadow-lg disabled:opacity-60">
                    {flashSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                    Tạo sale
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="w-full max-w-sm rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-6 text-center shadow-2xl">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-error/10">
                <Trash2 size={24} className="text-error" />
              </div>
              <h3 className="mb-2 text-lg font-black text-on-surface">Xác nhận xóa?</h3>
              <p className="mb-6 text-sm text-on-surface-variant">Bạn sắp xóa <span className="font-bold text-on-surface">"{deleteTarget.name}"</span>. Hành động này không thể hoàn tác.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteTarget(null)} disabled={deleting} className="flex-1 rounded-2xl border-2 border-outline-variant py-3 text-sm font-semibold text-on-surface-variant transition hover:bg-surface-container">Hủy</button>
                <motion.button whileTap={{ scale: 0.95 }} onClick={handleDelete} disabled={deleting} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-error py-3 text-sm font-bold text-white shadow-lg disabled:opacity-60">
                  {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  Xóa
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
