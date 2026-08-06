import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  ChevronDown,
  History,
  Loader2,
  PackageCheck,
  Search,
  Truck,
  XCircle,
} from 'lucide-react';
import OrderTimeline from '../components/orders/OrderTimeline';
import SellerPageHeader from '../components/seller/SellerPageHeader';
import SellerStatePanel from '../components/seller/SellerStatePanel';
import { sellerService, SellerOrderItemUpdateResult } from '../services/sellerService';
import { FulfillmentStatus, OrderTimelineData, SellerOrder, SellerOrderItem } from '../types';
import {
  FULFILLMENT_STATUS_META,
  getFulfillmentMeta,
  isFinalFulfillmentStatus,
} from '../utils/orderStatus';

interface ApiError {
  message?: string;
  data?: {
    code?: string;
    message?: string;
  };
}

interface ItemActionsProps {
  item: SellerOrderItem;
  onUpdated: (result: SellerOrderItemUpdateResult) => void | Promise<void>;
  onRefresh: () => void | Promise<void>;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value || 0));

const cleanProductName = (name?: string) => {
  const raw = typeof name === 'string' ? name : String(name || 'Sản phẩm');
  const text = raw.trim();

  if (text.length % 2 === 0) {
    const half = text.slice(0, text.length / 2);
    if (half && half === text.slice(text.length / 2)) return half;
  }

  return text.replace(/\s+/g, ' ');
};

const getDistinctVariantInfo = (variantInfo?: string, sku?: string) => {
  const displayValue = variantInfo?.trim();
  if (!displayValue) return null;

  const normalize = (value?: string) =>
    value
      ?.trim()
      .replace(/^sku\s*:\s*/i, '')
      .toLocaleLowerCase('vi-VN');

  return normalize(displayValue) === normalize(sku) ? null : displayValue;
};

const getUpdateErrorMessage = (error: unknown) => {
  const apiError = error as ApiError;
  const code = apiError.data?.code;
  const message = apiError.data?.message || apiError.message;

  const fallbacks: Record<string, string> = {
    INVALID_FULFILLMENT_STATUS: 'Trạng thái đơn hàng không hợp lệ.',
    CANCEL_REASON_REQUIRED: 'Vui lòng nhập lý do hủy đơn hàng.',
    ORDER_ITEM_NOT_FOUND: 'Không tìm thấy sản phẩm trong đơn hàng này.',
    INVALID_FULFILLMENT_TRANSITION: 'Đơn hàng đã đổi trạng thái. Dữ liệu đang được tải lại.',
  };

  return {
    code,
    message: message || (code ? fallbacks[code] : '') || 'Không thể cập nhật đơn hàng.',
  };
};

function ItemActions({ item, onUpdated, onRefresh }: ItemActionsProps) {
  const [loadingStatus, setLoadingStatus] = useState<FulfillmentStatus | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [trackingCode, setTrackingCode] = useState(item.tracking_code || '');
  const [errorMessage, setErrorMessage] = useState('');
  const status = item.fulfillment_status;

  const updateStatus = async (nextStatus: FulfillmentStatus) => {
    const normalizedCancelReason = cancelReason.trim();
    const normalizedTrackingCode = trackingCode.trim();

    if (nextStatus === 'cancelled' && !normalizedCancelReason) {
      setErrorMessage('Vui lòng nhập lý do hủy đơn hàng.');
      return;
    }

    setLoadingStatus(nextStatus);
    setErrorMessage('');

    try {
      const result = await sellerService.updateOrderItem(item.id, {
        fulfillmentStatus: nextStatus,
        trackingCode:
          nextStatus === 'shipping' && normalizedTrackingCode ? normalizedTrackingCode : undefined,
        cancelReason: nextStatus === 'cancelled' ? normalizedCancelReason : undefined,
      });

      if (nextStatus === 'cancelled') setCancelReason('');
      await onUpdated(result);
    } catch (error) {
      const parsedError = getUpdateErrorMessage(error);
      setErrorMessage(parsedError.message);

      if (
        parsedError.code === 'INVALID_FULFILLMENT_TRANSITION' ||
        parsedError.code === 'ORDER_ITEM_NOT_FOUND'
      ) {
        await onRefresh();
      }
    } finally {
      setLoadingStatus(null);
    }
  };

  if (isFinalFulfillmentStatus(status)) return null;

  const isUpdating = loadingStatus !== null;
  const canCancel = status === 'pending_fulfillment' || status === 'ready_to_ship';

  return (
    <div className="mt-4 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {status === 'pending_fulfillment' && (
          <button
            type="button"
            onClick={() => updateStatus('ready_to_ship')}
            disabled={isUpdating}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-60"
          >
            {loadingStatus === 'ready_to_ship' ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <PackageCheck size={14} />
            )}
            Xác nhận đóng gói
          </button>
        )}

        {status === 'ready_to_ship' && (
          <>
            <input
              value={trackingCode}
              onChange={(event) => setTrackingCode(event.target.value)}
              maxLength={100}
              placeholder="Mã vận đơn (không bắt buộc)"
              className="h-9 min-w-52 rounded-lg border border-outline-variant bg-surface-container px-3 text-xs outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={() => updateStatus('shipping')}
              disabled={isUpdating}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-60"
            >
              {loadingStatus === 'shipping' ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Truck size={14} />
              )}
              Bắt đầu giao
            </button>
          </>
        )}

        {status === 'shipping' && (
          <button
            type="button"
            onClick={() => updateStatus('delivered')}
            disabled={isUpdating}
            className="inline-flex items-center gap-2 rounded-lg bg-success px-3 py-2 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-60"
          >
            {loadingStatus === 'delivered' ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <CheckCircle2 size={14} />
            )}
            Đã giao
          </button>
        )}

        {canCancel && (
          <>
            <input
              value={cancelReason}
              onChange={(event) => {
                setCancelReason(event.target.value);
                if (errorMessage) setErrorMessage('');
              }}
              maxLength={255}
              placeholder="Lý do hủy (bắt buộc)"
              className="h-9 min-w-52 rounded-lg border border-outline-variant bg-surface-container px-3 text-xs outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={() => updateStatus('cancelled')}
              disabled={isUpdating}
              className="inline-flex items-center gap-2 rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-xs font-bold text-error transition hover:bg-error/15 disabled:opacity-60"
            >
              {loadingStatus === 'cancelled' ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <XCircle size={14} />
              )}
              Hủy đơn
            </button>
          </>
        )}
      </div>

      {errorMessage && <p className="text-xs font-semibold text-error">{errorMessage}</p>}
    </div>
  );
}

export default function SellerOrders() {
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [status, setStatus] = useState(searchParams.get('status') || 'all');
  const [timelineOrderId, setTimelineOrderId] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<OrderTimelineData | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState('');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      const data = await sellerService.getOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load seller orders.', error);
      setErrorMessage('Không thể tải danh sách đơn hàng. Vui lòng thử lại.');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTimeline = useCallback(async (orderId: string) => {
    setTimelineLoading(true);
    setTimelineError('');

    try {
      const data = await sellerService.getOrderTimeline(orderId);
      setTimeline(data);
    } catch (error) {
      console.error('Failed to load seller order timeline.', error);
      setTimeline(null);
      setTimelineError('Không thể tải hành trình đơn hàng.');
    } finally {
      setTimelineLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleTimelineToggle = async (orderId: string) => {
    if (timelineOrderId === orderId) {
      setTimelineOrderId(null);
      setTimeline(null);
      setTimelineError('');
      return;
    }

    setTimelineOrderId(orderId);
    await loadTimeline(orderId);
  };

  const handleItemUpdated = async (orderId: string, result: SellerOrderItemUpdateResult) => {
    setOrders((currentOrders) =>
      currentOrders.map((order) =>
        order.id !== orderId
          ? order
          : {
              ...order,
              items: order.items.map((item) =>
                item.id === result.id
                  ? {
                      ...item,
                      fulfillment_status: result.fulfillment_status,
                      tracking_code: result.tracking_code ?? item.tracking_code,
                      cancel_reason: result.cancel_reason ?? item.cancel_reason,
                    }
                  : item,
              ),
            },
      ),
    );

    if (timelineOrderId === orderId) {
      await loadTimeline(orderId);
    }
  };

  const filteredOrders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return orders
      .map((order) => ({
        ...order,
        items: order.items.filter((item) => {
          const matchesStatus = status === 'all' || item.fulfillment_status === status;
          const matchesQuery =
            !normalizedQuery ||
            order.id.toLowerCase().includes(normalizedQuery) ||
            cleanProductName(item.product_name).toLowerCase().includes(normalizedQuery);

          return matchesStatus && matchesQuery;
        }),
      }))
      .filter((order) => order.items.length > 0);
  }, [orders, query, status]);

  return (
    <div className="min-h-screen bg-surface p-5 lg:p-8">
      <div className="mx-auto max-w-6xl">
        <SellerPageHeader
          icon={PackageCheck}
          eyebrow="Vận hành"
          title="Quản lý đơn hàng"
          description="Theo dõi và xử lý từng sản phẩm thuộc cửa hàng của bạn."
          actions={
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
                />
                <input
                  value={query}
                  onChange={(event) => {
                    const nextQuery = event.target.value;
                    setQuery(nextQuery);
                    const next = new URLSearchParams(searchParams);
                    if (nextQuery) next.set('q', nextQuery);
                    else next.delete('q');
                    setSearchParams(next, { replace: true });
                  }}
                  placeholder="Tìm mã đơn hoặc sản phẩm"
                  className="h-11 w-full rounded-lg border border-outline-variant bg-surface-container-lowest pl-10 pr-3 text-sm outline-none focus:border-primary sm:w-64"
                />
              </div>
              <select
                value={status}
                onChange={(event) => {
                  const nextStatus = event.target.value;
                  setStatus(nextStatus);
                  const next = new URLSearchParams(searchParams);
                  if (nextStatus === 'all') next.delete('status');
                  else next.set('status', nextStatus);
                  setSearchParams(next, { replace: true });
                }}
                className="h-11 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-sm outline-none focus:border-primary"
              >
                <option value="all">Tất cả trạng thái</option>
                {Object.entries(FULFILLMENT_STATUS_META).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value.label}
                  </option>
                ))}
              </select>
            </div>
          }
        />

        {errorMessage && (
          <div className="mb-4 rounded-lg border border-error/20 bg-error/10 px-4 py-3 text-sm font-semibold text-error">
            {errorMessage}
          </div>
        )}

        {loading ? (
          <SellerStatePanel state="loading" title="Đang tải đơn hàng" />
        ) : filteredOrders.length === 0 ? (
          <div className="rounded-lg border border-dashed border-outline-variant bg-surface-container-lowest">
            <SellerStatePanel
              state="empty"
              icon={PackageCheck}
              title="Chưa có đơn phù hợp"
              description="Khi khách mua sản phẩm của shop, đơn sẽ xuất hiện tại đây."
            />
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <section
                key={order.id}
                className="overflow-hidden rounded-lg bg-surface-container-lowest shadow-sm ring-1 ring-outline-variant/40"
              >
                <div className="flex flex-col gap-3 border-b border-outline-variant/30 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="font-black">Đơn #{order.id}</p>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-on-surface-variant">
                      <span>{order.shipping_name}</span>
                      <span>{order.shipping_phone}</span>
                      <span>{new Date(order.created_at).toLocaleString('vi-VN')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 lg:justify-end">
                    <button
                      type="button"
                      onClick={() => handleTimelineToggle(order.id)}
                      className="inline-flex h-9 items-center gap-2 rounded-lg border border-outline-variant px-3 text-xs font-bold text-on-surface transition hover:border-primary hover:text-primary"
                    >
                      <History size={15} />
                      Hành trình
                      <ChevronDown
                        size={14}
                        className={`transition-transform ${timelineOrderId === order.id ? 'rotate-180' : ''}`}
                      />
                    </button>
                    <div className="text-left lg:text-right">
                      <p className="text-xs font-bold uppercase text-on-surface-variant">
                        Tổng đơn
                      </p>
                      <p className="text-sm font-black text-primary">
                        {formatCurrency(order.total)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-outline-variant/30">
                  {order.items.map((item) => {
                    const statusMeta = getFulfillmentMeta(item.fulfillment_status);
                    const variantInfo = getDistinctVariantInfo(item.variant_info, item.sku);

                    return (
                      <article key={item.id} className="p-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-surface-container ring-1 ring-outline-variant/40">
                            {item.image_url && (
                              <img
                                src={item.image_url}
                                alt={cleanProductName(item.product_name)}
                                className="h-full w-full object-cover"
                              />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div className="min-w-0">
                                <p className="line-clamp-2 font-bold text-on-surface">
                                  {cleanProductName(item.product_name)}
                                </p>
                                <div className="mt-2 flex flex-wrap gap-2 text-xs text-on-surface-variant">
                                  <span className="rounded-lg bg-surface-container px-2 py-1">
                                    SL: {item.quantity}
                                  </span>
                                  {variantInfo && (
                                    <span className="rounded-lg bg-surface-container px-2 py-1">
                                      {variantInfo}
                                    </span>
                                  )}
                                  {item.sku && (
                                    <span className="rounded-lg bg-surface-container px-2 py-1">
                                      SKU: {item.sku}
                                    </span>
                                  )}
                                  {item.tracking_code && (
                                    <span className="rounded-lg bg-surface-container px-2 py-1">
                                      Vận đơn: {item.tracking_code}
                                    </span>
                                  )}
                                </div>
                                {item.cancel_reason && (
                                  <p className="mt-2 text-xs font-medium text-error">
                                    Lý do hủy: {item.cancel_reason}
                                  </p>
                                )}
                              </div>
                              <div className="shrink-0 text-left lg:text-right">
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${statusMeta.badgeClass}`}
                                >
                                  {statusMeta.label}
                                </span>
                                <p className="mt-2 text-sm font-black">
                                  {formatCurrency(item.total_price)}
                                </p>
                                <p className="mt-0.5 text-xs text-on-surface-variant">
                                  {formatCurrency(item.unit_price)} / sản phẩm
                                </p>
                              </div>
                            </div>

                            <ItemActions
                              item={item}
                              onUpdated={(result) => handleItemUpdated(order.id, result)}
                              onRefresh={fetchOrders}
                            />
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>

                {timelineOrderId === order.id && (
                  <div className="bg-surface-container-low/40">
                    {timelineLoading ? (
                      <div className="flex items-center justify-center gap-2 border-t border-outline-variant/30 px-5 py-8 text-sm text-on-surface-variant">
                        <Loader2 size={18} className="animate-spin text-primary" />
                        Đang tải hành trình...
                      </div>
                    ) : timelineError ? (
                      <p className="border-t border-outline-variant/30 px-5 py-5 text-sm font-semibold text-error">
                        {timelineError}
                      </p>
                    ) : timeline?.id === order.id ? (
                      <OrderTimeline items={timeline.items} showActor />
                    ) : null}
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
