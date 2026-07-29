import { AlertTriangle, X } from 'lucide-react';

interface SellerConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  busy?: boolean;
  tone?: 'danger' | 'warning';
  onCancel: () => void;
  onConfirm: () => void;
}

export default function SellerConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  busy = false,
  tone = 'danger',
  onCancel,
  onConfirm,
}: SellerConfirmDialogProps) {
  if (!open) return null;

  const confirmClass = tone === 'danger' ? 'bg-error text-white' : 'bg-warning text-white';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      role="presentation"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="seller-confirm-title"
        className="w-full max-w-md rounded-lg bg-surface-container-lowest p-5 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-error/10 text-error">
              <AlertTriangle size={19} />
            </div>
            <div>
              <h2 id="seller-confirm-title" className="font-black text-on-surface">
                {title}
              </h2>
              <p className="mt-1 text-sm leading-6 text-on-surface-variant">{description}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            aria-label="Đóng hộp xác nhận"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface"
          >
            <X size={18} />
          </button>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="h-10 rounded-md border border-outline-variant px-4 text-sm font-bold text-on-surface-variant transition hover:text-on-surface disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`h-10 rounded-md px-4 text-sm font-bold transition hover:brightness-105 disabled:opacity-50 ${confirmClass}`}
          >
            {busy ? 'Đang xử lý...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
