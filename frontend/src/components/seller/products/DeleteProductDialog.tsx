import { Loader2, Trash2 } from 'lucide-react';
import type { SellerProduct } from '../../../types';
import SellerModalShell from '../SellerModalShell';

interface DeleteProductDialogProps {
  product: SellerProduct;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteProductDialog({
  product,
  deleting,
  onClose,
  onConfirm,
}: DeleteProductDialogProps) {
  return (
    <SellerModalShell onClose={onClose} maxWidth="max-w-md">
      <div className="p-6">
        <div className="flex h-11 w-11 items-center justify-center rounded-md bg-error/10 text-error">
          <Trash2 size={21} />
        </div>
        <h2 className="mt-4 text-xl font-black">Xóa sản phẩm?</h2>
        <p className="mt-2 text-sm text-on-surface-variant">
          Sản phẩm “{product.name}” sẽ không còn hiển thị trong cửa hàng.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-md border border-outline-variant px-4 text-sm font-bold"
          >
            Giữ lại
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-error px-4 text-sm font-bold text-white disabled:opacity-50"
          >
            {deleting && <Loader2 size={15} className="animate-spin" />} Xóa sản phẩm
          </button>
        </div>
      </div>
    </SellerModalShell>
  );
}
