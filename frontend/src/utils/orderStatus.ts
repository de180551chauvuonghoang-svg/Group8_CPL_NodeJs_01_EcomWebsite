import { FulfillmentStatus } from '../types';

export const FULFILLMENT_STATUS_META: Record<
  FulfillmentStatus,
  { label: string; badgeClass: string }
> = {
  pending_fulfillment: {
    label: 'Chờ xử lý',
    badgeClass: 'bg-amber-50 text-amber-700',
  },
  ready_to_ship: {
    label: 'Chờ lấy hàng',
    badgeClass: 'bg-cyan-50 text-cyan-700',
  },
  shipping: {
    label: 'Đang giao',
    badgeClass: 'bg-blue-50 text-blue-700',
  },
  delivered: {
    label: 'Đã giao',
    badgeClass: 'bg-emerald-50 text-emerald-700',
  },
  cancelled: {
    label: 'Đã hủy',
    badgeClass: 'bg-rose-50 text-rose-700',
  },
};

export const getFulfillmentMeta = (status: FulfillmentStatus) => FULFILLMENT_STATUS_META[status];

export const isFinalFulfillmentStatus = (status: FulfillmentStatus) =>
  status === 'delivered' || status === 'cancelled';
