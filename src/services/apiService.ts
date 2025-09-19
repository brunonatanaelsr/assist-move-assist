/**
 * Serviço de API padronizado
 * Comunicação robusta com o backend PostgreSQL
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import type { Beneficiaria, BeneficiariaFiltros } from '../../backend/src/types/beneficiarias';
import type { Oficina } from '../../backend/src/types/oficina';
import type { AuthResponse, AuthenticatedSessionUser } from '../../backend/src/types/auth';
import { translateErrorMessage } from '@/lib/apiError';
import { API_URL } from '@/config';
import type { DashboardStatsResponse } from '@/types/dashboard';
import type { ApiResponse, Pagination } from '@/types/api';
import type {
  ConfiguracaoUsuario,
  CreateUsuarioPayload,
  PaginatedCollection,
  PermissionSummary,
  ResetPasswordPayload,
  UpdateUsuarioPayload,
  UsuarioPermissions,
} from '@/types/configuracoes';
const IS_DEV = (import.meta as any)?.env?.DEV === true || (import.meta as any)?.env?.MODE === 'development';

type SessionUser = AuthenticatedSessionUser & { ativo?: boolean };
type LoginSuccessPayload = Omit<AuthResponse, 'user'> & { user: SessionUser } & { message?: string };
type ProfilePayload = { user: SessionUser };
type PaginatedUsersPayload = PaginatedCollection<ConfiguracaoUsuario>;
type PaginatedPermissionsPayload = PaginatedCollection<PermissionSummary>;
type PaginationQuery = Partial<{ search: string; page: number; limit: number }>;

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return decodeURIComponent(parts.pop()!.split(';').shift() || '');
  return null;
}


class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      timeout: 10000,
      withCredentials: true, // envia cookies httpOnly
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Interceptor para adicionar token em todas as requisições
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
        if (token && token !== 'undefined') {
          config.headers.Authorization = `Bearer ${token}`;
        } else if (config.headers && 'Authorization' in config.headers) {
          delete (config.headers as any).Authorization;
        }

        // CSRF header opcional (se o backend validar)
        const csrf = getCookie('csrf_token');
        if (csrf && config.method && ['post','put','patch','delete'].includes(config.method)) {
          (config.headers as any)['X-CSRF-Token'] = csrf;
        }

        if (IS_DEV) {
          console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
        }
        return config;
      },
      (error) => {
        if (IS_DEV) console.error('Request error:', error);
        return Promise.reject(error);
      }
    );

    // Interceptor para tratar respostas e erros
    this.api.interceptors.response.use(
      (response: AxiosResponse<ApiResponse>) => {
        if (IS_DEV) console.log(`API Response: ${response.status} - ${response.config.url}`);
        
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
        if (IS_DEV) console.error('API Error:', error);
        
        // Tratar erro de autenticação
        if (error.response && error.response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          // HashRouter-safe redirect
          if (typeof window !== 'undefined') {
            window.location.hash = '#/auth';
          }
        }
        
        // Criar resposta de erro padronizada
        const rawMessage = error.response?.data?.message || error.message;
        const errorResponse: ApiResponse = {
          success: false,
          message: translateErrorMessage(rawMessage)
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
    const attempt = async (): Promise<ApiResponse<T>> => {
      const response = await this.api.get<ApiResponse<T>>(url, config);
      return response.data;
    };
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    try {
      return await attempt();
    } catch (error: any) {
      // Retry GETs once with backoff if network or 5xx
      const status = error?.response?.status;
      if (!config?.method && (!status || status >= 500)) {
        try {
          await sleep(300);
          return await attempt();
        } catch (err2: any) {
          if (err2.response && err2.response.data) return err2.response.data;
          return { success: false, message: err2.message || 'Erro na requisição' };
        }
      }
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
      if (IS_DEV) console.log('POST Request:', { url, data, baseURL: this.api.defaults.baseURL });
      const response = await this.api.post<ApiResponse<T>>(url, data, config);
      if (IS_DEV) console.log('POST Response Success:', response.data);
      return response.data;
    } catch (error: any) {
      if (IS_DEV) {
        console.error('POST Error:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          response: error.response?.data,
          status: error.response?.status,
          url: error.config?.url
        });
      }
      
      if (error.response && error.response.data) {
        return error.response.data;
      }
      return {
        success: false,
        message: `Erro de rede: ${error.message}` || 'Erro na requisição'
      };
    }
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    const response = await this.api.put(endpoint, data);
    return response.data;
  }

  async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    const response = await this.api.patch(endpoint, data);
    return response.data;
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    const response = await this.api.delete(endpoint);
    return response.data;
  }

  // Métodos específicos para autenticação
  async login(email: string, password: string): Promise<ApiResponse<LoginSuccessPayload>> {
    if (IS_DEV) console.log('Login attempt:', { email, apiUrl: API_URL });
    const result = await this.post<LoginSuccessPayload>('/auth/login', { email, password });
    if (IS_DEV) console.log('Login result:', result);
    return result;
  }

  async getCurrentUser(): Promise<ApiResponse<ProfilePayload>> {
    return this.get<ProfilePayload>('/auth/me');
  }

  // Métodos específicos para oficinas
  async getOficinas(params?: any): Promise<ApiResponse<Oficina[]>> {
    const response = await this.get<{ data: Oficina[]; pagination?: Pagination & { totalPages?: number } }>(
      '/oficinas',
      { params }
    );

    if (!response.success) {
      return response as ApiResponse<Oficina[]>;
    }

    const payload = response.data;

    return {
      ...response,
      data: payload?.data ?? [],
      pagination: payload?.pagination,
    };
  }

  async createOficina(data: any): Promise<ApiResponse<any>> {
    return this.post<Oficina>('/oficinas', data);
  }

  async updateOficina(id: string, data: any): Promise<ApiResponse<any>> {
    return this.put<Oficina>(`/oficinas/${id}`, data);
  }

  async deleteOficina(id: string): Promise<ApiResponse<any>> {
    return this.delete<void>(`/oficinas/${id}`);
  }

  // Métodos específicos para beneficiárias
  async getBeneficiarias(params?: any): Promise<ApiResponse<any[]>> {
  return this.get<Beneficiaria[]>('/beneficiarias', { params });
  }

  async getBeneficiaria(id: string | number): Promise<ApiResponse<any>> {
  return this.get<Beneficiaria>(`/beneficiarias/${id}`);
  }

  async createBeneficiaria(data: any): Promise<ApiResponse<any>> {
  return this.post<Beneficiaria>('/beneficiarias', data);
  }

  async updateBeneficiaria(id: string, data: any): Promise<ApiResponse<any>> {
  return this.put<Beneficiaria>(`/beneficiarias/${id}`, data);
  }

  async deleteBeneficiaria(id: string): Promise<ApiResponse<any>> {
  return this.delete<void>(`/beneficiarias/${id}`);
  }

  // Dashboard methods
  async getDashboardStats(): Promise<ApiResponse<DashboardStatsResponse>> {
    return this.get('/dashboard/stats');
  }

  async getDashboardActivities(): Promise<ApiResponse<any[]>> {
    const response = await this.get<any>('/dashboard/activities');

    if (!response.success) {
      return response;
    }

    const payload = response.data;
    const activities = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.activities)
        ? payload.activities
        : [];

    return {
      ...response,
      data: activities
    };
  }

  async getDashboardTasks(): Promise<ApiResponse<any[]>> {
    const response = await this.get<any>('/dashboard/tasks');

    if (!response.success) {
      return response;
    }

    const payload = response.data;
    const tasks = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.tasks)
        ? payload.tasks
        : [];

    return {
      ...response,
      data: tasks
    };
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
  async getFeed(params?: any): Promise<ApiResponse<any>> {
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

  // Métodos específicos para matrículas em projetos
  async getMatriculas(params?: any): Promise<ApiResponse<any[]>> {
    return this.get('/matriculas-projetos', { params });
  }

  async createMatricula(data: any): Promise<ApiResponse<any>> {
    return this.post('/matriculas-projetos', data);
  }

  async getMatricula(id: string | number): Promise<ApiResponse<any>> {
    return this.get(`/matriculas-projetos/${id}`);
  }

  async updateMatricula(id: string | number, data: any): Promise<ApiResponse<any>> {
    return this.patch(`/matriculas-projetos/${id}`, data);
  }

  async verificarElegibilidade(data: { beneficiaria_id: number; projeto_id: number }): Promise<ApiResponse<any>> {
    return this.post('/matriculas-projetos/verificar-elegibilidade', data);
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

  // Configurações: usuários, papéis, permissões
  async listUsers(params?: PaginationQuery): Promise<ApiResponse<PaginatedUsersPayload>> {
    return this.get<PaginatedUsersPayload>('/configuracoes/usuarios', { params });
  }

  async createUser(data: CreateUsuarioPayload): Promise<ApiResponse<ConfiguracaoUsuario>> {
    return this.post<ConfiguracaoUsuario>('/configuracoes/usuarios', data);
  }

  async updateUser(id: number, data: UpdateUsuarioPayload): Promise<ApiResponse<ConfiguracaoUsuario>> {
    return this.put<ConfiguracaoUsuario>(`/configuracoes/usuarios/${id}`, data);
  }

  async resetUserPassword(id: number, newPassword: string): Promise<ApiResponse<{ id: number }>> {
    const payload: ResetPasswordPayload = { newPassword };
    return this.post<{ id: number }>(`/configuracoes/usuarios/${id}/reset-password`, payload);
  }

  async listRoles(): Promise<ApiResponse<string[]>> {
    return this.get<string[]>('/configuracoes/roles');
  }

  async listPermissions(params?: PaginationQuery): Promise<ApiResponse<PaginatedPermissionsPayload>> {
    return this.get<PaginatedPermissionsPayload>('/configuracoes/permissions', { params });
  }

  async createPermission(name: string, description?: string): Promise<ApiResponse<PermissionSummary>> {
    return this.post<PermissionSummary>('/configuracoes/permissions', { name, description });
  }

  async getRolePermissions(role: string): Promise<ApiResponse<UsuarioPermissions>> {
    return this.get<UsuarioPermissions>(`/configuracoes/roles/${role}/permissions`);
  }

  async setRolePermissions(role: string, permissions: UsuarioPermissions): Promise<ApiResponse<{ role: string; permissions: UsuarioPermissions }>> {
    return this.put<{ role: string; permissions: UsuarioPermissions }>(`/configuracoes/roles/${role}/permissions`, { permissions });
  }

  // Perfil
  async updateProfile(data: any): Promise<ApiResponse<any>> { return this.put('/auth/profile', data); }
  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<any>> {
    return this.post('/auth/change-password', { currentPassword, newPassword });
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
  async getCommentsByPostId(postId: number, params?: any): Promise<ApiResponse<any>> {
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
  // Formularios (genéricos e agregados)
  async listFormularios(params?: any): Promise<ApiResponse<any>> {
    return this.get('/formularios', { params });
  }
  async listFormulariosBeneficiaria(beneficiariaId: number, params?: any): Promise<ApiResponse<any>> {
    return this.get(`/formularios/beneficiaria/${beneficiariaId}`, { params });
  }
  async getFormulario(tipo: string, id: number): Promise<ApiResponse<any>> {
    return this.get(`/formularios/${tipo}/${id}`);
  }
  async createFormulario(tipo: string, data: any): Promise<ApiResponse<any>> {
    return this.post(`/formularios/${tipo}`, data);
  }
  async updateFormulario(tipo: string, id: number, data: any): Promise<ApiResponse<any>> {
    return this.put(`/formularios/${tipo}/${id}`, data);
  }
  async exportFormularioPdf(tipo: string, id: number): Promise<Blob> {
    const response = await this.api.get(`/formularios/${tipo}/${id}/pdf`, { responseType: 'blob' });
    return response.data as Blob;
  }

  // Séries de evolução (ficha_evolucao)
  async getFichaEvolucaoSeries(beneficiariaId: number): Promise<ApiResponse<any>> {
    return this.get(`/formularios/ficha-evolucao/beneficiaria/${beneficiariaId}/series`);
  }

  // Permissões por usuário
  async getUserPermissions(userId: number): Promise<ApiResponse<UsuarioPermissions>> {
    return this.get<UsuarioPermissions>(`/configuracoes/usuarios/${userId}/permissions`);
  }

  async setUserPermissions(userId: number, permissions: UsuarioPermissions): Promise<ApiResponse<{ id: number; permissions: UsuarioPermissions }>> {
    return this.put<{ id: number; permissions: UsuarioPermissions }>(`/configuracoes/usuarios/${userId}/permissions`, { permissions });
  }
}

export const apiService = new ApiService();
export default apiService;
