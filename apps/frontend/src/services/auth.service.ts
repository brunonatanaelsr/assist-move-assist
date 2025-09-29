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
  permissions?: string[];
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
  permissions?: string[];
}

const LEGACY_TOKEN_KEYS = ['auth_token', 'token'];
const LEGACY_USER_KEYS = ['user'];

type StoredUser = AuthResponse['user'] | null;

export class AuthService {
  private static instance: AuthService;

  private readonly deviceStorageKey = 'auth_device_id';
  private readonly csrfEndpoints = ['/csrf-token', '/auth/csrf'];
  private readonly tokenStorageKeys: string[];
  private readonly userStorageKeys: string[];

  private constructor() {
    this.tokenStorageKeys = [
      AUTH_TOKEN_KEY,
      ...LEGACY_TOKEN_KEYS.filter((key) => key !== AUTH_TOKEN_KEY),
    ];
    this.userStorageKeys = [
      USER_KEY,
      ...LEGACY_USER_KEYS.filter((key) => key !== USER_KEY),
    ];
  }

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

  private mergePermissions<T extends { permissions?: string[] }>(
    user: T | null | undefined,
    fallback?: string[] | null,
  ): T | null {
    if (!user) {
      return null;
    }

    if (Array.isArray(user.permissions)) {
      return user;
    }

    if (fallback && fallback.length > 0) {
      return { ...user, permissions: [...fallback] };
    }

    return user;
  }

  private parseStoredUser(raw: string | null): StoredUser {
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as StoredUser;
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    } catch (error) {
      console.warn('Falha ao interpretar usuário salvo em cache', error);
    }

    return null;
  }

  public storeUser(user: StoredUser): void {
    if (typeof window === 'undefined') {
      return;
    }

    if (!user) {
      this.userStorageKeys.forEach((key) => window.localStorage.removeItem(key));
      return;
    }

    try {
      window.localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Erro ao persistir usuário autenticado:', error);
      return;
    }

    this.userStorageKeys.forEach((key) => {
      if (key !== USER_KEY) {
        window.localStorage.removeItem(key);
      }
    });
  }

  public clearStoredUser(): void {
    if (typeof window === 'undefined') {
      return;
    }
    this.userStorageKeys.forEach((key) => window.localStorage.removeItem(key));
  }

  public clearStoredTokens(): void {
    if (typeof window === 'undefined') {
      return;
    }
    this.tokenStorageKeys.forEach((key) => window.localStorage.removeItem(key));
  }

  public clearStoredSession(): void {
    this.clearStoredTokens();
    this.clearStoredUser();
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      await this.ensureCsrfToken();
      const deviceId = this.getDeviceId();
      const response = await api.post<AuthResponse>(
        '/auth/login',
        { ...credentials, deviceId },
        { withCredentials: true },
      );
      const mergedUser = this.mergePermissions(response.data.user, response.data.permissions);
      return {
        ...response.data,
        user: mergedUser ?? response.data.user,
      };
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
        { withCredentials: true },
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
        { withCredentials: true },
      );
      const mergedUser = this.mergePermissions(response.data.user, response.data.permissions);
      if (mergedUser) {
        this.storeUser(mergedUser as unknown as StoredUser);
      }
      return {
        ...response.data,
        user: mergedUser ?? response.data.user,
      };
    } catch (error) {
      throw new Error('Erro ao renovar token');
    }
  }

  async fetchCurrentUser(): Promise<StoredUser> {
    try {
      const response = await api.get('/auth/me', { withCredentials: true });
      const payload = response.data as any;
      const user = this.mergePermissions(
        payload?.user ?? payload?.data?.user ?? null,
        payload?.permissions ?? payload?.data?.permissions ?? null,
      );

      if (user) {
        this.storeUser(user as StoredUser);
        return user as StoredUser;
      }

      this.clearStoredUser();
      return null;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response && [401, 403].includes(error.response.status)) {
        this.clearStoredSession();
        return null;
      }
      throw error;
    }
  }

  isAuthenticated(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    return this.tokenStorageKeys.some((key) => {
      const value = window.localStorage.getItem(key);
      return !!value && value !== 'undefined';
    });
  }

  getToken(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }

    for (const key of this.tokenStorageKeys) {
      const value = window.localStorage.getItem(key);
      if (value && value !== 'undefined') {
        if (key !== AUTH_TOKEN_KEY) {
          window.localStorage.setItem(AUTH_TOKEN_KEY, value);
          window.localStorage.removeItem(key);
        }
        return value;
      }
    }

    return null;
  }

  getUser(): StoredUser {
    if (typeof window === 'undefined') {
      return null;
    }

    for (const key of this.userStorageKeys) {
      const stored = window.localStorage.getItem(key);
      const parsed = this.parseStoredUser(stored);

      if (parsed) {
        if (key !== USER_KEY) {
          this.storeUser(parsed);
        }
        return parsed;
      }

      if (stored && !parsed) {
        window.localStorage.removeItem(key);
      }
    }

    return null;
  }
}
