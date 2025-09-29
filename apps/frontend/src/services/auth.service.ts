import { AUTH_TOKEN_KEY, USER_KEY } from '@/config';
import api from '@/config/api';
import axios from 'axios';
import { applyCsrfTokenToAxios, getCsrfToken } from './csrfTokenStore';
import { ensureCsrfTokenFetched } from './csrf.service';

export interface AuthUser {
  id: number;
  email: string;
  nome: string;
  papel: string;
  avatar_url?: string;
  permissions?: string[];
  role?: string;
  [key: string]: unknown;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: AuthUser;
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
    permissions?: string[];
  };
}

const LEGACY_TOKEN_KEYS = ['auth_token', 'token'];
const LEGACY_USER_KEYS = ['user'];

export class AuthService {
  private static instance: AuthService;

  private readonly deviceStorageKey = 'auth_device_id';
  private readonly csrfEndpoints = ['/csrf-token', '/auth/csrf'];

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private normalizeUser(rawUser: unknown): AuthUser {
    if (!rawUser || typeof rawUser !== 'object') {
      throw new Error('Usuário inválido');
    }

    const record = rawUser as Record<string, unknown>;
    const id = Number(record.id);

    if (!Number.isFinite(id)) {
      throw new Error('Identificador de usuário inválido');
    }

    const email = typeof record.email === 'string' ? record.email : '';
    const nome =
      typeof record.nome === 'string'
        ? record.nome
        : typeof record.nome_completo === 'string'
          ? record.nome_completo
          : '';
    const papel =
      typeof record.papel === 'string'
        ? record.papel
        : typeof record.role === 'string'
          ? record.role
          : '';

    const permissions = Array.isArray(record.permissions)
      ? record.permissions.filter((permission): permission is string => typeof permission === 'string')
      : undefined;

    const normalized: AuthUser = {
      ...record,
      id,
      email,
      nome,
      papel,
      avatar_url:
        typeof record.avatar_url === 'string'
          ? record.avatar_url
          : typeof record.avatarUrl === 'string'
            ? record.avatarUrl
            : undefined,
      permissions,
    };

    if (!normalized.role && papel) {
      normalized.role = papel;
    }

    return normalized;
  }

  private persistUser(user: AuthUser | null): void {
    if (typeof window === 'undefined') {
      return;
    }

    const userKeys = new Set([...LEGACY_USER_KEYS, USER_KEY]);

    if (!user) {
      userKeys.forEach((key) => window.localStorage.removeItem(key));
      return;
    }

    userKeys.forEach((key) => {
      if (key === USER_KEY) {
        window.localStorage.setItem(key, JSON.stringify(user));
      } else {
        window.localStorage.removeItem(key);
      }
    });
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
    const tokenKeys = new Set([...LEGACY_TOKEN_KEYS, AUTH_TOKEN_KEY]);

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
      if (typeof window !== 'undefined') {
        tokenKeys.forEach((key) => window.localStorage.removeItem(key));
      }
      this.persistUser(null);
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
    if (typeof window === 'undefined') {
      return false;
    }

    const token =
      window.localStorage.getItem(AUTH_TOKEN_KEY) ||
      LEGACY_TOKEN_KEYS.map((key) => window.localStorage.getItem(key)).find((value) => !!value) ||
      null;
    return !!token;
  }

  getToken(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }

    return (
      window.localStorage.getItem(AUTH_TOKEN_KEY) ||
      LEGACY_TOKEN_KEYS.map((key) => window.localStorage.getItem(key)).find((value) => !!value) ||
      null
    );
  }

  getUser(): AuthResponse['user'] | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const userStr =
      window.localStorage.getItem(USER_KEY) ||
      LEGACY_USER_KEYS.map((key) => window.localStorage.getItem(key)).find((value) => !!value) ||
      null;

    if (!userStr) {
      return null;
    }

    try {
      const parsed = JSON.parse(userStr) as unknown;
      return this.normalizeUser(parsed);
    } catch (error) {
      console.warn('Não foi possível restaurar usuário da sessão armazenada', error);
      return null;
    }
  }

  setUser(user: AuthUser | null): void {
    this.persistUser(user);
  }

  async getProfile(): Promise<AuthUser | null> {
    try {
      const response = await api.get<{ user?: unknown }>('/auth/me', {
        withCredentials: true,
      });

      if (!response.data || !response.data.user) {
        return null;
      }

      return this.normalizeUser(response.data.user);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        return null;
      }

      throw error instanceof Error ? error : new Error('Erro ao buscar perfil do usuário');
    }
  }
}
