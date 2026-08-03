export interface ApiErrorShape {
  message?: string;
  status?: number;
  data?: {
    code?: string;
    message?: string;
  };
}

export const getApiErrorCode = (error: unknown) => (error as ApiErrorShape)?.data?.code || '';

export const getApiErrorMessage = (
  error: unknown,
  fallback = 'Có lỗi xảy ra, vui lòng thử lại.',
) => {
  const apiError = error as ApiErrorShape;
  return apiError?.data?.message || apiError?.message || fallback;
};
