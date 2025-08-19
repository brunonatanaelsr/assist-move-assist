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
}

export interface LoginResponse {
  token: string;
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
  email: string;
  role: UserRole;
}
