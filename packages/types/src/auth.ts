export type UserRole = 'admin' | 'coordenador' | 'profissional' | 'assistente' | string;

export interface JWTPayload {
  id: number;
  email?: string;
  role: UserRole | string;
  permissions?: string[];
}

export interface AuthenticatedSessionUser {
  id: number;
  email: string;
  nome: string;
  papel: string;
  avatar_url?: string;
  ultimo_login?: Date | string | null;
  data_criacao?: Date | string;
  data_atualizacao?: Date | string;
}

export interface AuthResponse {
  token: string;
  user: AuthenticatedSessionUser;
}
