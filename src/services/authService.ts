import { TokenPayload, RefreshTokenPayload, AuthTokens, User, AuthResponse } from '@/types/auth';
import axios from 'axios';
import jwtDecode from 'jwt-decode';

export class AuthService {
  private static instance: AuthService;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private refreshPromise: Promise<AuthTokens> | null = null;

  private constructor() {
    // Carregar tokens do cookie (será implementado pelo backend)
    this.accessToken = null;
    this.refreshToken = null;
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private async refreshTokens(): Promise<AuthTokens> {
    try {
      if (!this.refreshToken) {
        throw new Error('No refresh token available');
      }

      // Se já houver um refresh em andamento, retorna a Promise existente
      if (this.refreshPromise) {
        return this.refreshPromise;
      }

      // Criar nova Promise de refresh
      this.refreshPromise = axios.post('/api/auth/refresh', {
        refreshToken: this.refreshToken
      }).then(response => {
        const { accessToken, refreshToken } = response.data;
        this.setTokens(accessToken, refreshToken);
        return { accessToken, refreshToken };
      }).finally(() => {
        this.refreshPromise = null;
      });

      return this.refreshPromise;
    } catch (error) {
      this.logout();
      throw error;
    }
  }

  private setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }

  private isTokenExpired(token: string): boolean {
    try {
      const decoded = jwtDecode<TokenPayload | RefreshTokenPayload>(token);
      return decoded.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }

  async getAccessToken(): Promise<string> {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    if (this.isTokenExpired(this.accessToken)) {
      const { accessToken } = await this.refreshTokens();
      return accessToken;
    }

    return this.accessToken;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await axios.post<AuthResponse>('/api/auth/login', {
      email,
      password
    });

    const { tokens, user } = response.data;
    this.setTokens(tokens.accessToken, tokens.refreshToken);

    return response.data;
  }

  async logout() {
    try {
      if (this.refreshToken) {
        await axios.post('/api/auth/logout', {
          refreshToken: this.refreshToken
        });
      }
    } finally {
      this.accessToken = null;
      this.refreshToken = null;
      window.location.href = '/auth';
    }
  }

  async getCurrentUser(): Promise<User> {
    const token = await this.getAccessToken();
    const response = await axios.get<{ user: User }>('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data.user;
  }
}
