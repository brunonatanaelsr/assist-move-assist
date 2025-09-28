import { AUTH_TOKEN_KEY, USER_KEY } from '@/config';
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
      const tokenKeys = new Set([
        'token',
        'auth_token',
        AUTH_TOKEN_KEY
      ]);
      tokenKeys.forEach((key) => localStorage.removeItem(key));
      localStorage.removeItem('user');
      localStorage.removeItem(USER_KEY);
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
    const token = localStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem('auth_token') || localStorage.getItem('token');
    return !!token;
  }

  getToken(): string | null {
    return localStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem('auth_token') || localStorage.getItem('token');
  }

  getUser(): AuthResponse['user'] | null {
    const userStr = localStorage.getItem(USER_KEY) || localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }
}
