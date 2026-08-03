import { Package, Star, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface ProductRankingItem {
  id: string;
  name: string;
  imageUrl?: string | null;
  primaryMetric?: string;
  rating?: number;
  secondaryMetric: string;
}

interface ProductRankingPanelProps {
  title: string;
  description: string;
  icon: LucideIcon;
  products: ProductRankingItem[];
  emptyText: string;
}

export default function ProductRankingPanel({
  title,
  description,
  icon: Icon,
  products,
  emptyText,
}: ProductRankingPanelProps) {
  return (
    <section className="overflow-hidden rounded-lg border border-outline-variant/40 bg-surface-container-lowest">
      <header className="flex items-start justify-between gap-4 border-b border-outline-variant/35 px-5 py-4">
        <div>
          <h2 className="flex items-center gap-2 text-base font-black text-on-surface">
            <Icon size={18} className="text-primary" /> {title}
          </h2>
          <p className="mt-1 text-xs leading-5 text-on-surface-variant">{description}</p>
        </div>
        <Link
          to="/seller/products"
          className="shrink-0 text-xs font-bold text-primary hover:underline"
        >
          Xem tất cả
        </Link>
      </header>
      {products.length > 0 ? (
        <ol className="divide-y divide-outline-variant/35">
          {products.map((product, index) => (
            <li key={product.id}>
              <Link
                to={`/products/${product.id}`}
                className="group flex items-center gap-3 px-5 py-3 transition hover:bg-surface-container/45"
              >
                <span className="w-5 shrink-0 text-center text-xs font-black tabular-nums text-on-surface-variant">
                  {index + 1}
                </span>
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-outline-variant/40 bg-surface-container">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-on-surface-variant/50">
                      <Package size={20} />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-on-surface group-hover:text-primary">
                    {product.name}
                  </p>
                  {typeof product.rating === 'number' ? (
                    <p className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-amber-600">
                      <Star size={13} fill="currentColor" />
                      {product.rating.toFixed(1)} sao
                    </p>
                  ) : (
                    <p className="mt-1 text-xs font-semibold text-on-surface-variant">
                      {product.primaryMetric}
                    </p>
                  )}
                </div>
                <strong className="shrink-0 text-sm text-on-surface">
                  {product.secondaryMetric}
                </strong>
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <div className="px-5 py-10 text-center">
          <Package size={24} className="mx-auto text-on-surface-variant/50" />
          <p className="mt-2 text-sm font-semibold text-on-surface-variant">{emptyText}</p>
        </div>
      )}
    </section>
  );
}
