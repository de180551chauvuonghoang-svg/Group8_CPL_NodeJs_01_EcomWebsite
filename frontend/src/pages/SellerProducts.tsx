import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  Archive,
  DollarSign,
  FileText,
  Image as ImageIcon,
  Loader2,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
  Warehouse,
  X,
  Zap,
} from 'lucide-react';
import DateTimePicker from '../components/common/DateTimePicker';
import ImageUploadField from '../components/common/ImageUploadField';
import InventoryAdjustModal, {
  type InventoryVariantTarget,
} from '../components/inventory/InventoryAdjustModal';
import StockThresholdEditor from '../components/inventory/StockThresholdEditor';
import SellerFilterBar from '../components/seller/SellerFilterBar';
import SellerPageHeader from '../components/seller/SellerPageHeader';
import SellerPagination from '../components/seller/SellerPagination';
import SellerStatePanel from '../components/seller/SellerStatePanel';
import { sellerService, type SellerProductPayload } from '../services/sellerService';
import type { Pagination, ProductImage, SellerFlashSale, SellerProduct } from '../types';
import { isNonNegativeInteger, isPositivePrice } from '../utils/sellerValidation';

type ProductForm = {
  name: string;
  price: string;
  description: string;
  stock: string;
  stockReason: string;
  sku: string;
  lowStockThreshold: string;
  categoryId: string;
  isActive: boolean;
  images: ProductImage[];
};

const EMPTY_PAGINATION: Pagination = { page: 1, limit: 12, total: 0, total_pages: 0 };

const EMPTY_FORM: ProductForm = {
  name: '',
  price: '',
  description: '',
  stock: '0',
  stockReason: '',
  sku: '',
  lowStockThreshold: '5',
  categoryId: '',
  isActive: true,
  images: [],
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'active', label: 'Đang bán' },
  { value: 'inactive', label: 'Đã ẩn' },
  { value: 'low_stock', label: 'Sắp hết hàng' },
  { value: 'out_of_stock', label: 'Hết hàng' },
];

const SORT_OPTIONS = [
  { value: 'created_at:desc', label: 'Mới cập nhật' },
  { value: 'name:asc', label: 'Tên A-Z' },
  { value: 'price:asc', label: 'Giá thấp đến cao' },
  { value: 'price:desc', label: 'Giá cao đến thấp' },
  { value: 'stock:asc', label: 'Tồn kho thấp trước' },
];

const getDefaultVariant = (product: SellerProduct) =>
  product.default_variant || product.variants?.[0] || null;

const normalizeProductImages = (product: SellerProduct): ProductImage[] => {
  if (product.images?.length) {
    return product.images.map((image, index) => ({
      url: image.url,
      publicId: image.publicId || null,
      isPrimary: image.isPrimary ?? index === 0,
      sortOrder: image.sortOrder ?? index,
    }));
  }
  return product.image_url ? [{ url: product.image_url, isPrimary: true, sortOrder: 0 }] : [];
};

const isSaleRunning = (sale: SellerFlashSale) => {
  const now = Date.now();
  return (
    sale.status === 'active' &&
    new Date(sale.starts_at).getTime() <= now &&
    new Date(sale.ends_at).getTime() >= now
  );
};

const isSaleUpcomingOrRunning = (sale: SellerFlashSale) =>
  sale.status === 'active' && new Date(sale.ends_at).getTime() >= Date.now();

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

const localDateTimeValue = (date: Date) => {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 16);
};

export default function SellerProducts() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const search = searchParams.get('search') || '';
  const categoryId = searchParams.get('categoryId') || 'all';
  const status =
    searchParams.get('status') ||
    (searchParams.get('filter') === 'low-stock' ? 'low_stock' : 'all');
  const sort = searchParams.get('sort') || 'created_at:desc';
  const [sortBy, sortOrder] = sort.split(':') as [string, 'asc' | 'desc'];

  const [searchDraft, setSearchDraft] = useState(search);
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [pagination, setPagination] = useState<Pagination>(EMPTY_PAGINATION);
  const [flashSales, setFlashSales] = useState<SellerFlashSale[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState<SellerProduct | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SellerProduct | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState<InventoryVariantTarget | null>(null);

  const [flashTarget, setFlashTarget] = useState<SellerProduct | null>(null);
  const [flashForm, setFlashForm] = useState({ salePrice: '', startsAt: '', endsAt: '' });
  const [flashSubmitting, setFlashSubmitting] = useState(false);
  const [stoppingSaleId, setStoppingSaleId] = useState<string | null>(null);

  const updateQuery = (updates: Record<string, string | number | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '' || value === 'all') next.delete(key);
      else next.set(key, String(value));
    });
    if (!('page' in updates)) next.set('page', '1');
    next.delete('filter');
    setSearchParams(next);
  };

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await sellerService.getProductsPage({
        page,
        limit: 12,
        search: search || undefined,
        categoryId: categoryId === 'all' ? undefined : categoryId,
        status,
        sortBy,
        sortOrder,
      });
      setProducts(result.products);
      setPagination(result.pagination);
    } catch (requestError: any) {
      setProducts([]);
      setPagination(EMPTY_PAGINATION);
      setError(requestError?.data?.message || requestError?.message || 'Không thể tải sản phẩm.');
    } finally {
      setLoading(false);
    }
  }, [categoryId, page, search, sortBy, sortOrder, status]);

  const loadFlashSales = useCallback(async () => {
    const data = await sellerService.getFlashSales().catch(() => []);
    setFlashSales(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    void loadFlashSales();
    sellerService
      .getCategories()
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setCategories([]));
  }, [loadFlashSales]);

  useEffect(() => setSearchDraft(search), [search]);

  const saleByProduct = useMemo(() => {
    const result = new Map<string, SellerFlashSale>();
    flashSales
      .filter(isSaleUpcomingOrRunning)
      .sort(
        (first, second) =>
          new Date(first.starts_at).getTime() - new Date(second.starts_at).getTime(),
      )
      .forEach((sale) => {
        if (!result.has(sale.product_id)) result.set(sale.product_id, sale);
      });
    return result;
  }, [flashSales]);

  const openCreate = () => {
    setEditProduct(null);
    setForm(EMPTY_FORM);
    setError('');
    setShowModal(true);
  };

  const openEdit = (product: SellerProduct) => {
    const variant = getDefaultVariant(product);
    setEditProduct(product);
    setForm({
      name: product.name,
      price: String(product.base_price),
      description: product.description || '',
      stock: String(variant?.stock_qty ?? product.stock_qty ?? 0),
      stockReason: '',
      sku: variant?.sku || '',
      lowStockThreshold: String(variant?.low_stock_threshold ?? 5),
      categoryId: product.category_id || '',
      isActive: product.is_active,
      images: normalizeProductImages(product),
    });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const sku = form.sku.trim().toUpperCase();
    const stock = Number(form.stock);
    const threshold = Number(form.lowStockThreshold);

    if (!form.name.trim() || !form.price || !form.categoryId || !sku) {
      setError('Tên sản phẩm, giá, danh mục và SKU là bắt buộc.');
      return;
    }
    if (!isPositivePrice(form.price)) {
      setError('Giá sản phẩm phải là số lớn hơn 0.');
      return;
    }
    if (!isNonNegativeInteger(form.stock)) {
      setError('Số lượng tồn kho phải là số nguyên không âm.');
      return;
    }
    if (!/^[A-Z0-9._-]{3,100}$/.test(sku)) {
      setError('SKU cần 3-100 ký tự, chỉ gồm chữ, số, dấu chấm, gạch dưới hoặc gạch ngang.');
      return;
    }
    if (!Number.isInteger(threshold) || threshold < 0 || threshold > 1_000_000) {
      setError('Ngưỡng cảnh báo phải là số nguyên từ 0 đến 1.000.000.');
      return;
    }
    if (!form.images.length) {
      setError('Vui lòng tải ít nhất một ảnh sản phẩm.');
      return;
    }

    const oldStock = editProduct ? (getDefaultVariant(editProduct)?.stock_qty ?? 0) : 0;
    const stockChanged = Boolean(editProduct) && stock !== oldStock;
    if (stockChanged && (form.stockReason.trim().length < 3 || form.stockReason.length > 255)) {
      setError('Lý do thay đổi tồn kho phải có từ 3 đến 255 ký tự.');
      return;
    }

    const payload: SellerProductPayload = {
      name: form.name.trim(),
      price: Number(form.price),
      categoryId: form.categoryId,
      description: form.description.trim(),
      sku,
      stock,
      lowStockThreshold: threshold,
      isActive: form.isActive,
      stockReason: stockChanged ? form.stockReason.trim() : undefined,
      images: form.images.map((image, index) => ({
        url: image.url,
        publicId: image.publicId || null,
        isPrimary: image.isPrimary ?? index === 0,
        sortOrder: index,
      })),
    };

    setSubmitting(true);
    setError('');
    try {
      if (editProduct) await sellerService.updateProduct(editProduct.id, payload);
      else await sellerService.createProduct(payload);
      setShowModal(false);
      await loadProducts();
    } catch (requestError: any) {
      setError(
        requestError?.data?.message ||
          requestError?.response?.data?.message ||
          requestError?.message ||
          'Không thể lưu sản phẩm.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const deleteProduct = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await sellerService.deleteProduct(deleteTarget.id);
      setDeleteTarget(null);
      await loadProducts();
    } catch (requestError: any) {
      setError(requestError?.data?.message || requestError?.message || 'Không thể xóa sản phẩm.');
    } finally {
      setDeleting(false);
    }
  };

  const openFlashSale = (product: SellerProduct) => {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    setFlashTarget(product);
    setFlashForm({
      salePrice: '',
      startsAt: localDateTimeValue(now),
      endsAt: localDateTimeValue(tomorrow),
    });
    setError('');
  };

  const createFlashSale = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!flashTarget) return;
    const originalPrice = Number(flashTarget.base_price);
    const salePrice = Number(flashForm.salePrice);

    if (!Number.isFinite(salePrice) || salePrice <= 0 || salePrice >= originalPrice) {
      setError('Giá sale phải lớn hơn 0 và nhỏ hơn giá gốc.');
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
        status: 'active',
      });
      setFlashTarget(null);
      await Promise.all([loadProducts(), loadFlashSales()]);
    } catch (requestError: any) {
      setError(requestError?.data?.message || requestError?.message || 'Không thể tạo flash sale.');
    } finally {
      setFlashSubmitting(false);
    }
  };

  const stopFlashSale = async (sale: SellerFlashSale) => {
    setStoppingSaleId(sale.id);
    try {
      await sellerService.deleteFlashSale(sale.id);
      await loadFlashSales();
    } catch (requestError: any) {
      setError(
        requestError?.data?.message || requestError?.message || 'Không thể ngừng flash sale.',
      );
    } finally {
      setStoppingSaleId(null);
    }
  };

  return (
    <div className="min-h-screen bg-surface p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl">
        <SellerPageHeader
          icon={Package}
          eyebrow="Danh mục bán"
          title="Quản lý sản phẩm"
          description={`${pagination.total.toLocaleString('vi-VN')} sản phẩm trong cửa hàng`}
          actions={
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-white shadow-sm transition hover:bg-primary/90"
            >
              <Plus size={18} />
              Thêm sản phẩm
            </button>
          }
        />

        <section className="overflow-hidden rounded-lg border border-outline-variant/40 bg-surface-container-lowest">
          <SellerFilterBar
            className="grid-cols-1 md:grid-cols-[minmax(220px,1fr)_180px_180px_180px]"
            onSubmit={(event) => {
              event.preventDefault();
              updateQuery({ search: searchDraft.trim() || null });
            }}
          >
            <label className="relative block">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
                size={17}
              />
              <input
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="Tìm tên sản phẩm hoặc SKU"
                className="h-11 w-full rounded-md border border-outline-variant bg-surface-container pl-10 pr-3 text-sm outline-none focus:border-primary"
              />
            </label>
            <select
              value={status}
              onChange={(event) => updateQuery({ status: event.target.value })}
              className="h-11 rounded-md border border-outline-variant bg-surface-container px-3 text-sm outline-none focus:border-primary"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={categoryId}
              onChange={(event) => updateQuery({ categoryId: event.target.value })}
              className="h-11 rounded-md border border-outline-variant bg-surface-container px-3 text-sm outline-none focus:border-primary"
            >
              <option value="all">Tất cả danh mục</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <select
              value={sort}
              onChange={(event) => updateQuery({ sort: event.target.value })}
              className="h-11 rounded-md border border-outline-variant bg-surface-container px-3 text-sm outline-none focus:border-primary"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </SellerFilterBar>

          {error && !showModal && !flashTarget && (
            <div className="flex items-center gap-2 border-b border-error/20 bg-error/5 px-5 py-3 text-sm font-semibold text-error">
              <AlertTriangle size={17} /> {error}
            </div>
          )}

          {loading ? (
            <SellerStatePanel state="loading" />
          ) : products.length === 0 ? (
            <SellerStatePanel
              state="empty"
              icon={Package}
              title="Không có sản phẩm phù hợp"
              description="Thử thay đổi bộ lọc hoặc thêm sản phẩm mới cho cửa hàng."
              actionLabel="Thêm sản phẩm"
              onAction={openCreate}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product, index) => {
                const variant = getDefaultVariant(product);
                const stock = variant?.stock_qty ?? product.stock_qty ?? 0;
                const threshold = variant?.low_stock_threshold ?? 5;
                const sale = saleByProduct.get(product.id);
                const running = sale ? isSaleRunning(sale) : false;
                const primaryImage =
                  product.images?.find((image) => image.isPrimary)?.url ||
                  product.images?.[0]?.url ||
                  product.image_url;

                return (
                  <motion.article
                    key={product.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.03, 0.18) }}
                    className="overflow-hidden rounded-lg border border-outline-variant/40 bg-surface"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-surface-container">
                      {primaryImage ? (
                        <img
                          src={primaryImage}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-on-surface-variant/40">
                          <ImageIcon size={34} />
                        </div>
                      )}
                      {sale && (
                        <span
                          className={`absolute left-3 top-3 rounded-md px-2 py-1 text-[10px] font-black uppercase text-white ${running ? 'bg-error' : 'bg-warning'}`}
                        >
                          {running ? 'Đang sale' : 'Sắp sale'}
                        </span>
                      )}
                      <span
                        className={`absolute right-3 top-3 rounded-md px-2 py-1 text-[10px] font-black ${product.is_active ? 'bg-success/90 text-white' : 'bg-slate-800/80 text-white'}`}
                      >
                        {product.is_active ? 'Đang bán' : 'Đã ẩn'}
                      </span>
                    </div>

                    <div className="p-4">
                      <p className="truncate text-xs font-semibold text-on-surface-variant">
                        {product.category_name || 'Chưa phân loại'} ·{' '}
                        {variant?.sku || 'Chưa có SKU'}
                      </p>
                      <h2 className="mt-1 line-clamp-2 min-h-10 text-sm font-black text-on-surface">
                        {product.name}
                      </h2>
                      <div className="mt-2 flex flex-wrap items-baseline gap-2">
                        <strong className={running ? 'text-error' : 'text-primary'}>
                          {formatCurrency(running ? Number(sale?.sale_price) : product.base_price)}
                        </strong>
                        {running && (
                          <span className="text-xs text-on-surface-variant line-through">
                            {formatCurrency(product.base_price)}
                          </span>
                        )}
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <div className="rounded-md bg-surface-container px-3 py-2">
                          <p className="text-[10px] font-bold uppercase text-on-surface-variant">
                            Tồn kho
                          </p>
                          <p
                            className={`mt-1 text-sm font-black ${stock === 0 ? 'text-error' : stock <= threshold ? 'text-warning' : 'text-on-surface'}`}
                          >
                            {stock} sản phẩm
                          </p>
                        </div>
                        <div className="rounded-md bg-surface-container px-3 py-2">
                          <p className="text-[10px] font-bold uppercase text-on-surface-variant">
                            Cảnh báo
                          </p>
                          <div className="mt-1">
                            {variant ? (
                              <StockThresholdEditor
                                productId={product.id}
                                variantId={variant.id}
                                value={threshold}
                                onUpdated={loadProducts}
                              />
                            ) : (
                              <span className="text-xs text-on-surface-variant">Chưa có</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2 border-t border-outline-variant/40 pt-3">
                        <IconButton
                          title="Sửa sản phẩm"
                          onClick={() => openEdit(product)}
                          icon={Pencil}
                        />
                        {variant && (
                          <IconButton
                            title="Điều chỉnh kho"
                            onClick={() =>
                              setAdjustTarget({
                                variantId: variant.id,
                                productId: product.id,
                                productName: product.name,
                                sku: variant.sku,
                                stockQty: stock,
                              })
                            }
                            icon={Warehouse}
                          />
                        )}
                        {sale ? (
                          <button
                            type="button"
                            disabled={stoppingSaleId === sale.id}
                            onClick={() => void stopFlashSale(sale)}
                            className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-md border border-warning/40 px-3 text-xs font-bold text-warning disabled:opacity-50"
                          >
                            {stoppingSaleId === sale.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Archive size={14} />
                            )}
                            Ngừng sale
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openFlashSale(product)}
                            className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-md bg-error px-3 text-xs font-bold text-white"
                          >
                            <Zap size={14} /> Flash sale
                          </button>
                        )}
                        <IconButton
                          title="Xóa sản phẩm"
                          onClick={() => setDeleteTarget(product)}
                          icon={Trash2}
                          danger
                        />
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          )}

          <SellerPagination
            page={pagination.page}
            totalPages={pagination.total_pages}
            total={pagination.total}
            label="sản phẩm"
            loading={loading}
            onPageChange={(nextPage) => updateQuery({ page: nextPage })}
          />
        </section>
      </div>

      <AnimatePresence>
        {showModal && (
          <ModalShell onClose={() => !submitting && setShowModal(false)} maxWidth="max-w-3xl">
            <header className="flex items-start justify-between gap-4 border-b border-outline-variant/40 px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase text-primary">Thông tin bán hàng</p>
                <h2 className="mt-1 text-xl font-black text-on-surface">
                  {editProduct ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-md p-2 hover:bg-surface-container"
                aria-label="Đóng"
              >
                <X size={20} />
              </button>
            </header>

            <form onSubmit={handleSubmit} className="max-h-[75vh] overflow-y-auto">
              <div className="grid gap-5 p-6 md:grid-cols-2">
                <div className="space-y-4">
                  <TextField
                    label="Tên sản phẩm *"
                    value={form.name}
                    onChange={(value) => setForm({ ...form, name: value })}
                    placeholder="Ví dụ: Chuột không dây"
                    icon={FileText}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <TextField
                      label="Giá bán *"
                      value={form.price}
                      onChange={(value) => setForm({ ...form, price: value })}
                      type="number"
                      min="1"
                      placeholder="100000"
                      icon={DollarSign}
                    />
                    <TextField
                      label="Tồn kho *"
                      value={form.stock}
                      onChange={(value) => setForm({ ...form, stock: value })}
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      icon={Warehouse}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <TextField
                      label="SKU *"
                      value={form.sku}
                      onChange={(value) => setForm({ ...form, sku: value.toUpperCase() })}
                      placeholder="MOUSE-001"
                      icon={Package}
                    />
                    <TextField
                      label="Ngưỡng cảnh báo"
                      value={form.lowStockThreshold}
                      onChange={(value) => setForm({ ...form, lowStockThreshold: value })}
                      type="number"
                      min="0"
                      step="1"
                      placeholder="5"
                      icon={AlertTriangle}
                    />
                  </div>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-bold">Danh mục *</span>
                    <select
                      value={form.categoryId}
                      onChange={(event) => setForm({ ...form, categoryId: event.target.value })}
                      className="h-11 w-full rounded-md border border-outline-variant bg-surface-container px-3 text-sm outline-none focus:border-primary"
                    >
                      <option value="">Chọn danh mục</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-bold">Mô tả</span>
                    <textarea
                      value={form.description}
                      onChange={(event) => setForm({ ...form, description: event.target.value })}
                      rows={4}
                      maxLength={5000}
                      className="w-full resize-y rounded-md border border-outline-variant bg-surface-container p-3 text-sm outline-none focus:border-primary"
                      placeholder="Mô tả đặc điểm, công dụng và thông tin sản phẩm"
                    />
                  </label>
                </div>

                <div className="space-y-4">
                  <ImageUploadField
                    label="Ảnh sản phẩm *"
                    purpose="product"
                    images={form.images}
                    onChange={(images) => setForm({ ...form, images })}
                    maxImages={8}
                    disabled={submitting}
                  />
                  {editProduct &&
                    Number(form.stock) !== (getDefaultVariant(editProduct)?.stock_qty ?? 0) && (
                      <TextField
                        label="Lý do thay đổi tồn kho *"
                        value={form.stockReason}
                        onChange={(value) => setForm({ ...form, stockReason: value })}
                        placeholder="Ví dụ: Kiểm kho thực tế"
                        icon={FileText}
                      />
                    )}
                  <label className="flex items-center justify-between gap-4 rounded-md border border-outline-variant bg-surface-container p-4">
                    <span>
                      <span className="block text-sm font-bold">Hiển thị sản phẩm</span>
                      <span className="text-xs text-on-surface-variant">
                        Khách hàng có thể tìm thấy sản phẩm này.
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
                      className="h-5 w-5 accent-primary"
                    />
                  </label>
                </div>
              </div>

              {error && (
                <p className="mx-6 mb-4 rounded-md bg-error/10 px-4 py-3 text-sm font-semibold text-error">
                  {error}
                </p>
              )}
              <footer className="sticky bottom-0 flex justify-end gap-3 border-t border-outline-variant/40 bg-surface-container-lowest px-6 py-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                  className="h-10 rounded-md border border-outline-variant px-4 text-sm font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-5 text-sm font-bold text-white disabled:opacity-50"
                >
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  {editProduct ? 'Lưu thay đổi' : 'Tạo sản phẩm'}
                </button>
              </footer>
            </form>
          </ModalShell>
        )}

        {flashTarget && (
          <ModalShell onClose={() => !flashSubmitting && setFlashTarget(null)} maxWidth="max-w-lg">
            <form onSubmit={createFlashSale}>
              <header className="flex items-start justify-between gap-4 border-b border-outline-variant/40 px-6 py-5">
                <div>
                  <p className="text-xs font-bold uppercase text-error">Flash sale</p>
                  <h2 className="mt-1 text-xl font-black">{flashTarget.name}</h2>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    Giá gốc: {formatCurrency(flashTarget.base_price)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFlashTarget(null)}
                  className="rounded-md p-2 hover:bg-surface-container"
                  aria-label="Đóng"
                >
                  <X size={20} />
                </button>
              </header>
              <div className="space-y-4 p-6">
                <TextField
                  label="Giá flash sale *"
                  value={flashForm.salePrice}
                  onChange={(value) => setFlashForm({ ...flashForm, salePrice: value })}
                  type="number"
                  min="1"
                  placeholder="Nhập giá ưu đãi"
                  icon={Zap}
                />
                <DateTimePicker
                  label="Bắt đầu"
                  value={flashForm.startsAt}
                  onChange={(startsAt) => setFlashForm({ ...flashForm, startsAt })}
                  min={localDateTimeValue(new Date())}
                />
                <DateTimePicker
                  label="Kết thúc"
                  value={flashForm.endsAt}
                  onChange={(endsAt) => setFlashForm({ ...flashForm, endsAt })}
                  min={flashForm.startsAt}
                />
                {error && (
                  <p className="rounded-md bg-error/10 px-4 py-3 text-sm font-semibold text-error">
                    {error}
                  </p>
                )}
              </div>
              <footer className="flex justify-end gap-3 border-t border-outline-variant/40 px-6 py-4">
                <button
                  type="button"
                  onClick={() => setFlashTarget(null)}
                  className="h-10 rounded-md border border-outline-variant px-4 text-sm font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={flashSubmitting}
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-error px-5 text-sm font-bold text-white disabled:opacity-50"
                >
                  {flashSubmitting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Zap size={16} />
                  )}
                  Tạo flash sale
                </button>
              </footer>
            </form>
          </ModalShell>
        )}

        {deleteTarget && (
          <ModalShell onClose={() => !deleting && setDeleteTarget(null)} maxWidth="max-w-md">
            <div className="p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-md bg-error/10 text-error">
                <Trash2 size={21} />
              </div>
              <h2 className="mt-4 text-xl font-black">Xóa sản phẩm?</h2>
              <p className="mt-2 text-sm text-on-surface-variant">
                Sản phẩm “{deleteTarget.name}” sẽ không còn hiển thị trong cửa hàng.
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="h-10 rounded-md border border-outline-variant px-4 text-sm font-bold"
                >
                  Giữ lại
                </button>
                <button
                  type="button"
                  onClick={() => void deleteProduct()}
                  disabled={deleting}
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-error px-4 text-sm font-bold text-white disabled:opacity-50"
                >
                  {deleting && <Loader2 size={15} className="animate-spin" />} Xóa sản phẩm
                </button>
              </div>
            </div>
          </ModalShell>
        )}
      </AnimatePresence>

      <InventoryAdjustModal
        variant={adjustTarget}
        onClose={() => setAdjustTarget(null)}
        onAdjusted={async () => {
          await loadProducts();
          setError('');
        }}
      />
    </div>
  );
}

function IconButton({
  title,
  icon: Icon,
  onClick,
  danger = false,
}: {
  title: string;
  icon: typeof Pencil;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`flex h-9 w-9 items-center justify-center rounded-md border transition ${danger ? 'border-error/30 text-error hover:bg-error/5' : 'border-outline-variant text-on-surface-variant hover:border-primary/40 hover:text-primary'}`}
    >
      <Icon size={15} />
    </button>
  );
}

function ModalShell({
  children,
  onClose,
  maxWidth,
}: {
  children: React.ReactNode;
  onClose: () => void;
  maxWidth: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 10 }}
        role="dialog"
        aria-modal="true"
        className={`w-full ${maxWidth} overflow-hidden rounded-lg border border-outline-variant/40 bg-surface-container-lowest shadow-2xl`}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

function TextField({
  label,
  value,
  onChange,
  icon: Icon,
  type = 'text',
  placeholder,
  min,
  step,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  icon: typeof FileText;
  type?: string;
  placeholder?: string;
  min?: string;
  step?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold">{label}</span>
      <span className="relative block">
        <Icon
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
        />
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          min={min}
          step={step}
          className="h-11 w-full rounded-md border border-outline-variant bg-surface-container pl-10 pr-3 text-sm outline-none focus:border-primary"
        />
      </span>
    </label>
  );
}
