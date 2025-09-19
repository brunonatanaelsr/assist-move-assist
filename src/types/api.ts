export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages?: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  total?: number;
  pagination?: Pagination;
}

export type RequestParams = Record<string, string | number | boolean | undefined>;

export interface ApiService {
  get<T = unknown>(url: string, params?: RequestParams): Promise<ApiResponse<T>>;
  post<T = unknown>(url: string, data?: Record<string, unknown>): Promise<ApiResponse<T>>;
  put<T = unknown>(url: string, data?: Record<string, unknown>): Promise<ApiResponse<T>>;
  patch<T = unknown>(url: string, data?: Record<string, unknown>): Promise<ApiResponse<T>>;
  delete<T = unknown>(url: string): Promise<ApiResponse<T>>;
}
