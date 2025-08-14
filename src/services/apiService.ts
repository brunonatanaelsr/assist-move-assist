/**
 * Serviço de API padronizado
 * Comunicação robusta com o backend PostgreSQL
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

interface ApiResponse<T = any> {
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

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Interceptor para adicionar token em todas as requisições
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('Request error:', error);
        return Promise.reject(error);
      }
    );

    // Interceptor para tratar respostas e erros
    this.api.interceptors.response.use(
      (response: AxiosResponse<ApiResponse>) => {
        console.log(`API Response: ${response.status} - ${response.config.url}`);
        
        // Se a resposta já tem o formato esperado, retorna como está
        if (response.data && typeof response.data.success === 'boolean') {
          return response;
        }
        
        // Para compatibilidade com respostas antigas, wrappa em ApiResponse
        const wrappedResponse: ApiResponse = {
          success: true,
          data: response.data
        };
        
        return {
          ...response,
          data: wrappedResponse
        };
      },
      (error) => {
        console.error('API Error:', error);
        
        // Tratar erro de autenticação
        if (error.response && error.response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/auth';
        }
        
        // Criar resposta de erro padronizada
        const errorResponse: ApiResponse = {
          success: false,
          message: error.response?.data?.message || error.message || 'Erro de comunicação com o servidor'
        };
        
        // Atualizar a resposta de erro
        if (error.response) {
          error.response.data = errorResponse;
        }
        
        return Promise.reject(error);
      }
    );
  }

  // Métodos genéricos para API
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.get<ApiResponse<T>>(url, config);
      return response.data;
    } catch (error: any) {
      if (error.response && error.response.data) {
        return error.response.data;
      }
      return {
        success: false,
        message: error.message || 'Erro na requisição'
      };
    }
  }

  async post<T>(url: string, data: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      console.log('POST Request:', { url, data, baseURL: this.api.defaults.baseURL });
      const response = await this.api.post<ApiResponse<T>>(url, data, config);
      console.log('POST Response Success:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('POST Error:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url
      });
      
      if (error.response && error.response.data) {
        return error.response.data;
      }
      return {
        success: false,
        message: `Erro de rede: ${error.message}` || 'Erro na requisição'
      };
    }
  }

  async put<T>(url: string, data: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.put<ApiResponse<T>>(url, data, config);
      return response.data;
    } catch (error: any) {
      if (error.response && error.response.data) {
        return error.response.data;
      }
      return {
        success: false,
        message: error.message || 'Erro na requisição'
      };
    }
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.delete<ApiResponse<T>>(url, config);
      return response.data;
    } catch (error: any) {
      if (error.response && error.response.data) {
        return error.response.data;
      }
      return {
        success: false,
        message: error.message || 'Erro na requisição'
      };
    }
  }

  // Métodos específicos para autenticação
  async login(email: string, password: string): Promise<ApiResponse<{token: string, user: any}>> {
    console.log('Login attempt:', { email, apiUrl: API_URL });
    const result = await this.post<{token: string, user: any}>('/auth/login', { email, password });
    console.log('Login result:', result);
    return result;
  }

  async getCurrentUser(): Promise<ApiResponse<any>> {
    return this.get('/auth/me');
  }

  // Métodos específicos para oficinas
  async getOficinas(params?: any): Promise<ApiResponse<any[]>> {
    return this.get('/oficinas', { params });
  }

  async createOficina(data: any): Promise<ApiResponse<any>> {
    return this.post('/oficinas', data);
  }

  async updateOficina(id: string, data: any): Promise<ApiResponse<any>> {
    return this.put(`/oficinas/${id}`, data);
  }

  async deleteOficina(id: string): Promise<ApiResponse<any>> {
    return this.delete(`/oficinas/${id}`);
  }

  // Métodos específicos para beneficiárias
  async getBeneficiarias(params?: any): Promise<ApiResponse<any[]>> {
    return this.get('/beneficiarias', { params });
  }

  async createBeneficiaria(data: any): Promise<ApiResponse<any>> {
    return this.post('/beneficiarias', data);
  }

  async updateBeneficiaria(id: string, data: any): Promise<ApiResponse<any>> {
    return this.put(`/beneficiarias/${id}`, data);
  }

  async deleteBeneficiaria(id: string): Promise<ApiResponse<any>> {
    return this.delete(`/beneficiarias/${id}`);
  }

  // Método para testar conectividade
  async healthCheck(): Promise<ApiResponse<any>> {
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
}

export const apiService = new ApiService();
export default apiService;
