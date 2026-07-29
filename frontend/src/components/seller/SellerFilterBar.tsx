import type { FormEventHandler, ReactNode } from 'react';

interface SellerFilterBarProps {
  children: ReactNode;
  onSubmit?: FormEventHandler<HTMLFormElement>;
  className?: string;
  ariaLabel?: string;
}

export default function SellerFilterBar({
  children,
  onSubmit,
  className = '',
  ariaLabel = 'Bộ lọc dữ liệu',
}: SellerFilterBarProps) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.(event);
      }}
      aria-label={ariaLabel}
      className={`grid gap-3 border-b border-outline-variant/40 bg-surface-container-lowest p-5 ${className}`}
    >
      {children}
    </form>
  );
}
