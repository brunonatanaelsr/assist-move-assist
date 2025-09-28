import { ApiErrorDetails } from '@/lib/apiError';

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages?: number;
}

export interface NormalizedData<T = unknown> {
  items: T[];
  pagination?: Pagination;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T extends Array<infer U> ? NormalizedData<U> : T extends NormalizedData<any> ? T : T;
  message?: string;
  error?: ApiErrorDetails;
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
