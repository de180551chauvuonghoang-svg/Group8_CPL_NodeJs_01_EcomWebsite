import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Loader2, PackageCheck, Search, Truck, XCircle } from 'lucide-react';
import { sellerService } from '../services/sellerService';
import { SellerOrder, SellerOrderItem } from '../types';

const statusLabels: Record<string, string> = {
  pending_fulfillment: 'Chờ chuẩn bị',
  ready_to_ship: 'Chờ giao',
  shipping: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã hủy',
};

const statusClass: Record<string, string> = {
  pending_fulfillment: 'bg-warning/10 text-warning',
  ready_to_ship: 'bg-primary/10 text-primary',
  shipping: 'bg-blue-500/10 text-blue-600',
  delivered: 'bg-success/10 text-success',
  cancelled: 'bg-error/10 text-error',
};

const fmt = (value: number) =>
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

function ItemActions({ item, onDone }: { item: SellerOrderItem; onDone: () => void }) {
  const [loading, setLoading] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [trackingCode, setTrackingCode] = useState(item.tracking_code || '');
  const [shippingLabelUrl, setShippingLabelUrl] = useState(item.shipping_label_url || '');
  const status = item.fulfillment_status || 'pending_fulfillment';

  const updateStatus = async (nextStatus: string) => {
    setLoading(nextStatus);
    try {
      await sellerService.updateOrderItem(item.id, {
        fulfillmentStatus: nextStatus,
        cancelReason: nextStatus === 'cancelled' ? cancelReason || 'Seller hủy đơn' : undefined,
        trackingCode: nextStatus === 'shipping' ? trackingCode : undefined,
        shippingLabelUrl: nextStatus === 'shipping' ? shippingLabelUrl : undefined,
      });
      onDone();
    } catch (error) {
      console.error('Failed to update seller order item.', error);
      alert('Không thể cập nhật đơn hàng. Vui lòng thử lại.');
    } finally {
      setLoading('');
    }
  };

  if (status === 'delivered' || status === 'cancelled') return null;

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      {status === 'pending_fulfillment' && (
        <button onClick={() => updateStatus('ready_to_ship')} disabled={!!loading} className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-60">
          {loading === 'ready_to_ship' ? <Loader2 size={14} className="animate-spin" /> : <PackageCheck size={14} />}
          Chuẩn bị hàng
        </button>
      )}
      {status === 'ready_to_ship' && (
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
          <input value={trackingCode} onChange={event => setTrackingCode(event.target.value)} placeholder="Mã vận đơn (ví dụ: SPX123...)" className="h-9 min-w-44 rounded-xl border border-outline-variant bg-surface-container px-3 text-xs outline-none focus:border-primary" />
          <input value={shippingLabelUrl} onChange={event => setShippingLabelUrl(event.target.value)} placeholder="Link tra cứu (không bắt buộc)" className="h-9 min-w-44 rounded-xl border border-outline-variant bg-surface-container px-3 text-xs outline-none focus:border-primary" />
          <button onClick={() => updateStatus('shipping')} disabled={!!loading || !trackingCode.trim()} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-60">
            {loading === 'shipping' ? <Loader2 size={14} className="animate-spin" /> : <Truck size={14} />}
            Giao cho ĐVVC
          </button>
        </div>
      )}
      {status === 'shipping' && (
        <button onClick={() => updateStatus('delivered')} disabled={!!loading} className="inline-flex items-center gap-2 rounded-xl bg-success px-3 py-2 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-60">
          {loading === 'delivered' ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
          Xác nhận đã giao
        </button>
      )}
      {status !== 'shipping' && (
        <>
          <input value={cancelReason} onChange={event => setCancelReason(event.target.value)} placeholder="Lý do hủy" className="h-9 min-w-44 rounded-xl border border-outline-variant bg-surface-container px-3 text-xs outline-none focus:border-primary" />
          <button onClick={() => updateStatus('cancelled')} disabled={!!loading} className="inline-flex items-center gap-2 rounded-xl border border-error/30 bg-error/10 px-3 py-2 text-xs font-bold text-error transition hover:bg-error/15 disabled:opacity-60">
            {loading === 'cancelled' ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
            Hủy đơn
          </button>
        </>
      )}
    </div>
  );
}

export default function SellerOrders() {
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState(searchParams.get('status') || 'all');

  const fetchOrders = async () => {
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
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filtered = useMemo(() => {
    return orders
      .map(order => ({
        ...order,
        items: order.items.filter(item => {
          const itemStatus = item.fulfillment_status || 'pending_fulfillment';
          const matchesStatus = status === 'all' || itemStatus === status;
          const q = query.trim().toLowerCase();
          const matchesQuery = !q || order.id.toLowerCase().includes(q) || cleanProductName(item.product_name).toLowerCase().includes(q);
          return matchesStatus && matchesQuery;
        }),
      }))
      .filter(order => order.items.length > 0);
  }, [orders, query, status]);

  return (
    <div className="min-h-screen bg-surface p-5 lg:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-black text-on-surface">Quản lý đơn hàng</h1>
            <p className="mt-1 text-sm text-on-surface-variant">Theo dõi và xử lý các sản phẩm thuộc shop của bạn.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
              <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm mã đơn hoặc sản phẩm" className="h-11 w-full rounded-xl border border-outline-variant bg-surface-container-lowest pl-10 pr-3 text-sm outline-none focus:border-primary sm:w-64" />
            </div>
            <select value={status} onChange={event => setStatus(event.target.value)} className="h-11 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm outline-none focus:border-primary">
              <option value="all">Tất cả trạng thái</option>
              {Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 rounded-2xl border border-error/20 bg-error/10 px-4 py-3 text-sm font-semibold text-error">
            {errorMessage}
          </div>
        )}

        {loading ? (
          <div className="flex h-56 items-center justify-center">
            <Loader2 size={30} className="animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest p-12 text-center">
            <AlertTriangle size={34} className="mx-auto mb-3 text-on-surface-variant/50" />
            <p className="font-bold">Chưa có đơn phù hợp</p>
            <p className="mt-1 text-sm text-on-surface-variant">Khi khách mua sản phẩm của shop, đơn sẽ xuất hiện tại đây.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(order => (
              <section key={order.id} className="overflow-hidden rounded-2xl bg-surface-container-lowest shadow-sm ring-1 ring-outline-variant/40">
                <div className="flex flex-col gap-3 border-b border-outline-variant/30 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="font-black">Đơn #{order.id}</p>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-on-surface-variant">
                      <span>{order.shipping_name}</span>
                      <span>{order.shipping_phone}</span>
                      <span>{new Date(order.created_at).toLocaleString('vi-VN')}</span>
                    </div>
                  </div>
                  <div className="text-left lg:text-right">
                    <p className="text-xs font-bold uppercase text-on-surface-variant">Tổng đơn</p>
                    <p className="text-sm font-black text-primary">{fmt(order.total)}</p>
                  </div>
                </div>

                <div className="divide-y divide-outline-variant/30">
                  {order.items.map(item => {
                    const itemStatus = item.fulfillment_status || 'pending_fulfillment';
                    return (
                      <article key={item.id} className="p-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-surface-container ring-1 ring-outline-variant/40">
                            {item.image_url ? <img src={item.image_url} alt={cleanProductName(item.product_name)} className="h-full w-full object-cover" /> : null}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div className="min-w-0">
                                <p className="line-clamp-2 font-bold text-on-surface">{cleanProductName(item.product_name)}</p>
                                <div className="mt-2 flex flex-wrap gap-2 text-xs text-on-surface-variant">
                                  <span className="rounded-lg bg-surface-container px-2 py-1">SL: {item.quantity}</span>
                                  <span className="rounded-lg bg-surface-container px-2 py-1">{item.variant_info || 'Mặc định'}</span>
                                  {item.sku && <span className="rounded-lg bg-surface-container px-2 py-1">SKU: {item.sku}</span>}
                                </div>
                              </div>
                              <div className="shrink-0 text-left lg:text-right">
                                <span className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-bold ${statusClass[itemStatus] || 'bg-surface-container text-on-surface-variant'}`}>
                                  {statusLabels[itemStatus] || itemStatus}
                                </span>
                                <p className="mt-2 text-sm font-black">{fmt(item.total_price)}</p>
                                <p className="mt-0.5 text-xs text-on-surface-variant">{fmt(item.unit_price)} / sản phẩm</p>
                              </div>
                            </div>
                            <ItemActions item={item} onDone={fetchOrders} />
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
