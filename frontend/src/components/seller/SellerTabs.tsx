import type { LucideIcon } from 'lucide-react';

export interface SellerTab<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
  count?: number;
}

interface SellerTabsProps<T extends string> {
  value: T;
  tabs: readonly SellerTab<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
}

export default function SellerTabs<T extends string>({
  value,
  tabs,
  onChange,
  ariaLabel,
}: SellerTabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="mb-5 inline-flex max-w-full gap-1 overflow-x-auto rounded-lg border border-outline-variant/40 bg-surface-container p-1"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.value)}
            className={`flex shrink-0 items-center gap-2 rounded-md px-4 py-2.5 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
              isActive
                ? 'bg-surface-container-lowest text-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {Icon && <Icon size={16} />}
            {tab.label}
            {typeof tab.count === 'number' && tab.count > 0 && (
              <span
                className={`min-w-5 rounded-md px-1.5 py-0.5 text-center text-xs ${
                  isActive ? 'bg-primary/10 text-primary' : 'bg-outline-variant/20'
                }`}
              >
                {tab.count > 99 ? '99+' : tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
