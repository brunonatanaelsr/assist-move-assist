export interface ApiResponse<T> {
  data: T;
  message?: string;
  metadata?: any;
}

export interface ApiService {
  get<T>(url: string, params?: any): Promise<ApiResponse<T>>;
  post<T>(url: string, data?: any): Promise<ApiResponse<T>>;
  put<T>(url: string, data?: any): Promise<ApiResponse<T>>;
  patch<T>(url: string, data?: any): Promise<ApiResponse<T>>;
  delete<T>(url: string): Promise<ApiResponse<T>>;
}
