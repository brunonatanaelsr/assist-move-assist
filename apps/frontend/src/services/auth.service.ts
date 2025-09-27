import api from '@/config/api';
import axios from 'axios';

export interface AuthResponse {
  token: string;
  user: {
    id: number;
    email: string;
    nome: string;
    papel: string;
    avatar_url?: string;
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
}

type AuthMeResponse = {
  user?: (AuthResponse['user'] & { permissions?: string[]; permissoes?: string[] }) | null;
  permissions?: string[];
};

export class AuthService {
  private static instance: AuthService;

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await api.post<AuthResponse>('/auth/login', credentials, { withCredentials: true });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Erro ao fazer login');
      }
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout', undefined, { withCredentials: true });
      // Limpar token e dados do usuário localmente
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  }

  async refreshToken(): Promise<string> {
    try {
      const response = await api.post<{ message: string; token: string }>('/auth/refresh', undefined, { withCredentials: true });
      return response.data.token;
    } catch (error) {
      throw new Error('Erro ao renovar token');
    }
  }

  isAuthenticated(): boolean {
    const token = localStorage.getItem('auth_token');
    return !!token;
  }

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  getUser(): AuthResponse['user'] | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  async fetchSession(): Promise<AuthMeResponse> {
    try {
      const response = await api.get<AuthMeResponse>('/auth/me', { withCredentials: true });
      const data = response.data ?? {};
      if (!data.user && (data as any)?.data?.user) {
        // Compatibilidade com respostas envolvidas em objetos data
        return (data as any).data as AuthMeResponse;
      }
      return data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.warn('Não foi possível recuperar sessão do usuário', error.response?.data ?? error.message);
      }
      return {};
    }
  }

  async fetchPermissions(): Promise<string[]> {
    const session = await this.fetchSession();
    const payload = session ?? {};
    const candidate =
      (Array.isArray(payload.permissions) && payload.permissions)
      || (payload.user && Array.isArray(payload.user.permissions) && payload.user.permissions)
      || (payload.user && Array.isArray(payload.user.permissoes) && payload.user.permissoes)
      || [];
    return candidate.map((permission) => String(permission));
  }
}
