/**
 * Standard API response format
 */

export function success(data, message = 'Success') {
  return {
    success: true,
    message,
    data,
  };
}

export function successWithPagination(data, pagination, message = 'Success') {
  return {
    success: true,
    message,
    data,
    pagination,
  };
}

export function error(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

export function paginate(page = 1, limit = 10, total = 0) {
  const currentPage = Math.max(1, parseInt(page, 10) || 1);
  const perPage = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const totalPages = Math.ceil(total / perPage);
  const offset = (currentPage - 1) * perPage;

  return {
    page: currentPage,
    limit: perPage,
    total,
    total_pages: totalPages,
    offset,
    has_next: currentPage < totalPages,
    has_prev: currentPage > 1,
  };
}
