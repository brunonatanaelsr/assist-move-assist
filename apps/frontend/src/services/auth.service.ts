import api from '@/config/api';
import { USER_KEY } from '@/config';
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

type StoredUser = AuthResponse['user'] & Record<string, unknown>;

export class AuthService {
  private static instance: AuthService;
  private currentUser: StoredUser | null = null;

  private constructor() {
    if (typeof window !== 'undefined') {
      const storedUser = window.localStorage.getItem(USER_KEY);
      if (storedUser) {
        try {
          this.currentUser = JSON.parse(storedUser) as StoredUser;
        } catch (error) {
          console.warn('Failed to parse stored user profile', error);
          window.localStorage.removeItem(USER_KEY);
        }
      }
    }
  }

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
        this.setUser(response.data.user as StoredUser);
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
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    } finally {
      this.setUser(null);
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
    return this.currentUser !== null;
  }

  getToken(): string | null {
    return null;
  }

  getUser(): StoredUser | null {
    return this.currentUser;
  }

  setUser(user: StoredUser | null): void {
    this.currentUser = user;
    if (typeof window === 'undefined') return;

    if (user) {
      window.localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      window.localStorage.removeItem(USER_KEY);
    }

    const event = new CustomEvent<StoredUser | null>('auth:user-changed', {
      detail: user ?? null
    });
    window.dispatchEvent(event);
  }
}
