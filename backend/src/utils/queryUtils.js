export const queryError = (code, message, statusCode = 400) => {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  error.status = "fail";
  return error;
};

export const parsePagination = (query = {}, { defaultLimit = 20, maxLimit = 100 } = {}) => {
  const page = query.page === undefined || query.page === "" ? 1 : Number(query.page);
  const limit = query.limit === undefined || query.limit === "" ? defaultLimit : Number(query.limit);
  if (!Number.isInteger(page) || page < 1) {
    throw queryError("INVALID_PAGE", "page phải là số nguyên lớn hơn hoặc bằng 1.");
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > maxLimit) {
    throw queryError(
      "INVALID_LIMIT",
      `limit phải là số nguyên từ 1 đến ${maxLimit}.`
    );
  }
  return { page, limit, offset: (page - 1) * limit };
};

export const parseSort = (
  query,
  allowedSorts,
  { defaultSortBy = "created_at", defaultSortOrder = "desc" } = {}
) => {
  const sortBy = String(query.sortBy || defaultSortBy);
  const sortOrder = String(query.sortOrder || defaultSortOrder).toLowerCase();
  if (!Object.prototype.hasOwnProperty.call(allowedSorts, sortBy)) {
    throw queryError("INVALID_SORT_BY", "sortBy không hợp lệ.");
  }
  if (!["asc", "desc"].includes(sortOrder)) {
    throw queryError("INVALID_SORT_ORDER", "sortOrder chỉ nhận asc hoặc desc.");
  }
  return {
    sortBy,
    sortOrder,
    orderSql: `${allowedSorts[sortBy]} ${sortOrder.toUpperCase()}`
  };
};

export const parseSearch = (value, maxLength = 100) => {
  const search = String(value || "").trim();
  if (search.length > maxLength) {
    throw queryError(
      "INVALID_SEARCH",
      `search không được vượt quá ${maxLength} ký tự.`
    );
  }
  return search;
};

export const paginationMeta = (page, limit, total) => ({
  page,
  limit,
  total,
  total_pages: total === 0 ? 0 : Math.ceil(total / limit)
});
