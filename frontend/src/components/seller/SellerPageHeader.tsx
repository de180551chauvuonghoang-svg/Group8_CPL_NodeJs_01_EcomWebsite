import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface SellerPageHeaderProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  eyebrow?: string;
  actions?: ReactNode;
}

export default function SellerPageHeader({
  title,
  description,
  icon: Icon,
  eyebrow,
  actions,
}: SellerPageHeaderProps) {
  return (
    <header className="mb-7 flex flex-col gap-4 border-b border-outline-variant/35 pb-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-primary/8 text-primary">
            <Icon size={21} />
          </div>
        )}
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.1em] text-primary">
              {eyebrow}
            </p>
          )}
          <h1 className="text-2xl font-extrabold text-on-surface lg:text-[1.7rem]">{title}</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-on-surface-variant text-pretty">
            {description}
          </p>
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
