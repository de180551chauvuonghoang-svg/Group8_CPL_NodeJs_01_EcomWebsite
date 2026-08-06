import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BadgeCheck, Loader2, MessageSquareReply, Send, Star } from 'lucide-react';
import SellerPageHeader from '../components/seller/SellerPageHeader';
import SellerPagination from '../components/seller/SellerPagination';
import SellerStatePanel from '../components/seller/SellerStatePanel';
import { reviewService } from '../services/reviewService';
import { ReviewRating, SellerReview, SellerReviewsData } from '../types';
import { getReviewErrorMessage } from '../utils/reviewErrors';

type RepliedFilter = 'all' | 'replied' | 'unreplied';

const emptyResult: SellerReviewsData = {
  reviews: [],
  pagination: { page: 1, limit: 10, total: 0, total_pages: 0 },
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));

function SellerReviewRow({ review, onReplied }: { review: SellerReview; onReplied: () => void }) {
  const [reply, setReply] = useState(review.seller_reply || '');
  const [editing, setEditing] = useState(!review.seller_reply);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submitReply = async (event: FormEvent) => {
    event.preventDefault();
    const cleanReply = reply.trim();
    if (!cleanReply) {
      setError('Vui lòng nhập nội dung phản hồi.');
      return;
    }
    if (cleanReply.length > 2000) {
      setError('Nội dung phản hồi không được vượt quá 2.000 ký tự.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await reviewService.replyToReview(review.id, cleanReply);
      setEditing(false);
      onReplied();
    } catch (requestError) {
      setError(getReviewErrorMessage(requestError, 'Không thể gửi phản hồi. Vui lòng thử lại.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <article className="border-b border-outline-variant/40 px-5 py-5 last:border-b-0 md:px-6">
      <div className="flex flex-col gap-5 lg:flex-row">
        <div className="flex min-w-0 flex-1 gap-3">
          {review.product_image_url ? (
            <img
              src={review.product_image_url}
              alt={review.product_name}
              className="h-16 w-16 shrink-0 rounded-md bg-surface-container object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-surface-container text-primary">
              <Star size={23} />
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate font-black text-on-surface">{review.product_name}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={15}
                    className={
                      star <= review.rating
                        ? 'fill-amber-400 text-amber-400'
                        : 'fill-surface-container text-outline'
                    }
                  />
                ))}
              </div>
              {review.is_verified && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                  <BadgeCheck size={14} /> Đã mua hàng
                </span>
              )}
            </div>
            <p className="mt-2 text-xs text-on-surface-variant">
              {review.customer_name} · {formatDate(review.created_at)}
            </p>
            {review.title && <h3 className="mt-3 font-bold text-on-surface">{review.title}</h3>}
            <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-on-surface-variant">
              {review.body}
            </p>
          </div>
        </div>

        <div className="w-full border-t border-outline-variant/40 pt-4 lg:w-[390px] lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-black text-on-surface">
              <MessageSquareReply size={17} className="text-primary" /> Phản hồi của shop
            </p>
            {review.seller_reply && !editing && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-xs font-bold text-primary hover:underline"
              >
                Chỉnh sửa
              </button>
            )}
          </div>

          {review.seller_reply && !editing ? (
            <div className="border-l-2 border-primary bg-primary/5 px-3 py-2.5">
              <p className="whitespace-pre-wrap text-sm leading-6 text-on-surface-variant">
                {review.seller_reply}
              </p>
              {review.replied_at && (
                <p className="mt-2 text-xs text-on-surface-variant/70">
                  {formatDate(review.replied_at)}
                </p>
              )}
            </div>
          ) : (
            <form onSubmit={submitReply}>
              <textarea
                value={reply}
                onChange={(event) => {
                  setReply(event.target.value);
                  setError('');
                }}
                rows={4}
                maxLength={2000}
                placeholder="Cảm ơn khách hàng và giải đáp phản hồi..."
                className="w-full resize-none rounded-md border border-outline-variant bg-surface px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="text-xs text-on-surface-variant">{reply.trim().length}/2.000</span>
                <div className="flex gap-2">
                  {review.seller_reply && (
                    <button
                      type="button"
                      onClick={() => {
                        setReply(review.seller_reply || '');
                        setEditing(false);
                        setError('');
                      }}
                      className="h-9 rounded-md border border-outline-variant px-3 text-xs font-bold text-on-surface-variant"
                    >
                      Hủy
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-60"
                  >
                    {submitting ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Send size={14} />
                    )}
                    {review.seller_reply ? 'Lưu phản hồi' : 'Gửi phản hồi'}
                  </button>
                </div>
              </div>
              {error && <p className="mt-2 text-xs font-semibold text-error">{error}</p>}
            </form>
          )}
        </div>
      </div>
    </article>
  );
}

export default function SellerReviews() {
  const [searchParams, setSearchParams] = useSearchParams();
  const repliedParam = searchParams.get('replied');
  const [data, setData] = useState<SellerReviewsData>(emptyResult);
  const [rating, setRating] = useState<ReviewRating | undefined>();
  const [replied, setReplied] = useState<RepliedFilter>(
    repliedParam === 'false' ? 'unreplied' : repliedParam === 'true' ? 'replied' : 'all',
  );
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadReviews = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(
        await reviewService.getSellerReviews({
          rating,
          replied: replied === 'all' ? undefined : replied === 'replied',
          page,
          limit: 10,
        }),
      );
    } catch (requestError) {
      setError(
        getReviewErrorMessage(requestError, 'Không thể tải đánh giá của shop. Vui lòng thử lại.'),
      );
    } finally {
      setLoading(false);
    }
  }, [page, rating, replied]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const pagination = data.pagination || emptyResult.pagination;

  return (
    <main className="mx-auto w-full max-w-[1500px] px-4 py-7 md:px-8">
      <SellerPageHeader
        icon={Star}
        eyebrow="Chăm sóc khách hàng"
        title="Đánh giá sản phẩm"
        description="Theo dõi trải nghiệm mua hàng và phản hồi bằng tài khoản shop."
        actions={
          <div className="flex flex-wrap gap-2">
            <select
              value={rating || ''}
              onChange={(event) => {
                const nextRating = event.target.value
                  ? (Number(event.target.value) as ReviewRating)
                  : undefined;
                setRating(nextRating);
                setPage(1);
                const next = new URLSearchParams(searchParams);
                if (nextRating) next.set('rating', String(nextRating));
                else next.delete('rating');
                setSearchParams(next, { replace: true });
              }}
              className="h-10 rounded-md border border-outline-variant bg-surface-container-lowest px-3 text-sm font-semibold outline-none focus:border-primary"
              aria-label="Lọc số sao"
            >
              <option value="">Tất cả số sao</option>
              {[5, 4, 3, 2, 1].map((value) => (
                <option key={value} value={value}>
                  {value} sao
                </option>
              ))}
            </select>
            <select
              value={replied}
              onChange={(event) => {
                const nextReplied = event.target.value as RepliedFilter;
                setReplied(nextReplied);
                setPage(1);
                const next = new URLSearchParams(searchParams);
                if (nextReplied === 'all') next.delete('replied');
                else next.set('replied', nextReplied === 'replied' ? 'true' : 'false');
                setSearchParams(next, { replace: true });
              }}
              className="h-10 rounded-md border border-outline-variant bg-surface-container-lowest px-3 text-sm font-semibold outline-none focus:border-primary"
              aria-label="Lọc trạng thái phản hồi"
            >
              <option value="all">Tất cả phản hồi</option>
              <option value="unreplied">Chưa phản hồi</option>
              <option value="replied">Đã phản hồi</option>
            </select>
          </div>
        }
      />

      <section className="overflow-hidden rounded-lg border border-outline-variant/40 bg-surface-container-lowest">
        <div className="border-b border-outline-variant/40 px-5 py-4 md:px-6">
          <p className="font-black text-on-surface">Danh sách đánh giá</p>
          <p className="mt-0.5 text-xs text-on-surface-variant">{pagination.total} đánh giá</p>
        </div>

        {loading ? (
          <SellerStatePanel state="loading" title="Đang tải đánh giá" />
        ) : error ? (
          <SellerStatePanel
            state="error"
            description={error}
            actionLabel="Thử lại"
            onAction={() => void loadReviews()}
          />
        ) : data.reviews.length === 0 ? (
          <SellerStatePanel
            state="empty"
            icon={MessageSquareReply}
            title="Chưa có đánh giá phù hợp"
            description="Đánh giá mới của sản phẩm trong shop sẽ xuất hiện tại đây."
          />
        ) : (
          data.reviews.map((review) => (
            <SellerReviewRow key={review.id} review={review} onReplied={loadReviews} />
          ))
        )}
      </section>

      {pagination.total_pages > 1 && (
        <div className="mt-5 overflow-hidden rounded-lg border border-outline-variant/40 bg-surface-container-lowest">
          <SellerPagination
            page={pagination.page}
            totalPages={pagination.total_pages}
            total={pagination.total}
            label="đánh giá"
            loading={loading}
            onPageChange={setPage}
          />
        </div>
      )}
    </main>
  );
}
