// Frontend API client para comunicação com o backend PostgreSQL
const getApiBaseUrl = () => {
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
};

const API_BASE_URL = getApiBaseUrl();

const apiFetch = async <T = any>(url: string, options: RequestInit = {}): Promise<T> => {
  try {
    // Adicionar token de autenticação do localStorage
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(options.headers || {})
    };

    const response = await fetch(url, { 
      credentials: 'include', 
      ...options,
      headers 
    });
    
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
  } catch (error: any) {
    const message = error?.message || 'Network error';
    throw new Error(message);
  }
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
      });
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  },

  async createBeneficiaria(data: any): Promise<ApiResponse> {
    try {
      return await apiFetch<ApiResponse>(`${API_BASE_URL}/beneficiarias`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  },

  async testConnection(): Promise<ApiResponse> {
    try {
      return await apiFetch<ApiResponse>(`${API_BASE_URL}/test-db`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  },

  // Projetos
  async getProjetos(page = 1, limit = 10): Promise<ApiResponse<any>> {
    try {
      return await apiFetch<ApiResponse<any>>(
        `${API_BASE_URL}/projetos?page=${page}&limit=${limit}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  },

  async createProjeto(data: any): Promise<ApiResponse<any>> {
    try {
      return await apiFetch<ApiResponse<any>>(`${API_BASE_URL}/projetos`, {
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

  async updateProjeto(id: string, data: any): Promise<ApiResponse<any>> {
    try {
      return await apiFetch<ApiResponse<any>>(`${API_BASE_URL}/projetos/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  },

  async deleteProjeto(id: string): Promise<ApiResponse<any>> {
    try {
      return await apiFetch<ApiResponse<any>>(`${API_BASE_URL}/projetos/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  },

  // Oficinas
  async getOficinas(page = 1, limit = 10): Promise<ApiResponse<any>> {
    try {
      return await apiFetch<ApiResponse<any>>(
        `${API_BASE_URL}/oficinas?page=${page}&limit=${limit}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  },

  async createOficina(data: any): Promise<ApiResponse<any>> {
    try {
      return await apiFetch<ApiResponse<any>>(`${API_BASE_URL}/oficinas`, {
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

  async updateOficina(id: string, data: any): Promise<ApiResponse<any>> {
    try {
      return await apiFetch<ApiResponse<any>>(`${API_BASE_URL}/oficinas/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  },

  async deleteOficina(id: string): Promise<ApiResponse<any>> {
    try {
      return await apiFetch<ApiResponse<any>>(`${API_BASE_URL}/oficinas/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  },

  // Atividades
  async getAtividades(beneficiariaId: string): Promise<ApiResponse<any>> {
    try {
      return await apiFetch<ApiResponse<any>>(
        `${API_BASE_URL}/beneficiarias/${beneficiariaId}/atividades`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  },

  async createParticipacao(data: any): Promise<ApiResponse<any>> {
    try {
      return await apiFetch<ApiResponse<any>>(`${API_BASE_URL}/participacoes`, {
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

  async updateParticipacao(id: string, data: any): Promise<ApiResponse<any>> {
    try {
      return await apiFetch<ApiResponse<any>>(`${API_BASE_URL}/participacoes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  },

  // Mensagens
  async getMensagens(page = 1, limit = 20): Promise<ApiResponse<any>> {
    try {
      return await apiFetch<ApiResponse<any>>(
        `${API_BASE_URL}/mensagens?page=${page}&limit=${limit}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  },

  async sendMensagem(data: any): Promise<ApiResponse<any>> {
    try {
      return await apiFetch<ApiResponse<any>>(`${API_BASE_URL}/mensagens`, {
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

  // Auth methods
  auth: {
    async login(credentials: { email: string; password: string }): Promise<LoginResponse> {
      try {
        return await apiFetch<LoginResponse>(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(credentials),
        });
      } catch (error: any) {
        return { success: false, message: error.message };
      }
    },

    async register(userData: { email: string; password: string; nome_completo: string }): Promise<ApiResponse> {
      try {
        return await apiFetch<ApiResponse>(`${API_BASE_URL}/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(userData),
        });
      } catch (error: any) {
        return { success: false, message: error.message };
      }
    },

    async logout(): Promise<void> {
      try {
        await apiFetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
        });
      } catch (error: any) {
        throw new Error(error.message);
      }
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

export { apiFetch };
