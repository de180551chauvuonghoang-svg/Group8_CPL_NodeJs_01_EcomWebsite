import { FormEvent, useEffect, useState } from 'react';
import { Loader2, Star, X } from 'lucide-react';
import { reviewService } from '../../services/reviewService';
import { MyReview, ProductReview, ReviewRating, ReviewableItem } from '../../types';
import { getReviewErrorMessage } from '../../utils/reviewErrors';

interface ReviewFormModalProps {
  item: ReviewableItem | null;
  existingReview: MyReview | null;
  onClose: () => void;
  onSubmitted: (review: ProductReview) => void;
}

export default function ReviewFormModal({
  item,
  existingReview,
  onClose,
  onSubmitted,
}: ReviewFormModalProps) {
  const [rating, setRating] = useState<ReviewRating | 0>(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!item && !existingReview) return;
    setRating(existingReview?.rating || 0);
    setHoveredRating(0);
    setTitle(existingReview?.title || '');
    setBody(existingReview?.body || '');
    setError('');
  }, [existingReview, item]);

  if (!item && !existingReview) return null;

  const isEditing = Boolean(existingReview);
  const productName = existingReview?.product_name || item?.product_name || 'Sản phẩm';
  const shopName = existingReview?.shop_name || item?.shop_name;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const cleanTitle = title.trim();
    const cleanBody = body.trim();

    if (rating < 1 || rating > 5) {
      setError('Vui lòng chọn số sao đánh giá.');
      return;
    }
    if (cleanTitle.length > 255) {
      setError('Tiêu đề không được vượt quá 255 ký tự.');
      return;
    }
    if (cleanBody.length < 10 || cleanBody.length > 2000) {
      setError('Nội dung đánh giá phải có từ 10 đến 2.000 ký tự.');
      return;
    }
    const selectedRating = rating as ReviewRating;

    setSubmitting(true);
    setError('');
    try {
      const review = existingReview
        ? await reviewService.updateReview(existingReview.id, {
            rating: selectedRating,
            title: cleanTitle,
            body: cleanBody,
          })
        : await reviewService.createReview(item!.product_id, {
            orderItemId: item!.order_item_id,
            rating: selectedRating,
            title: cleanTitle || undefined,
            body: cleanBody,
          });
      onSubmitted(review);
    } catch (requestError) {
      setError(
        getReviewErrorMessage(
          requestError,
          isEditing
            ? 'Không thể cập nhật đánh giá. Vui lòng thử lại.'
            : 'Không thể gửi đánh giá. Vui lòng thử lại.',
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-dialog-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg overflow-hidden rounded-lg bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase text-blue-600">
              {isEditing ? 'Chỉnh sửa đánh giá' : 'Đánh giá sản phẩm'}
            </p>
            <h2 id="review-dialog-title" className="mt-1 text-xl font-black text-slate-900">
              {productName}
            </h2>
            {shopName && <p className="mt-1 text-sm text-slate-500">{shopName}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
            aria-label="Đóng"
          >
            <X size={19} />
          </button>
        </header>

        <div className="space-y-5 px-6 py-5">
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">Mức độ hài lòng</label>
            <div className="flex gap-1" onMouseLeave={() => setHoveredRating(0)}>
              {([1, 2, 3, 4, 5] as ReviewRating[]).map((value) => {
                const active = value <= (hoveredRating || rating);
                return (
                  <button
                    key={value}
                    type="button"
                    onMouseEnter={() => setHoveredRating(value)}
                    onClick={() => setRating(value)}
                    className="flex h-11 w-11 items-center justify-center rounded-md transition hover:bg-amber-50"
                    aria-label={`${value} sao`}
                  >
                    <Star
                      size={28}
                      className={active ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700">
              Tiêu đề <span className="font-normal text-slate-400">(không bắt buộc)</span>
            </span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={255}
              placeholder="Tóm tắt trải nghiệm của bạn"
              className="h-11 w-full rounded-md border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700">Nội dung đánh giá</span>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              minLength={10}
              maxLength={2000}
              rows={5}
              placeholder="Chia sẻ chất lượng sản phẩm, đóng gói và trải nghiệm sử dụng..."
              className="w-full resize-none rounded-md border border-slate-200 p-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <span className="mt-1 block text-right text-xs text-slate-400">
              {body.trim().length}/2.000
            </span>
          </label>

          {error && (
            <p className="rounded-md bg-rose-50 px-3 py-2.5 text-sm font-semibold text-rose-700">
              {error}
            </p>
          )}
        </div>

        <footer className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="h-10 rounded-md border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition hover:border-slate-300 disabled:opacity-50"
          >
            {isEditing ? 'Hủy' : 'Để sau'}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-10 min-w-32 items-center justify-center gap-2 rounded-md bg-blue-600 px-5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {submitting
              ? isEditing
                ? 'Đang lưu...'
                : 'Đang gửi...'
              : isEditing
                ? 'Lưu thay đổi'
                : 'Gửi đánh giá'}
          </button>
        </footer>
      </form>
    </div>
  );
}
