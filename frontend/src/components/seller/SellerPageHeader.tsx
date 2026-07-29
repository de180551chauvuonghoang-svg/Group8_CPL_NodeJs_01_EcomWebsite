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
    <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon size={21} />
          </div>
        )}
        <div className="min-w-0">
          {eyebrow && <p className="mb-1 text-xs font-bold uppercase text-primary">{eyebrow}</p>}
          <h1 className="text-2xl font-black text-on-surface">{title}</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-on-surface-variant">{description}</p>
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
