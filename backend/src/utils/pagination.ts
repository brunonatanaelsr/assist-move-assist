export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export function calculatePagination(params: PaginationParams = {}): Required<PaginationParams> {
  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, Math.min(100, params.limit || 10));
  const offset = params.offset || (page - 1) * limit;

  return { page, limit, offset };
}

export function createPaginatedResponse<T>(
  items: T[],
  total: number,
  params: PaginationParams
): PaginatedResponse<T> {
  const { page, limit } = calculatePagination(params);
  const totalPages = Math.ceil(total / limit);

  return {
    items,
    total,
    page,
    totalPages,
    hasNext: page < totalPages,
    hasPrevious: page > 1
  };
}
