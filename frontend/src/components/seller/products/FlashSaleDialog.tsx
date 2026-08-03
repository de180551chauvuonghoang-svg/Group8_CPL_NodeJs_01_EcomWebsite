import { Loader2, X, Zap } from 'lucide-react';
import type { FormEventHandler } from 'react';
import type { SellerProduct } from '../../../types';
import DateTimePicker from '../../common/DateTimePicker';
import SellerModalShell from '../SellerModalShell';
import SellerTextField from '../SellerTextField';

export interface FlashSaleFormValues {
  salePrice: string;
  startsAt: string;
  endsAt: string;
}

interface FlashSaleDialogProps {
  product: SellerProduct;
  form: FlashSaleFormValues;
  submitting: boolean;
  error: string;
  minStart: string;
  onFormChange: (form: FlashSaleFormValues) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onClose: () => void;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

export default function FlashSaleDialog({
  product,
  form,
  submitting,
  error,
  minStart,
  onFormChange,
  onSubmit,
  onClose,
}: FlashSaleDialogProps) {
  return (
    <SellerModalShell onClose={onClose} maxWidth="max-w-lg">
      <form onSubmit={onSubmit}>
        <header className="flex items-start justify-between gap-4 border-b border-outline-variant/40 px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase text-error">Flash sale</p>
            <h2 className="mt-1 text-xl font-black">{product.name}</h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              Giá gốc: {formatCurrency(product.base_price)}
            </p>
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
        <div className="space-y-4 p-6">
          <SellerTextField
            label="Giá flash sale *"
            value={form.salePrice}
            onChange={(salePrice) => onFormChange({ ...form, salePrice })}
            type="number"
            min="1"
            placeholder="Nhập giá ưu đãi"
            icon={Zap}
          />
          <DateTimePicker
            label="Bắt đầu"
            value={form.startsAt}
            onChange={(startsAt) => onFormChange({ ...form, startsAt })}
            min={minStart}
          />
          <DateTimePicker
            label="Kết thúc"
            value={form.endsAt}
            onChange={(endsAt) => onFormChange({ ...form, endsAt })}
            min={form.startsAt}
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
            onClick={onClose}
            className="h-10 rounded-md border border-outline-variant px-4 text-sm font-bold"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-error px-5 text-sm font-bold text-white disabled:opacity-50"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
            Tạo flash sale
          </button>
        </footer>
      </form>
    </SellerModalShell>
  );
}
