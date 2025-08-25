import axios from 'axios';

// Basic axios instance
const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
});

// Auth interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Error handler
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

// API service
export const apiService = {
  // Basic HTTP methods
  get: async (url: string) => {
    try {
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('GET request error:', error);
      return { success: false, message: 'Erro na requisição GET' };
    }
  },

  post: async (url: string, data: any) => {
    try {
      const response = await api.post(url, data);
      return response.data;
    } catch (error) {
      console.error('POST request error:', error);
      return { success: false, message: 'Erro na requisição POST' };
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
  },

  delete: async (url: string) => {
    try {
      const response = await api.delete(url);
      return response.data;
    } catch (error) {
      console.error('DELETE request error:', error);
      return { success: false, message: 'Erro na requisição DELETE' };
    }
  },

  // Auth methods
  login: async (email: string, password: string) => {
    return apiService.post('/auth/login', { email, password });
  },

  logout: async () => {
    return apiService.post('/auth/logout', {});
  },

  getCurrentUser: async () => {
    return apiService.get('/auth/user');
  },

  // System config methods
  updateSystemConfig: async (id: string, data: any) => {
    return apiService.put(`/configuracoes/sistema/${id}`, data);
  },

  getSystemConfigs: async () => {
    return apiService.get('/configuracoes/sistema');
  },

  // Messages methods
  getMensagensUsuario: async (usuarioId: number) => {
    return apiService.get(`/mensagens/usuario/${usuarioId}`);
  },

  enviarMensagemUsuario: async (data: {
    destinatario_id: number;
    conteudo: string;
    tipo: string;
  }) => {
    return apiService.post('/mensagens/enviar', data);
  },

  // Dashboard methods
  getDashboardStats: async () => {
    return apiService.get('/dashboard/stats');
  },

  getDashboardActivities: async () => {
    return apiService.get('/dashboard/activities');
  },

  getDashboardTasks: async () => {
    return apiService.get('/dashboard/tasks');
  },

  // Beneficiárias methods
  getBeneficiarias: async () => {
    return apiService.get('/beneficiarias');
  },

  // Mensagens methods
  getMensagens: async () => {
    return apiService.get('/mensagens');
  },

  getConversasBeneficiarias: async () => {
    return apiService.get('/mensagens/conversas/beneficiarias');
  },

  getMensagensConversa: async (beneficiariaId: number) => {
    return apiService.get(`/mensagens/conversa/${beneficiariaId}`);
  },

  enviarMensagem: async (data: {
    beneficiaria_id: number;
    conteudo: string;
    tipo: string;
  }) => {
    return apiService.post('/mensagens/enviar', data);
  },

  marcarMensagemLida: async (mensagemId: number, lida: boolean) => {
    return apiService.put(`/mensagens/${mensagemId}/lida`, { lida });
  },

  getConversasUsuario: async () => {
    return apiService.get('/mensagens/conversas/usuario');
  }
};
