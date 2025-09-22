export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
  metadata?: Record<string, unknown>;
}

export interface RequestParams {
  [key: string]: string | number | boolean | undefined;
}

export interface ApiService {
  get<T = unknown>(url: string, params?: RequestParams): Promise<ApiResponse<T>>;
  post<T = unknown>(url: string, data?: Record<string, unknown>): Promise<ApiResponse<T>>;
  put<T = unknown>(url: string, data?: Record<string, unknown>): Promise<ApiResponse<T>>;
  patch<T = unknown>(url: string, data?: Record<string, unknown>): Promise<ApiResponse<T>>;
  delete<T = unknown>(url: string): Promise<ApiResponse<T>>;
}
