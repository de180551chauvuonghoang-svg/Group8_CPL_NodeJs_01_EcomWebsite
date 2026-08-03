import { AlertTriangle, DollarSign, FileText, Loader2, Package, Warehouse, X } from 'lucide-react';
import type { FormEventHandler } from 'react';
import type { ProductImage, SellerProduct } from '../../../types';
import ImageUploadField from '../../common/ImageUploadField';
import SellerModalShell from '../SellerModalShell';
import SellerTextField from '../SellerTextField';

export interface ProductFormValues {
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
}

interface ProductFormDialogProps {
  editProduct: SellerProduct | null;
  form: ProductFormValues;
  categories: Array<{ id: string; name: string }>;
  originalStock: number;
  submitting: boolean;
  error: string;
  onFormChange: (form: ProductFormValues) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onClose: () => void;
}

export default function ProductFormDialog({
  editProduct,
  form,
  categories,
  originalStock,
  submitting,
  error,
  onFormChange,
  onSubmit,
  onClose,
}: ProductFormDialogProps) {
  return (
    <SellerModalShell onClose={onClose} maxWidth="max-w-3xl">
      <header className="flex items-start justify-between gap-4 border-b border-outline-variant/40 px-6 py-5">
        <div>
          <p className="text-xs font-bold uppercase text-primary">Thông tin bán hàng</p>
          <h2 className="mt-1 text-xl font-black text-on-surface">
            {editProduct ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-2 hover:bg-surface-container"
          aria-label="Đóng"
        >
          <X size={20} />
        </button>
      </header>

      <form onSubmit={onSubmit} className="max-h-[75vh] overflow-y-auto">
        <div className="grid gap-5 p-6 md:grid-cols-2">
          <div className="space-y-4">
            <SellerTextField
              label="Tên sản phẩm *"
              value={form.name}
              onChange={(name) => onFormChange({ ...form, name })}
              placeholder="Ví dụ: Chuột không dây"
              icon={FileText}
            />
            <div className="grid grid-cols-2 gap-3">
              <SellerTextField
                label="Giá bán *"
                value={form.price}
                onChange={(price) => onFormChange({ ...form, price })}
                type="number"
                min="1"
                placeholder="100000"
                icon={DollarSign}
              />
              <SellerTextField
                label="Tồn kho *"
                value={form.stock}
                onChange={(stock) => onFormChange({ ...form, stock })}
                type="number"
                min="0"
                step="1"
                placeholder="0"
                icon={Warehouse}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <SellerTextField
                label="SKU *"
                value={form.sku}
                onChange={(sku) => onFormChange({ ...form, sku: sku.toUpperCase() })}
                placeholder="MOUSE-001"
                icon={Package}
              />
              <SellerTextField
                label="Ngưỡng cảnh báo"
                value={form.lowStockThreshold}
                onChange={(lowStockThreshold) => onFormChange({ ...form, lowStockThreshold })}
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
                onChange={(event) => onFormChange({ ...form, categoryId: event.target.value })}
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
                onChange={(event) => onFormChange({ ...form, description: event.target.value })}
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
              onChange={(images) => onFormChange({ ...form, images })}
              maxImages={8}
              disabled={submitting}
            />
            {editProduct && Number(form.stock) !== originalStock && (
              <SellerTextField
                label="Lý do thay đổi tồn kho *"
                value={form.stockReason}
                onChange={(stockReason) => onFormChange({ ...form, stockReason })}
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
                onChange={(event) => onFormChange({ ...form, isActive: event.target.checked })}
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
            onClick={onClose}
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
    </SellerModalShell>
  );
}
