import api from '@/config/api';
import axios from 'axios';

export interface AuthResponse {
  token?: string;
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

export class AuthService {
  private static instance: AuthService;
  private currentUser: AuthResponse['user'] | null = null;

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
      if (response.data?.user) {
        this.currentUser = response.data.user;
      }
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
      this.currentUser = null;
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  }

  async refreshToken(): Promise<void> {
    try {
      await api.post('/auth/refresh', undefined, { withCredentials: true });
    } catch (error) {
      throw new Error('Erro ao renovar token');
    }
  }

  async fetchCurrentUser(): Promise<AuthResponse['user']> {
    try {
      const response = await api.get<{ user: AuthResponse['user'] }>('/auth/me', { withCredentials: true });
      this.currentUser = response.data.user;
      return response.data.user;
    } catch (error) {
      this.currentUser = null;
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Não autenticado');
      }
      throw error;
    }
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  getUser(): AuthResponse['user'] | null {
    return this.currentUser;
  }

  clearCachedUser() {
    this.currentUser = null;
  }
}
