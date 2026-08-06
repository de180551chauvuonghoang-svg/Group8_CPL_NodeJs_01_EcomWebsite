import { useEffect, useState } from 'react';
import { Loader2, RotateCcw, X } from 'lucide-react';
import { returnService } from '../../services/returnService';
import type { CustomerOrderItem } from '../../types';

interface ReturnRequestModalProps {
  item: CustomerOrderItem | null;
  onClose: () => void;
  onSubmitted: () => Promise<void> | void;
}

const getErrorMessage = (error: unknown) => {
  const apiError = error as { message?: string; data?: { message?: string } };
  return apiError.data?.message || apiError.message || 'Không thể gửi yêu cầu trả hàng.';
};

export default function ReturnRequestModal({
  item,
  onClose,
  onSubmitted,
}: ReturnRequestModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setQuantity(1);
    setReason('');
    setError('');
  }, [item?.id]);

  if (!item) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanReason = reason.trim();
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > item.quantity) {
      setError(`Số lượng trả phải từ 1 đến ${item.quantity}.`);
      return;
    }
    if (cleanReason.length < 10 || cleanReason.length > 1000) {
      setError('Lý do trả hàng phải có từ 10 đến 1.000 ký tự.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await returnService.create(item.id, quantity, cleanReason);
      await onSubmitted();
      onClose();
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-5">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="return-request-title"
        className="w-full max-w-lg rounded-t-lg bg-surface-container-lowest shadow-2xl sm:rounded-lg"
      >
        <header className="flex items-start justify-between gap-4 border-b border-outline-variant/40 px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <RotateCcw size={19} />
            </span>
            <div>
              <h2 id="return-request-title" className="font-black text-on-surface">
                Yêu cầu trả hàng
              </h2>
              <p className="mt-1 line-clamp-2 text-sm text-on-surface-variant">
                {item.product_name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="grid h-9 w-9 place-items-center rounded-md text-on-surface-variant transition hover:bg-surface-container"
          >
            <X size={18} />
          </button>
        </header>

        <form onSubmit={submit} className="space-y-5 px-5 py-5">
          <div>
            <label htmlFor="return-quantity" className="mb-1.5 block text-sm font-bold">
              Số lượng trả
            </label>
            <input
              id="return-quantity"
              type="number"
              min={1}
              max={item.quantity}
              step={1}
              value={quantity}
              onChange={(event) => setQuantity(Number(event.target.value))}
              className="h-11 w-full rounded-md border border-outline-variant bg-surface-container px-3 text-sm font-semibold outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
            <p className="mt-1 text-xs text-on-surface-variant">Đã mua: {item.quantity} sản phẩm</p>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <label htmlFor="return-reason" className="text-sm font-bold">
                Lý do trả hàng
              </label>
              <span className="text-xs tabular-nums text-on-surface-variant">
                {reason.length}/1000
              </span>
            </div>
            <textarea
              id="return-reason"
              rows={5}
              maxLength={1000}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Mô tả rõ tình trạng sản phẩm và lý do cần trả hàng..."
              className="w-full resize-none rounded-md border border-outline-variant bg-surface-container px-3 py-3 text-sm leading-6 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-md bg-error/10 px-3 py-2.5 text-sm font-semibold text-error"
            >
              {error}
            </p>
          )}

          <footer className="flex justify-end gap-2 border-t border-outline-variant/40 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="h-10 rounded-md border border-outline-variant px-4 text-sm font-bold transition hover:border-primary/40 hover:text-primary disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              Gửi yêu cầu
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
