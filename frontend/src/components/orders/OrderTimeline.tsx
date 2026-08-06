import { Clock3, PackageSearch } from 'lucide-react';
import { CustomerOrderItem } from '../../types';
import { getFulfillmentMeta } from '../../utils/orderStatus';

interface OrderTimelineProps {
  items: CustomerOrderItem[];
  showActor?: boolean;
}

const sourceLabels: Record<string, string> = {
  seller: 'Cửa hàng',
  customer: 'Khách hàng',
  system: 'Hệ thống',
  payment: 'Thanh toán',
};

const formatTime = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('vi-VN');
};

export default function OrderTimeline({ items, showActor = false }: OrderTimelineProps) {
  return (
    <div className="divide-y divide-outline-variant/30 border-t border-outline-variant/30">
      {items.map((item) => {
        const currentStatus = getFulfillmentMeta(item.fulfillment_status);
        const history = item.history || [];

        return (
          <section key={item.id} className="px-5 py-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-surface-container">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.product_name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <PackageSearch className="m-3 text-on-surface-variant" size={20} />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-on-surface">{item.product_name}</p>
                  <p className="mt-0.5 text-xs text-on-surface-variant">
                    {item.shop_name ? `${item.shop_name} · ` : ''}SL: {item.quantity}
                  </p>
                </div>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${currentStatus.badgeClass}`}
              >
                {currentStatus.label}
              </span>
            </div>

            {history.length === 0 ? (
              <p className="mt-4 text-xs text-on-surface-variant">
                Chưa có lần cập nhật trạng thái nào.
              </p>
            ) : (
              <ol className="mt-5 space-y-4">
                {history.map((event) => {
                  const nextStatus = getFulfillmentMeta(event.new_status);
                  const actor = showActor
                    ? event.changed_by_name ||
                      sourceLabels[event.change_source] ||
                      event.change_source
                    : sourceLabels[event.change_source] || event.change_source;

                  return (
                    <li key={event.id} className="relative flex gap-3 pl-1">
                      <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-primary ring-4 ring-primary/10" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-on-surface">
                            {nextStatus.label}
                          </p>
                          <span className="inline-flex items-center gap-1 text-xs text-on-surface-variant">
                            <Clock3 size={12} />
                            {formatTime(event.created_at)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-on-surface-variant">Cập nhật bởi {actor}</p>
                        {event.note && (
                          <p className="mt-1.5 text-xs font-medium text-on-surface">{event.note}</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        );
      })}
    </div>
  );
}
