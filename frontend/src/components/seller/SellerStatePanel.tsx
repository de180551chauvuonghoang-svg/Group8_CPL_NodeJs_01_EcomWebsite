import type { LucideIcon } from 'lucide-react';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface SellerStatePanelProps {
  state: 'loading' | 'empty' | 'error';
  title?: string;
  description?: string;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}

export default function SellerStatePanel({
  state,
  title,
  description,
  icon: Icon,
  actionLabel,
  onAction,
  compact = false,
}: SellerStatePanelProps) {
  const StateIcon = Icon || (state === 'error' ? AlertTriangle : undefined);
  const defaultTitle =
    state === 'loading'
      ? 'Đang tải dữ liệu'
      : state === 'error'
        ? 'Không tải được dữ liệu'
        : 'Chưa có dữ liệu';

  return (
    <div
      className={`flex flex-col items-center justify-center px-5 text-center ${compact ? 'py-8' : 'py-14'}`}
    >
      {state === 'loading' ? (
        <Loader2 size={28} className="animate-spin text-primary" />
      ) : StateIcon ? (
        <StateIcon
          size={30}
          className={state === 'error' ? 'text-error/70' : 'text-on-surface-variant/45'}
        />
      ) : null}
      <h3 className="mt-3 font-black text-on-surface">{title || defaultTitle}</h3>
      {description && (
        <p className="mt-1 max-w-md text-sm leading-6 text-on-surface-variant">{description}</p>
      )}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 rounded-md border border-outline-variant px-3 py-2 text-sm font-bold text-on-surface transition hover:border-primary/40 hover:text-primary"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
