export interface TokenPayload {
  id: number;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  id: number;
  tokenVersion: number;
  iat: number;
  exp: number;
}

export type UserRole = 'super_admin' | 'admin' | 'coordenador' | 'profissional' | 'assistente';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface User {
  id: number;
  email: string;
  nome_completo: string;
  role: UserRole;
  ativo: boolean;
  ultimo_login?: Date;
  data_criacao: Date;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}
