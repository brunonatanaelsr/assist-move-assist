import axios from 'axios';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
}

export const apiService = {
  get: async (url: string): Promise<ApiResponse> => {
    try {
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('GET request error:', error);
      return { success: false, message: 'Erro na requisição GET' };
    }
  },

  put: async (url: string, data: any): Promise<ApiResponse> => {
    try {
      const response = await api.put(url, data);
      return response.data;
    } catch (error) {
      console.error('PUT request error:', error);
      return { success: false, message: 'Erro na requisição PUT' };
    }
  }
};

import axios from 'axios';

// Create API instance
const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
});

// Add auth interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Handle auth errors
api.interceptors.response.use((response) => response, (error) => {
  if (error.response?.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }
  return Promise.reject(error);
});

// Export API service
export const apiService = {
  get: async (url: string) => {
    try {
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('GET request error:', error);
      return { success: false, message: 'Erro na requisição GET' };
    }
  },
  put: async (url: string, data: any) => {
    try {
      const response = await api.put(url, data);
      return response.data;
    } catch (error) {
      console.error('PUT request error:', error);
      return { success: false, message: 'Erro na requisição PUT' };
    }
  }
};

api.interceptors.request.use(
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

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const apiService = {
  async get<T>(url: string, config = {}) {
    try {
      const response = await api.get<ApiResponse<T>>(url, config);
      return response.data;
    } catch (error) {
      console.error('GET request error:', error);
      return { success: false, message: 'Erro na requisição GET' };
    }
  },

  async put<T>(url: string, data = {}, config = {}) {
    try {
      const response = await api.put<ApiResponse<T>>(url, data, config);
      return response.data;
    } catch (error) {
      console.error('PUT request error:', error);
      return { success: false, message: 'Erro na requisição PUT' };
    }
  },

  async post<T>(url: string, data = {}, config = {}) {
    try {
      const response = await api.post<ApiResponse<T>>(url, data, config);
      return response.data;
    } catch (error) {
      console.error('POST request error:', error);
      return { success: false, message: 'Erro na requisição POST' };
    }
  },

  async delete<T>(url: string, config = {}) {
    try {
      const response = await api.delete<ApiResponse<T>>(url, config);
      return response.data;
    } catch (error) {
      console.error('DELETE request error:', error);
      return { success: false, message: 'Erro na requisição DELETE' };
    }
  }
};

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
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  public get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.api.get<ApiResponse<T>>(url, config)
      .then(response => response.data)
      .catch(error => {
        console.error('GET request error:', error);
        return { success: false, message: 'Erro na requisição GET' };
      });
  }

  public put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.api.put<ApiResponse<T>>(url, data, config)
      .then(response => response.data)
      .catch(error => {
        console.error('PUT request error:', error);
        return { success: false, message: 'Erro na requisição PUT' };
      });
  }

  public post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.api.post<ApiResponse<T>>(url, data, config)
      .then(response => response.data)
      .catch(error => {
        console.error('POST request error:', error);
        return { success: false, message: 'Erro na requisição POST' };
      });
  }

  public delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.api.delete<ApiResponse<T>>(url, config)
      .then(response => response.data)
      .catch(error => {
        console.error('DELETE request error:', error);
        return { success: false, message: 'Erro na requisição DELETE' };
      });
  }
}

export const apiService = new ApiService();

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
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  public get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.api.get<ApiResponse<T>>(url, config)
      .then(response => response.data)
      .catch(error => {
        console.error('GET request error:', error);
        return { success: false, message: 'Erro na requisição GET' };
      });
  }

  public put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.api.put<ApiResponse<T>>(url, data, config)
      .then(response => response.data)
      .catch(error => {
        console.error('PUT request error:', error);
        return { success: false, message: 'Erro na requisição PUT' };
      });
  }

  public post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.api.post<ApiResponse<T>>(url, data, config)
      .then(response => response.data)
      .catch(error => {
        console.error('POST request error:', error);
        return { success: false, message: 'Erro na requisição POST' };
      });
  }

  public delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.api.delete<ApiResponse<T>>(url, config)
      .then(response => response.data)
      .catch(error => {
        console.error('DELETE request error:', error);
        return { success: false, message: 'Erro na requisição DELETE' };
      });
  }
}

export const apiService = new ApiService();

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

    // Interceptor para adicionar token em todas as requisições
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
  }

  // Métodos HTTP públicos
  public async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.get<ApiResponse<T>>(url, config);
      return response.data;
    } catch (error) {
      console.error('GET request error:', error);
      return { success: false, message: 'Erro na requisição GET' };
    }
  }

  public async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.put<ApiResponse<T>>(url, data, config);
      return response.data;
    } catch (error) {
      console.error('PUT request error:', error);
      return { success: false, message: 'Erro na requisição PUT' };
    }
  }

  public async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.post<ApiResponse<T>>(url, data, config);
      return response.data;
    } catch (error) {
      console.error('POST request error:', error);
      return { success: false, message: 'Erro na requisição POST' };
    }
  }

  public async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.delete<ApiResponse<T>>(url, config);
      return response.data;
    } catch (error) {
      console.error('DELETE request error:', error);
      return { success: false, message: 'Erro na requisição DELETE' };
    }
  }
  }

  // Métodos HTTP públicos
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.get<ApiResponse<T>>(url, config);
      return response.data;
    } catch (error) {
      console.error('GET request error:', error);
      return { success: false, message: 'Erro na requisição GET' };
    }
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.put<ApiResponse<T>>(url, data, config);
      return response.data;
    } catch (error) {
      console.error('PUT request error:', error);
      return { success: false, message: 'Erro na requisição PUT' };
    }
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.post<ApiResponse<T>>(url, data, config);
      return response.data;
    } catch (error) {
      console.error('POST request error:', error);
      return { success: false, message: 'Erro na requisição POST' };
    }
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.delete<ApiResponse<T>>(url, config);
      return response.data;
    } catch (error) {
      console.error('DELETE request error:', error);
      return { success: false, message: 'Erro na requisição DELETE' };
    }
  }

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

  private async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    const response = await this.api.put(endpoint, data);
    return response.data;
  }

  private async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    const response = await this.api.patch(endpoint, data);
    return response.data;
  }

  private async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    const response = await this.api.delete(endpoint);
    return response.data;
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

  async getBeneficiaria(id: string | number): Promise<ApiResponse<any>> {
    return this.get(`/beneficiarias/${id}`);
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

  // Dashboard methods
  async getDashboardStats(): Promise<ApiResponse<any>> {
    return this.get('/dashboard/stats');
  }

  async getDashboardActivities(): Promise<ApiResponse<any[]>> {
    return this.get('/dashboard/activities');
  }

  async getDashboardTasks(): Promise<ApiResponse<any[]>> {
    return this.get('/dashboard/tasks');
  }

  // Métodos específicos para projetos
  async getProjetos(): Promise<ApiResponse<any[]>> {
    return this.get('/projetos');
  }

  async getProjetoById(id: number): Promise<ApiResponse<any>> {
    return this.get(`/projetos/${id}`);
  }

  async getParticipacoesPorProjeto(projetoId: number): Promise<ApiResponse<any[]>> {
    return this.get(`/participacoes/projeto/${projetoId}`);
  }

  async createProjeto(data: any): Promise<ApiResponse<any>> {
    return this.post('/projetos', data);
  }

  async updateProjeto(id: string, data: any): Promise<ApiResponse<any>> {
    return this.put(`/projetos/${id}`, data);
  }

  async deleteProjeto(id: string): Promise<ApiResponse<any>> {
    return this.delete(`/projetos/${id}`);
  }

  // Métodos específicos para participações
  async getParticipacoes(params?: any): Promise<ApiResponse<any[]>> {
    return this.get('/participacoes', { params });
  }

  async createParticipacao(data: any): Promise<ApiResponse<any>> {
    return this.post('/participacoes', data);
  }

  async updateParticipacao(id: string, data: any): Promise<ApiResponse<any>> {
    return this.put(`/participacoes/${id}`, data);
  }

  async deleteParticipacao(id: string): Promise<ApiResponse<any>> {
    return this.delete(`/participacoes/${id}`);
  }

  // Mensagens
  async getMensagens(): Promise<ApiResponse<any[]>> {
    return this.get('/mensagens');
  }

  async getMensagemById(id: number): Promise<ApiResponse<any>> {
    return this.get(`/mensagens/${id}`);
  }

  async enviarMensagem(data: any): Promise<ApiResponse<any>> {
    return this.post('/mensagens', data);
  }

  async marcarMensagemLida(id: number, lida: boolean): Promise<ApiResponse<any>> {
    return this.patch(`/mensagens/${id}/lida`, { lida });
  }

  async getConversasBeneficiarias(): Promise<ApiResponse<any[]>> {
    return this.get('/mensagens/conversas/beneficiarias');
  }

  async getMensagensConversa(beneficiariaId: number): Promise<ApiResponse<any[]>> {
    return this.get(`/mensagens/conversas/beneficiaria/${beneficiariaId}`);
  }

  async deleteMensagem(id: number): Promise<ApiResponse<any>> {
    return this.delete(`/mensagens/${id}`);
  }

  async sendMensagem(data: any): Promise<ApiResponse<any>> {
    return this.post('/mensagens', data);
  }

  // ====== NOVOS MÉTODOS PARA CONVERSAS ENTRE USUÁRIOS ======
  
  // Listar usuários disponíveis para conversa
  async getUsuariosConversa(): Promise<ApiResponse<any[]>> {
    return this.get('/mensagens/usuarios');
  }

  // Listar conversas do usuário logado
  async getConversasUsuario(): Promise<ApiResponse<any[]>> {
    return this.get('/mensagens/conversas');
  }

  // Obter mensagens de uma conversa específica com outro usuário
  async getMensagensUsuario(usuarioId: number, params?: any): Promise<ApiResponse<any[]>> {
    return this.get(`/mensagens/conversa/${usuarioId}`, { params });
  }

  // Enviar mensagem direta para outro usuário
  async enviarMensagemUsuario(data: {
    destinatario_id: number;
    conteudo: string;
    tipo?: string;
    prioridade?: string;
  }): Promise<ApiResponse<any>> {
    return this.post('/mensagens/enviar', data);
  }

  // Métodos específicos para feed
  async getFeed(params?: any): Promise<ApiResponse<any[]>> {
    return this.get('/feed', { params });
  }

  async getFeedPost(id: string | number): Promise<ApiResponse<any>> {
    return this.get(`/feed/${id}`);
  }

  async createFeedPost(data: any): Promise<ApiResponse<any>> {
    return this.post('/feed', data);
  }

  async updateFeedPost(id: string | number, data: any): Promise<ApiResponse<any>> {
    return this.put(`/feed/${id}`, data);
  }

  async deleteFeedPost(id: string | number): Promise<ApiResponse<any>> {
    return this.delete(`/feed/${id}`);
  }

  async likeFeedPost(id: string | number): Promise<ApiResponse<any>> {
    return this.post(`/feed/${id}/curtir`, {});
  }

  async shareFeedPost(id: string | number): Promise<ApiResponse<any>> {
    return this.post(`/feed/${id}/compartilhar`, {});
  }

  async getFeedStats(): Promise<ApiResponse<any>> {
    return this.get('/feed/stats/summary');
  }

  // Métodos específicos para relatórios
  async getRelatorios(params?: any): Promise<ApiResponse<any[]>> {
    return this.get('/relatorios', { params });
  }

  async generateRelatorio(data: any): Promise<ApiResponse<any>> {
    return this.post('/relatorios', data);
  }

  // Métodos específicos para documentos
  async getDocumentos(params?: any): Promise<ApiResponse<any[]>> {
    return this.get('/documentos', { params });
  }

  async uploadDocumento(data: FormData): Promise<ApiResponse<any>> {
    return this.post('/documentos', data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }

  async deleteDocumento(id: string): Promise<ApiResponse<any>> {
    return this.delete(`/documentos/${id}`);
  }

  // Métodos específicos para auditoria
  async getAuditoria(params?: any): Promise<ApiResponse<any[]>> {
    return this.get('/auditoria', { params });
  }

  // Métodos específicos para configurações
  async getConfiguracoes(): Promise<ApiResponse<any>> {
    return this.get('/configuracoes');
  }

  async updateConfiguracoes(data: any): Promise<ApiResponse<any>> {
    return this.put('/configuracoes', data);
  }

  // Métodos específicos para declarações
  async getDeclaracoes(params?: any): Promise<ApiResponse<any[]>> {
    return this.get('/declaracoes', { params });
  }

  async generateDeclaracao(data: any): Promise<ApiResponse<any>> {
    return this.post('/declaracoes', data);
  }

  // ====== MÉTODOS DE COMENTÁRIOS ======
  
  // Listar comentários de um post
  async getCommentsByPostId(postId: number, params?: any): Promise<ApiResponse<any[]>> {
    return this.get(`/feed/${postId}/comentarios`, { params });
  }

  // Criar novo comentário
  async createComment(postId: number, data: { conteudo: string }): Promise<ApiResponse<any>> {
    return this.post(`/feed/${postId}/comentarios`, data);
  }

  // Atualizar comentário
  async updateComment(comentarioId: number, data: { conteudo: string }): Promise<ApiResponse<any>> {
    return this.put(`/feed/comentarios/${comentarioId}`, data);
  }

  // Remover comentário
  async deleteComment(comentarioId: number): Promise<ApiResponse<any>> {
    return this.delete(`/feed/comentarios/${comentarioId}`);
  }

  // Upload de imagem para posts
  async uploadImage(file: File): Promise<ApiResponse<{ url: string; filename: string }>> {
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await this.api.post('/feed/upload-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return {
        success: true,
        data: response.data.data
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Erro no upload da imagem'
      };
    }
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
