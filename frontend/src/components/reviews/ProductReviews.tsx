import { useCallback, useEffect, useState } from 'react';
import {
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MessageSquareReply,
  Star,
} from 'lucide-react';
import { reviewService } from '../../services/reviewService';
import { ProductReviewsData, ReviewRating, ReviewSort } from '../../types';

interface ProductReviewsProps {
  productId: string;
}

const emptyData: ProductReviewsData = {
  reviews: [],
  summary: {
    average_rating: 0,
    review_count: 0,
    rating_breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  },
  pagination: { page: 1, limit: 10, total: 0, total_pages: 0 },
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(
    new Date(value),
  );

const Stars = ({ rating, size = 15 }: { rating: number; size?: number }) => (
  <div className="flex items-center gap-0.5" aria-label={`${rating} trên 5 sao`}>
    {[1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        size={size}
        className={
          star <= rating ? 'fill-amber-400 text-amber-400' : 'fill-slate-100 text-slate-300'
        }
      />
    ))}
  </div>
);

export default function ProductReviews({ productId }: ProductReviewsProps) {
  const [data, setData] = useState<ProductReviewsData>(emptyData);
  const [ratingFilter, setRatingFilter] = useState<ReviewRating | undefined>();
  const [sort, setSort] = useState<ReviewSort>('newest');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadReviews = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(
        await reviewService.getProductReviews(productId, {
          rating: ratingFilter,
          sort,
          page,
          limit: 10,
        }),
      );
    } catch {
      setError('Không thể tải đánh giá sản phẩm. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [page, productId, ratingFilter, sort]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const summary = data.summary || emptyData.summary;
  const pagination = data.pagination || emptyData.pagination;

  return (
    <section className="max-w-4xl space-y-6">
      <div className="grid gap-6 rounded-lg border border-outline-variant/40 bg-surface-container p-5 md:grid-cols-[190px_1fr]">
        <div className="flex flex-col items-center justify-center border-b border-outline-variant/40 pb-5 text-center md:border-b-0 md:border-r md:pb-0 md:pr-5">
          <strong className="text-5xl font-black text-primary">
            {Number(summary.average_rating || 0).toFixed(1)}
          </strong>
          <div className="mt-2">
            <Stars rating={Math.round(summary.average_rating || 0)} size={18} />
          </div>
          <span className="mt-2 text-xs text-on-surface-variant">
            {summary.review_count || 0} đánh giá
          </span>
        </div>

        <div className="space-y-2">
          {([5, 4, 3, 2, 1] as ReviewRating[]).map((star) => {
            const count = Number(summary.rating_breakdown?.[star] || 0);
            const percent = summary.review_count > 0 ? (count / summary.review_count) * 100 : 0;
            return (
              <button
                type="button"
                key={star}
                onClick={() => {
                  setRatingFilter(ratingFilter === star ? undefined : star);
                  setPage(1);
                }}
                className={`grid w-full grid-cols-[42px_1fr_34px] items-center gap-2 rounded-md px-2 py-1 text-xs transition ${
                  ratingFilter === star
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-surface-container-high'
                }`}
              >
                <span className="flex items-center gap-1 font-bold">
                  {star} <Star size={11} className="fill-amber-400 text-amber-400" />
                </span>
                <span className="h-2 overflow-hidden rounded-full bg-surface-container-high">
                  <span
                    className="block h-full rounded-full bg-amber-400"
                    style={{ width: `${percent}%` }}
                  />
                </span>
                <span className="text-right text-on-surface-variant">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setRatingFilter(undefined);
              setPage(1);
            }}
            className={`h-9 rounded-md px-3 text-sm font-bold transition ${
              ratingFilter === undefined
                ? 'bg-primary text-white'
                : 'border border-outline-variant/60 text-on-surface-variant hover:border-primary/40'
            }`}
          >
            Tất cả
          </button>
          {([5, 4, 3, 2, 1] as ReviewRating[]).map((star) => (
            <button
              type="button"
              key={star}
              onClick={() => {
                setRatingFilter(star);
                setPage(1);
              }}
              className={`inline-flex h-9 items-center gap-1 rounded-md px-3 text-sm font-bold transition ${
                ratingFilter === star
                  ? 'bg-primary text-white'
                  : 'border border-outline-variant/60 text-on-surface-variant hover:border-primary/40'
              }`}
            >
              {star} <Star size={13} className="fill-current" />
            </button>
          ))}
        </div>

        <select
          value={sort}
          onChange={(event) => {
            setSort(event.target.value as ReviewSort);
            setPage(1);
          }}
          className="h-9 rounded-md border border-outline-variant/60 bg-surface px-3 text-sm font-semibold text-on-surface outline-none focus:border-primary"
          aria-label="Sắp xếp đánh giá"
        >
          <option value="newest">Mới nhất</option>
          <option value="oldest">Cũ nhất</option>
          <option value="highest">Điểm cao nhất</option>
          <option value="lowest">Điểm thấp nhất</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-14 text-sm text-on-surface-variant">
          <Loader2 size={20} className="animate-spin text-primary" />
          Đang tải đánh giá...
        </div>
      ) : error ? (
        <div className="rounded-lg border border-error/20 bg-error/5 p-5 text-sm font-semibold text-error">
          {error}
          <button type="button" onClick={loadReviews} className="ml-2 underline">
            Thử lại
          </button>
        </div>
      ) : data.reviews.length === 0 ? (
        <div className="rounded-lg border border-dashed border-outline-variant p-10 text-center">
          <Star size={30} className="mx-auto text-on-surface-variant/40" />
          <p className="mt-3 font-bold text-on-surface">Chưa có đánh giá phù hợp</p>
          <p className="mt-1 text-sm text-on-surface-variant">
            Hãy chọn mức sao khác hoặc quay lại sau.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-outline-variant/40 border-y border-outline-variant/40">
          {data.reviews.map((review) => (
            <article key={review.id} className="py-5">
              <div className="flex items-start gap-3">
                {review.author_avatar_url ? (
                  <img
                    src={review.author_avatar_url}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-black text-primary">
                    {(review.author_name || 'K')[0].toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-bold text-on-surface">{review.author_name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Stars rating={review.rating} />
                        {review.is_verified && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                            <BadgeCheck size={14} /> Đã mua hàng
                          </span>
                        )}
                      </div>
                    </div>
                    <time className="text-xs text-on-surface-variant">
                      {formatDate(review.created_at)}
                    </time>
                  </div>

                  {review.title && (
                    <h3 className="mt-3 font-bold text-on-surface">{review.title}</h3>
                  )}
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-on-surface-variant">
                    {review.body}
                  </p>

                  {review.seller_reply && (
                    <div className="mt-4 border-l-2 border-primary bg-primary/5 px-4 py-3">
                      <p className="flex items-center gap-2 text-xs font-black uppercase text-primary">
                        <MessageSquareReply size={15} /> Phản hồi từ người bán
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-on-surface-variant">
                        {review.seller_reply}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {pagination.total_pages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page <= 1 || loading}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-outline-variant text-on-surface-variant transition hover:border-primary hover:text-primary disabled:opacity-40"
            aria-label="Trang trước"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-semibold text-on-surface-variant">
            Trang {pagination.page} / {pagination.total_pages}
          </span>
          <button
            type="button"
            onClick={() => setPage((current) => Math.min(pagination.total_pages, current + 1))}
            disabled={page >= pagination.total_pages || loading}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-outline-variant text-on-surface-variant transition hover:border-primary hover:text-primary disabled:opacity-40"
            aria-label="Trang sau"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </section>
  );
}
