import type { PERMISSIONS } from './permissions';

export type UserRole = 'admin' | 'coordenador' | 'profissional' | 'assistente';

export interface User {
  id: number;
  nome: string;
  email: string;
  senha_hash: string;
  papel: UserRole;
  telefone?: string;
  ativo: boolean;
  ultimo_login?: Date;
  data_criacao: Date;
  data_atualizacao: Date;
}

export interface LoginRequest {
  email: string;
  password: string;
  deviceId?: string;
}

export interface LoginResponse {
  token: string;
  refreshToken?: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: UserRole;
  };
}

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
}

export interface JWTPayload {
  id: number;
  email?: string;
  role: UserRole | string;
  permissions?: PERMISSIONS[];
}

export interface AuthenticatedUser extends JWTPayload {
  nome?: string;
  avatar_url?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  nome_completo: string;
  role?: string;
}

export interface UpdateProfileRequest {
  nome_completo?: string;
  avatar_url?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface AuthenticatedSessionUser {
  id: number;
  email: string;
  nome: string;
  papel: string;
  avatar_url?: string;
  ultimo_login?: Date | null;
  data_criacao?: Date;
  data_atualizacao?: Date;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: AuthenticatedSessionUser;
}

export interface RefreshSessionResponse extends Omit<AuthResponse, 'refreshToken'> {
  token: string;
  refreshToken?: string;
}
