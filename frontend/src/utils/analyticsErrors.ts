const ANALYTICS_ERROR_MESSAGES: Record<string, string> = {
  INVALID_ANALYTICS_PERIOD: 'Kỳ thống kê không hợp lệ.',
  INVALID_ANALYTICS_DATE: 'Ngày thống kê không hợp lệ.',
  ANALYTICS_DATE_RANGE_REQUIRED: 'Vui lòng chọn đầy đủ ngày bắt đầu và ngày kết thúc.',
  INVALID_ANALYTICS_RANGE: 'Ngày bắt đầu không được sau ngày kết thúc.',
  ANALYTICS_RANGE_TOO_LARGE: 'Khoảng thống kê vượt quá giới hạn cho kỳ đã chọn.',
  SELLER_NOT_FOUND: 'Không tìm thấy thông tin cửa hàng.',
};

export const getAnalyticsErrorMessage = (error: unknown, fallback: string) => {
  if (!error || typeof error !== 'object') return fallback;

  const requestError = error as {
    message?: string;
    data?: { code?: string; message?: string };
    response?: { data?: { code?: string; message?: string } };
  };
  const data = requestError.data || requestError.response?.data;

  if (data?.code && ANALYTICS_ERROR_MESSAGES[data.code]) {
    return ANALYTICS_ERROR_MESSAGES[data.code];
  }
  return data?.message || requestError.message || fallback;
};
