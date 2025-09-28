import { AUTH_TOKEN_KEY, USER_KEY } from '@/config';
import api from '@/config/api';
import axios from 'axios';

export interface AuthResponse {
  token: string;
  refreshToken: string;
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

type StoredUser = AuthResponse['user'] & Record<string, unknown>;

export class AuthService {
  private static instance: AuthService;
  private currentUser: StoredUser | null = null;
  private readonly deviceStorageKey = 'auth_device_id';

  private constructor() {
    if (typeof window !== 'undefined') {
      const storedUser = window.localStorage.getItem(USER_KEY);
      if (storedUser) {
        try {
          this.currentUser = JSON.parse(storedUser) as StoredUser;
          // Limpar tokens antigos
          LEGACY_TOKEN_KEYS.forEach(key => window.localStorage.removeItem(key));
          LEGACY_USER_KEYS.forEach(key => window.localStorage.removeItem(key));
        } catch (error) {
          console.warn('Failed to parse stored user profile', error);
          window.localStorage.removeItem(USER_KEY);
          // Garantir limpeza em caso de erro
          LEGACY_TOKEN_KEYS.forEach(key => window.localStorage.removeItem(key));
          LEGACY_USER_KEYS.forEach(key => window.localStorage.removeItem(key));
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
      const deviceId = this.getDeviceId();
      const response = await api.post<AuthResponse>(
        '/auth/login',
        { ...credentials, deviceId },
        { withCredentials: true }
      );
      if (response.data?.user) {
        this.setUser(response.data.user as unknown as StoredUser);
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
    const tokenKeys = new Set([AUTH_TOKEN_KEY, ...LEGACY_TOKEN_KEYS]);
    const userKeys = new Set([USER_KEY, ...LEGACY_USER_KEYS]);

    try {
      const deviceId = this.getDeviceId();
      await api.post('/auth/logout', { deviceId }, { withCredentials: true });
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    } finally {
      this.setUser(null);
      tokenKeys.forEach((key) => window.localStorage.removeItem(key));
      userKeys.forEach((key) => window.localStorage.removeItem(key));
    }
  }

  async refreshToken(): Promise<RefreshSessionResponse> {
    try {
      const deviceId = this.getDeviceId();
      const response = await api.post<RefreshSessionResponse>(
        '/auth/refresh',
        { deviceId },
        { withCredentials: true }
      );
      if (response.data?.user) {
        this.setUser(response.data.user as unknown as StoredUser);
      }
      return response.data;
    } catch (error) {
      throw new Error('Erro ao renovar token');
    }
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  getToken(): string | null {
    // Tokens são armazenados em cookies httpOnly; não acessíveis via JS
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

    const event = new CustomEvent<StoredUser | null>('auth:user-changed', { detail: user });
    window.dispatchEvent(event);
    }
  }
