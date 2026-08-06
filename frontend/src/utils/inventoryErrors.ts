const INVENTORY_ERROR_MESSAGES: Record<string, string> = {
  VARIANT_ID_REQUIRED: 'Vui lòng chọn phiên bản sản phẩm.',
  VARIANT_NOT_FOUND: 'Không tìm thấy phiên bản sản phẩm thuộc cửa hàng.',
  INVALID_CHANGE_QUANTITY: 'Số lượng điều chỉnh phải là số nguyên khác 0.',
  INVENTORY_REASON_REQUIRED: 'Vui lòng nhập lý do điều chỉnh tồn kho.',
  INVALID_INVENTORY_REASON: 'Lý do phải có từ 3 đến 255 ký tự.',
  INVALID_SELLER_INVENTORY_TYPE: 'Chỉ có thể nhập kho hoặc điều chỉnh thủ công.',
  INVALID_RESTOCK_QUANTITY: 'Số lượng nhập kho phải lớn hơn 0.',
  INSUFFICIENT_STOCK: 'Điều chỉnh này sẽ làm tồn kho nhỏ hơn 0.',
  INVALID_LOW_STOCK_THRESHOLD: 'Ngưỡng cảnh báo phải là số nguyên từ 0 đến 1.000.000.',
  INVALID_INVENTORY_TYPE: 'Loại lịch sử tồn kho không hợp lệ.',
  INVALID_DATE_FILTER: 'Ngày lọc phải đúng định dạng YYYY-MM-DD.',
  INVALID_DATE_RANGE: 'Ngày bắt đầu không được sau ngày kết thúc.',
  INVALID_PAGINATION: 'Thông tin phân trang không hợp lệ.',
};

export const getInventoryErrorMessage = (error: unknown, fallback: string) => {
  if (!error || typeof error !== 'object') return fallback;
  const requestError = error as {
    message?: string;
    data?: { code?: string; message?: string };
    response?: { data?: { code?: string; message?: string } };
  };
  const data = requestError.data || requestError.response?.data;
  if (data?.code && INVENTORY_ERROR_MESSAGES[data.code]) {
    return INVENTORY_ERROR_MESSAGES[data.code];
  }
  return data?.message || requestError.message || fallback;
};
