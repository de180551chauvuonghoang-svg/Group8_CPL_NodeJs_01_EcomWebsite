import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  ChevronDown,
  History,
  Loader2,
  MessageSquareReply,
  PackageSearch,
  Pencil,
  RotateCcw,
  Star,
  Trash2,
} from 'lucide-react';
import { paymentService } from '../../services/paymentService';
import type {
  CustomerOrderItem,
  MyReview,
  OrderTimelineData,
  ReturnRequest,
  ReturnStatus,
  ReviewableItem,
  UserOrder,
} from '../../types';
import { getFulfillmentMeta } from '../../utils/orderStatus';
import OrderTimeline from './OrderTimeline';

interface CustomerOrderCardProps {
  order: UserOrder;
  index: number;
  reviewableItems: ReadonlyMap<string, ReviewableItem>;
  myReviews: ReadonlyMap<string, MyReview>;
  returnsByItemId: ReadonlyMap<string, ReturnRequest>;
  reviewsReady: boolean;
  returnsReady: boolean;
  onReview: (item: ReviewableItem) => void;
  onEditReview: (review: MyReview) => void;
  onDeleteReview: (review: MyReview) => void;
  onReturn: (item: CustomerOrderItem) => void;
  deletingReviewId: string | null;
}

const returnStatusMeta: Record<ReturnStatus, { label: string; className: string }> = {
  requested: { label: 'Đang chờ duyệt trả hàng', className: 'bg-amber-50 text-amber-700' },
  approved: { label: 'Shop đã chấp nhận', className: 'bg-blue-50 text-blue-700' },
  rejected: { label: 'Shop đã từ chối', className: 'bg-rose-50 text-rose-700' },
  received: { label: 'Shop đã nhận hàng', className: 'bg-emerald-50 text-emerald-700' },
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value || 0));

const paymentLabels: Record<string, string> = {
  cod: 'COD',
  qr: 'Chuyển khoản VietQR',
  momo: 'MoMo',
};

export default function CustomerOrderCard({
  order,
  index,
  reviewableItems,
  myReviews,
  returnsByItemId,
  reviewsReady,
  returnsReady,
  onReview,
  onEditReview,
  onDeleteReview,
  onReturn,
  deletingReviewId,
}: CustomerOrderCardProps) {
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [timeline, setTimeline] = useState<OrderTimelineData | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState('');
  const orderStatus = getFulfillmentMeta(order.display_status);

  const toggleTimeline = async () => {
    if (isTimelineOpen) {
      setIsTimelineOpen(false);
      return;
    }

    setIsTimelineOpen(true);
    setTimelineLoading(true);
    setTimelineError('');
    try {
      setTimeline(await paymentService.getOrderTimeline(order.id));
    } catch (error) {
      console.error('Failed to load customer order timeline.', error);
      setTimelineError('Không thể tải hành trình đơn hàng. Vui lòng thử lại.');
    } finally {
      setTimelineLoading(false);
    }
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="overflow-hidden rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition-shadow duration-200 hover:shadow-md"
    >
      <header className="flex flex-wrap items-start justify-between gap-4 p-5">
        <div>
          <p className="mb-1 text-xs font-semibold text-slate-400">Mã đơn hàng</p>
          <p className="break-all font-mono text-sm font-bold text-blue-600">
            #{order.id.toUpperCase()}
          </p>
        </div>
        <span className={`rounded-md px-3 py-1 text-xs font-bold ${orderStatus.badgeClass}`}>
          {orderStatus.label}
        </span>
      </header>

      <div className="grid grid-cols-2 gap-4 border-t border-slate-100 px-5 py-4 text-sm sm:grid-cols-3">
        <div>
          <p className="mb-1 text-xs text-slate-400">Tổng tiền</p>
          <p className="text-base font-black text-blue-600">{formatCurrency(order.total)}</p>
        </div>
        <div>
          <p className="mb-1 text-xs text-slate-400">Thanh toán</p>
          <p className="font-bold text-slate-700">
            {paymentLabels[order.payment_method] || order.payment_method}
          </p>
        </div>
        <div>
          <p className="mb-1 text-xs text-slate-400">Ngày đặt hàng</p>
          <p className="font-bold text-slate-700">
            {new Date(order.created_at).toLocaleDateString('vi-VN')}
          </p>
        </div>
        <div className="col-span-2 sm:col-span-3">
          <p className="mb-1 text-xs text-slate-400">Địa chỉ giao hàng</p>
          <p className="text-xs font-medium text-slate-600">{order.shipping_address}</p>
        </div>
      </div>

      <div className="divide-y divide-slate-100 border-t border-slate-100">
        {order.items.map((item) => {
          const itemStatus = getFulfillmentMeta(item.fulfillment_status);
          const reviewableItem = reviewableItems.get(item.id);
          const existingReview = myReviews.get(item.id);
          const existingReturn = returnsByItemId.get(item.id);

          return (
            <div key={item.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-50">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.product_name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <PackageSearch size={20} className="m-[18px] text-slate-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-800">{item.product_name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {item.shop_name} · SL: {item.quantity}
                  </p>
                  {item.tracking_code && (
                    <p className="mt-1 text-xs text-slate-500">Vận đơn: {item.tracking_code}</p>
                  )}
                  {item.cancel_reason && (
                    <p className="mt-1 text-xs font-medium text-rose-600">
                      Lý do hủy: {item.cancel_reason}
                    </p>
                  )}
                  {existingReturn && (
                    <div className="mt-3 rounded-md bg-slate-50 px-3 py-2">
                      <span
                        className={`inline-flex rounded-md px-2 py-1 text-[11px] font-bold ${returnStatusMeta[existingReturn.status].className}`}
                      >
                        {returnStatusMeta[existingReturn.status].label}
                      </span>
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600">
                        {existingReturn.reason}
                      </p>
                      {existingReturn.seller_response && (
                        <p className="mt-1 text-xs font-semibold text-slate-700">
                          Phản hồi shop: {existingReturn.seller_response}
                        </p>
                      )}
                    </div>
                  )}
                  {existingReview?.seller_reply && (
                    <div className="mt-3 border-l-2 border-blue-500 bg-blue-50 px-3 py-2">
                      <p className="flex items-center gap-1.5 text-xs font-black text-blue-700">
                        <MessageSquareReply size={13} /> Phản hồi từ người bán
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-600">
                        {existingReview.seller_reply}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2 sm:max-w-[15rem] sm:justify-end">
                <span
                  className={`w-fit rounded-md px-2.5 py-1 text-xs font-bold ${itemStatus.badgeClass}`}
                >
                  {itemStatus.label}
                </span>
                {existingReview ? (
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                      <CheckCircle2 size={14} /> Đã đánh giá
                    </span>
                    <button
                      type="button"
                      onClick={() => onEditReview(existingReview)}
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:border-blue-300 hover:text-blue-600"
                      title="Sửa đánh giá"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteReview(existingReview)}
                      disabled={deletingReviewId === existingReview.id}
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-rose-200 text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                      title="Xóa đánh giá"
                    >
                      {deletingReviewId === existingReview.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                    </button>
                  </div>
                ) : reviewableItem ? (
                  <button
                    type="button"
                    onClick={() => onReview(reviewableItem)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-3 text-xs font-black text-amber-700 transition hover:border-amber-400 hover:bg-amber-100"
                  >
                    <Star size={15} /> Đánh giá
                  </button>
                ) : item.fulfillment_status === 'delivered' && reviewsReady ? (
                  <span className="text-xs font-semibold text-slate-400">Chưa thể đánh giá</span>
                ) : null}

                {item.fulfillment_status === 'delivered' && returnsReady && !existingReturn && (
                  <button
                    type="button"
                    onClick={() => onReturn(item)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-md border border-blue-200 px-3 text-xs font-black text-blue-700 transition hover:border-blue-400 hover:bg-blue-50"
                  >
                    <RotateCcw size={15} /> Trả hàng
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={toggleTimeline}
        className="flex h-11 w-full items-center justify-center gap-2 border-t border-slate-100 text-sm font-bold text-slate-600 transition hover:bg-slate-50 hover:text-blue-600"
      >
        <History size={16} /> Hành trình đơn hàng
        <ChevronDown
          size={15}
          className={`transition-transform ${isTimelineOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isTimelineOpen && (
        <div className="bg-slate-50/60">
          {timelineLoading ? (
            <div className="flex items-center justify-center gap-2 border-t border-slate-100 px-5 py-8 text-sm text-slate-500">
              <Loader2 size={18} className="animate-spin text-blue-600" /> Đang tải hành trình...
            </div>
          ) : timelineError ? (
            <p className="border-t border-slate-100 px-5 py-5 text-sm font-semibold text-rose-600">
              {timelineError}
            </p>
          ) : timeline ? (
            <OrderTimeline items={timeline.items} />
          ) : null}
        </div>
      )}
    </motion.article>
  );
}
