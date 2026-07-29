import { FormEvent, useEffect, useState } from 'react';
import { AlertTriangle, ArchiveRestore, Loader2, SlidersHorizontal, X } from 'lucide-react';
import { inventoryService } from '../../services/inventoryService';
import { InventoryAdjustmentResult, SellerInventoryAdjustmentType } from '../../types';
import { getInventoryErrorMessage } from '../../utils/inventoryErrors';

export interface InventoryVariantTarget {
  variantId: string;
  productId: string;
  productName: string;
  sku: string;
  stockQty: number;
}

interface InventoryAdjustModalProps {
  variant: InventoryVariantTarget | null;
  onClose: () => void;
  onAdjusted: (result: InventoryAdjustmentResult) => void | Promise<void>;
}

export default function InventoryAdjustModal({
  variant,
  onClose,
  onAdjusted,
}: InventoryAdjustModalProps) {
  const [type, setType] = useState<SellerInventoryAdjustmentType>('restock');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!variant) return;
    setType('restock');
    setQuantity('');
    setReason('');
    setError('');
  }, [variant]);

  if (!variant) return null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const changeQuantity = Number(quantity);
    const cleanReason = reason.trim();

    if (!Number.isInteger(changeQuantity) || changeQuantity === 0) {
      setError('Số lượng điều chỉnh phải là số nguyên khác 0.');
      return;
    }
    if (type === 'restock' && changeQuantity < 1) {
      setError('Số lượng nhập kho phải lớn hơn 0.');
      return;
    }
    if (variant.stockQty + changeQuantity < 0) {
      setError('Số lượng mới không thể nhỏ hơn 0.');
      return;
    }
    if (cleanReason.length < 3 || cleanReason.length > 255) {
      setError('Lý do phải có từ 3 đến 255 ký tự.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const result = await inventoryService.adjust({
        variantId: variant.variantId,
        changeQuantity,
        type,
        reason: cleanReason,
      });
      await onAdjusted(result);
      onClose();
    } catch (requestError) {
      setError(getInventoryErrorMessage(requestError, 'Không thể điều chỉnh tồn kho.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="inventory-adjust-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md overflow-hidden rounded-lg border border-outline-variant/40 bg-surface-container-lowest shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-outline-variant/40 px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase text-primary">Điều chỉnh kho</p>
            <h2 id="inventory-adjust-title" className="mt-1 text-xl font-black text-on-surface">
              {variant.productName}
            </h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              SKU {variant.sku || 'Mặc định'} · Hiện có {variant.stockQty}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface disabled:opacity-50"
            aria-label="Đóng"
          >
            <X size={19} />
          </button>
        </header>

        <div className="space-y-5 px-6 py-5">
          <div>
            <p className="mb-2 text-sm font-bold text-on-surface">Loại điều chỉnh</p>
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-surface-container p-1">
              {(
                [
                  ['restock', ArchiveRestore, 'Nhập kho'],
                  ['manual_adjustment', SlidersHorizontal, 'Thủ công'],
                ] as const
              ).map(([value, Icon, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setType(value);
                    setQuantity('');
                    setError('');
                  }}
                  className={`flex items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-bold transition ${
                    type === value
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-on-surface">
              {type === 'restock' ? 'Số lượng nhập thêm' : 'Số lượng thay đổi'}
            </span>
            <input
              type="number"
              step="1"
              min={type === 'restock' ? 1 : undefined}
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              placeholder={type === 'restock' ? 'Ví dụ: 20' : 'Ví dụ: -3 hoặc 10'}
              disabled={submitting}
              className="w-full rounded-lg border border-outline-variant bg-surface-container px-4 py-3 text-sm text-on-surface outline-none transition focus:border-primary"
            />
            {type === 'manual_adjustment' && (
              <span className="mt-1.5 block text-xs text-on-surface-variant">
                Dùng số âm để giảm và số dương để tăng tồn kho.
              </span>
            )}
          </label>

          <label className="block">
            <span className="mb-2 flex items-center justify-between text-sm font-bold text-on-surface">
              Lý do
              <span className="text-xs font-medium text-on-surface-variant">
                {reason.length}/255
              </span>
            </span>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              maxLength={255}
              placeholder="Ví dụ: Nhập thêm hàng từ nhà cung cấp"
              disabled={submitting}
              className="w-full resize-none rounded-lg border border-outline-variant bg-surface-container px-4 py-3 text-sm text-on-surface outline-none transition focus:border-primary"
            />
          </label>

          {error && (
            <p className="flex items-start gap-2 rounded-lg border border-error/20 bg-error/10 px-3 py-2.5 text-sm text-error">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              {error}
            </p>
          )}
        </div>

        <footer className="flex justify-end gap-3 border-t border-outline-variant/40 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md border border-outline-variant px-4 py-2.5 text-sm font-bold text-on-surface transition hover:bg-surface-container disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex min-w-32 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-95 disabled:opacity-60"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            Xác nhận
          </button>
        </footer>
      </form>
    </div>
  );
}
