import type { ReactNode } from 'react';

interface SellerTableViewportProps {
  children: ReactNode;
  minWidthClass?: string;
  ariaLabel?: string;
}

export default function SellerTableViewport({
  children,
  minWidthClass = 'min-w-[880px]',
  ariaLabel = 'Bảng dữ liệu',
}: SellerTableViewportProps) {
  return (
    <div className="overflow-x-auto" role="region" aria-label={ariaLabel} tabIndex={0}>
      <table className={`w-full text-left text-sm ${minWidthClass}`}>{children}</table>
    </div>
  );
}
