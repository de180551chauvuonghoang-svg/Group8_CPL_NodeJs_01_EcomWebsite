import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SellerPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  label?: string;
  loading?: boolean;
  onPageChange: (page: number) => void;
}

export default function SellerPagination({
  page,
  totalPages,
  total,
  label = 'kết quả',
  loading = false,
  onPageChange,
}: SellerPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Phân trang"
      className="flex flex-col gap-3 border-t border-outline-variant/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-xs text-on-surface-variant">
        Trang {page}/{totalPages} · {total.toLocaleString('vi-VN')} {label}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1 || loading}
          aria-label="Trang trước"
          title="Trang trước"
          className="flex h-9 w-9 items-center justify-center rounded-md border border-outline-variant text-on-surface-variant transition hover:border-primary/40 hover:text-primary disabled:opacity-40"
        >
          <ChevronLeft size={17} />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages || loading}
          aria-label="Trang sau"
          title="Trang sau"
          className="flex h-9 w-9 items-center justify-center rounded-md border border-outline-variant text-on-surface-variant transition hover:border-primary/40 hover:text-primary disabled:opacity-40"
        >
          <ChevronRight size={17} />
        </button>
      </div>
    </nav>
  );
}
