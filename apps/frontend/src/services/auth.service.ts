import { AUTH_TOKEN_KEY, USER_KEY } from '@/config';
import api from '@/config/api';
import axios from 'axios';
import { applyCsrfTokenToAxios, getCsrfToken } from './csrfTokenStore';
import { ensureCsrfTokenFetched } from './csrf.service';

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: {
    id: number;
    email: string;
    nome: string;
    papel: string;
    avatar_url?: string;
    permissions?: string[];
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RefreshSessionResponse {
  message: string;
  token: string;
  refreshToken?: string;
  user: {
    id: number;
    email?: string;
    role: string;
  };
}

const LEGACY_TOKEN_KEYS = ['auth_token', 'token'];
const LEGACY_USER_KEYS = ['user'];

export class AuthService {
  private static instance: AuthService;

  private readonly deviceStorageKey = 'auth_device_id';
  private readonly csrfEndpoints = ['/csrf-token', '/auth/csrf'];

  public clearStoredSession(): void {
    const tokenKeys = new Set([...LEGACY_TOKEN_KEYS, AUTH_TOKEN_KEY]);
    const userKeys = new Set([...LEGACY_USER_KEYS, USER_KEY]);

    tokenKeys.forEach((key) => localStorage.removeItem(key));
    userKeys.forEach((key) => localStorage.removeItem(key));
  }

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private async ensureCsrfToken(): Promise<void> {
    const existingToken = getCsrfToken();
    if (existingToken) {
      applyCsrfTokenToAxios(api);
      return;
    }

    let lastError: unknown;

    for (const endpoint of this.csrfEndpoints) {
      try {
        const token = await ensureCsrfTokenFetched(api, endpoint);
        if (token) {
          return;
        }
        lastError = new Error('Resposta sem token CSRF');
      } catch (error) {
        lastError = error;
      }
    }

    if (lastError instanceof Error) {
      throw lastError;
    }

    throw new Error('Não foi possível obter o token CSRF');
  }

  private getDeviceId(): string {
    if (typeof window === 'undefined') {
      return 'server';
    }

    const storageKey = this.deviceStorageKey;
    const existing = window.localStorage.getItem(storageKey);
    if (existing) {
      return existing;
    }

    const generated =
      typeof window.crypto !== 'undefined' && typeof window.crypto.randomUUID === 'function'
        ? window.crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

    window.localStorage.setItem(storageKey, generated);
    return generated;
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      await this.ensureCsrfToken();
      const deviceId = this.getDeviceId();
      const response = await api.post<AuthResponse>(
        '/auth/login',
        { ...credentials, deviceId },
        { withCredentials: true }
      );
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
      await this.ensureCsrfToken();
      const deviceId = this.getDeviceId();
      await api.post(
        '/auth/logout',
        { deviceId },
        { withCredentials: true }
      );
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    } finally {
      this.clearStoredSession();
    }
  }

  async refreshToken(): Promise<RefreshSessionResponse> {
    try {
      await this.ensureCsrfToken();
      const deviceId = this.getDeviceId();
      const response = await api.post<RefreshSessionResponse>(
        '/auth/refresh',
        { deviceId },
        { withCredentials: true }
      );
      return response.data;
    } catch (error) {
      throw new Error('Erro ao renovar token');
    }
  }

  isAuthenticated(): boolean {
    const token =
      localStorage.getItem(AUTH_TOKEN_KEY) ||
      LEGACY_TOKEN_KEYS.map((key) => localStorage.getItem(key)).find((value) => !!value) ||
      null;
    return !!token;
  }

  getToken(): string | null {
    return (
      localStorage.getItem(AUTH_TOKEN_KEY) ||
      LEGACY_TOKEN_KEYS.map((key) => localStorage.getItem(key)).find((value) => !!value) ||
      null
    );
  }

  getUser(): AuthResponse['user'] | null {
    const userStr =
      localStorage.getItem(USER_KEY) ||
      LEGACY_USER_KEYS.map((key) => localStorage.getItem(key)).find((value) => !!value) ||
      null;
    return userStr ? JSON.parse(userStr) : null;
  }

  async fetchCurrentUser(): Promise<AuthResponse['user'] | null> {
    try {
      const response = await api.get<{ user?: AuthResponse['user'] } | AuthResponse['user']>('/auth/me', {
        withCredentials: true
      });

      const payload = response.data;
      const user = (payload && 'user' in (payload as Record<string, unknown>)
        ? (payload as { user?: AuthResponse['user'] }).user
        : (payload as AuthResponse['user'] | undefined)) ?? null;

      if (user) {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      }

      return user ?? null;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        this.clearStoredSession();
        return null;
      }

      throw error;
    }
  }
}
