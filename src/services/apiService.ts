import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  total?: number;
  pagination?: {
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        console.error('Request error:', error);
        return Promise.reject(error);
      }
    );

    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/auth';
        }
        return Promise.reject(error);
      }
    );
  }

  public async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.get<ApiResponse<T>>(url, config);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Erro na requisição'
      };
    }
  }

  public async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.post<ApiResponse<T>>(url, data, config);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Erro na requisição'
      };
    }
  }

  public async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.put<ApiResponse<T>>(url, data, config);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Erro na requisição'
      };
    }
  }

  public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.delete<ApiResponse<T>>(url, config);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Erro na requisição'
      };
    }
  }

  // Métodos específicos
  public async login(email: string, password: string): Promise<ApiResponse<{token: string, user: any}>> {
    return this.post('/auth/login', { email, password });
  }

  public async getCurrentUser(): Promise<ApiResponse<any>> {
    return this.get('/auth/me');
  }

  // Oficinas
  public async getOficinas(params?: any): Promise<ApiResponse<any[]>> {
    return this.get('/oficinas', { params });
  }

  public async createOficina(data: any): Promise<ApiResponse<any>> {
    return this.post('/oficinas', data);
  }

  public async updateOficina(id: string, data: any): Promise<ApiResponse<any>> {
    return this.put(`/oficinas/${id}`, data);
  }

  public async deleteOficina(id: string): Promise<ApiResponse<any>> {
    return this.delete(`/oficinas/${id}`);
  }

  // Beneficiárias
  public async getBeneficiarias(params?: any): Promise<ApiResponse<any[]>> {
    return this.get('/beneficiarias', { params });
  }

  public async getBeneficiaria(id: string | number): Promise<ApiResponse<any>> {
    return this.get(`/beneficiarias/${id}`);
  }

  public async createBeneficiaria(data: any): Promise<ApiResponse<any>> {
    return this.post('/beneficiarias', data);
  }

  public async updateBeneficiaria(id: string, data: any): Promise<ApiResponse<any>> {
    return this.put(`/beneficiarias/${id}`, data);
  }

  public async deleteBeneficiaria(id: string): Promise<ApiResponse<any>> {
    return this.delete(`/beneficiarias/${id}`);
  }

  // Uploads
  public async uploadImage(file: File): Promise<ApiResponse<{ url: string; filename: string }>> {
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await this.api.post('/upload/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Erro no upload da imagem'
      };
    }
  }

  public async healthCheck(): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get('/health');
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Backend não está respondendo'
      };
    }
  }

  // Feed Posts
  public async getFeed(params?: any): Promise<ApiResponse<any[]>> {
    return this.get('/feed', { params });
  }

  public async getFeedPost(id: string | number): Promise<ApiResponse<any>> {
    return this.get(`/feed/${id}`);
  }

  public async createFeedPost(data: any): Promise<ApiResponse<any>> {
    return this.post('/feed', data);
  }

  public async updateFeedPost(id: string | number, data: any): Promise<ApiResponse<any>> {
    return this.put(`/feed/${id}`, data);
  }

  public async deleteFeedPost(id: string | number): Promise<ApiResponse<any>> {
    return this.delete(`/feed/${id}`);
  }

  public async likeFeedPost(id: string | number): Promise<ApiResponse<any>> {
    return this.post(`/feed/${id}/like`, {});
  }
}

export const apiService = new ApiService();
export default apiService;
