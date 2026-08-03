import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import type { ToastItem, ToastTone } from '../../context/ToastContext';

const toneStyles: Record<
  ToastTone,
  { icon: typeof CheckCircle2; iconClass: string; barClass: string }
> = {
  success: {
    icon: CheckCircle2,
    iconClass: 'bg-success/10 text-success',
    barClass: 'bg-success',
  },
  error: {
    icon: AlertCircle,
    iconClass: 'bg-error/10 text-error',
    barClass: 'bg-error',
  },
  warning: {
    icon: TriangleAlert,
    iconClass: 'bg-warning/10 text-warning',
    barClass: 'bg-warning',
  },
  info: {
    icon: Info,
    iconClass: 'bg-primary/10 text-primary',
    barClass: 'bg-primary',
  },
};

interface ToastViewportProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export default function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  return (
    <div
      className="pointer-events-none fixed inset-x-3 bottom-3 z-[80] flex flex-col items-end gap-2 sm:inset-x-auto sm:bottom-auto sm:right-5 sm:top-5 sm:w-[360px]"
      aria-live="polite"
      aria-label="Thông báo hệ thống"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const style = toneStyles[toast.tone];
          const Icon = style.icon;

          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 18, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="pointer-events-auto relative w-full overflow-hidden rounded-lg border border-outline-variant/50 bg-surface-container-lowest shadow-xl"
              role={toast.tone === 'error' ? 'alert' : 'status'}
            >
              <div className="flex items-start gap-3 p-4 pr-11">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${style.iconClass}`}
                >
                  <Icon size={18} />
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className="text-sm font-extrabold text-on-surface">{toast.title}</p>
                  {toast.message && (
                    <p className="mt-1 text-sm leading-5 text-on-surface-variant">
                      {toast.message}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-md text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface"
                aria-label="Đóng thông báo"
                title="Đóng"
              >
                <X size={16} />
              </button>
              <span className={`absolute inset-y-0 left-0 w-1 ${style.barClass}`} />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
