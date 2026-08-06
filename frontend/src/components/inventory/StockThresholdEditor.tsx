import { useEffect, useState } from 'react';
import { Check, Loader2, Pencil, X } from 'lucide-react';
import { inventoryService } from '../../services/inventoryService';
import { getInventoryErrorMessage } from '../../utils/inventoryErrors';

interface StockThresholdEditorProps {
  productId: string;
  variantId: string;
  value: number;
  onUpdated: (value: number) => void | Promise<void>;
}

export default function StockThresholdEditor({
  productId,
  variantId,
  value,
  onUpdated,
}: StockThresholdEditorProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => setDraft(String(value)), [value]);

  const cancel = () => {
    setDraft(String(value));
    setError('');
    setEditing(false);
  };

  const save = async () => {
    const threshold = Number(draft);
    if (!Number.isInteger(threshold) || threshold < 0 || threshold > 1_000_000) {
      setError('Ngưỡng phải là số nguyên từ 0 đến 1.000.000.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await inventoryService.updateStockAlert(productId, variantId, threshold);
      await onUpdated(threshold);
      setEditing(false);
    } catch (requestError) {
      setError(getInventoryErrorMessage(requestError, 'Không thể cập nhật ngưỡng cảnh báo.'));
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-outline-variant px-2.5 py-1.5 text-xs font-bold text-on-surface-variant transition hover:border-primary/40 hover:text-primary"
        title="Sửa ngưỡng cảnh báo"
      >
        <Pencil size={12} />
        Ngưỡng {value}
      </button>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          min="0"
          max="1000000"
          step="1"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          disabled={saving}
          className="h-8 w-24 rounded-md border border-outline-variant bg-surface-container px-2 text-xs text-on-surface outline-none focus:border-primary"
          aria-label="Ngưỡng cảnh báo tồn kho"
        />
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-white disabled:opacity-50"
          aria-label="Lưu ngưỡng"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
        </button>
        <button
          type="button"
          onClick={cancel}
          disabled={saving}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-outline-variant text-on-surface-variant disabled:opacity-50"
          aria-label="Hủy sửa ngưỡng"
        >
          <X size={14} />
        </button>
      </div>
      {error && <p className="mt-1 max-w-64 text-xs text-error">{error}</p>}
    </div>
  );
}
