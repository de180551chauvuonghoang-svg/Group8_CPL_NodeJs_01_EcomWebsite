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
      className={`grid gap-3 border-b border-outline-variant/35 bg-surface-container-low/55 p-4 sm:p-5 ${className}`}
    >
      {children}
    </form>
  );
}
