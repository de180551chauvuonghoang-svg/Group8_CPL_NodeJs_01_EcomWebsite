const reviewErrorMessages: Record<string, string> = {
  ORDER_ITEM_REQUIRED: 'Không tìm thấy sản phẩm trong đơn hàng.',
  RATING_REQUIRED: 'Vui lòng chọn số sao đánh giá.',
  INVALID_RATING: 'Số sao đánh giá phải từ 1 đến 5.',
  REVIEW_BODY_REQUIRED: 'Vui lòng nhập nội dung đánh giá.',
  INVALID_REVIEW_BODY: 'Nội dung đánh giá phải có từ 10 đến 2.000 ký tự.',
  REVIEW_PURCHASE_NOT_FOUND: 'Không tìm thấy giao dịch mua sản phẩm này.',
  OWN_SHOP_REVIEW_NOT_ALLOWED: 'Bạn không thể đánh giá sản phẩm của cửa hàng mình.',
  ORDER_ITEM_NOT_DELIVERED: 'Chỉ có thể đánh giá sản phẩm đã giao thành công.',
  REVIEW_ALREADY_EXISTS: 'Sản phẩm trong đơn hàng này đã được đánh giá.',
  REVIEW_NOT_FOUND: 'Không tìm thấy đánh giá hoặc bạn không có quyền thao tác.',
  SELLER_REPLY_REQUIRED: 'Vui lòng nhập nội dung phản hồi.',
  INVALID_SELLER_REPLY: 'Nội dung phản hồi không hợp lệ.',
};

interface ApiErrorShape {
  message?: string;
  data?: {
    code?: string;
    message?: string;
  };
}

export const getReviewErrorMessage = (error: unknown, fallback: string) => {
  const apiError = error as ApiErrorShape;
  const code = apiError?.data?.code;

  if (code && reviewErrorMessages[code]) {
    return reviewErrorMessages[code];
  }

  return apiError?.data?.message || apiError?.message || fallback;
};
