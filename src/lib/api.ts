// Minimal frontend API client for production-ready routes
const getApiBaseUrl = () => {
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
};

const API_BASE_URL = getApiBaseUrl();

const apiFetch = async <T = any>(url: string, options: RequestInit = {}): Promise<T> => {
  const response = await fetch(url, { credentials: 'include', ...options });
  let data: any = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  if (!response.ok) {
    const message = data?.message || data?.error || response.statusText;
    throw new Error(message);
  }
  return data as T;
};

interface LoginResponse {
  success: boolean;
  user?: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
  message?: string;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export const api = {
  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      return await apiFetch<LoginResponse>(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  },

  async getBeneficiarias(): Promise<ApiResponse> {
    try {
      return await apiFetch<ApiResponse>(`${API_BASE_URL}/beneficiarias`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  },

  async createBeneficiaria(data: any): Promise<ApiResponse> {
    try {
      return await apiFetch<ApiResponse>(`${API_BASE_URL}/beneficiarias`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  },

  auth: {
    async logout(): Promise<void> {
      await apiFetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
      });
    },

    async getProfile(): Promise<ApiResponse> {
      try {
        return await apiFetch<ApiResponse>(`${API_BASE_URL}/auth/profile`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
      } catch (error: any) {
        return { success: false, message: error.message };
      }
    }
  }
};

export type { LoginResponse, ApiResponse };
