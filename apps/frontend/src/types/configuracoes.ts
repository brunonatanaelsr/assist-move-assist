import type { Pagination } from './api';

export interface ConfiguracaoUsuario {
  id: number;
  email: string;
  nome: string;
  papel: string;
  ativo: boolean;
  avatar_url?: string | null;
  cargo?: string | null;
  departamento?: string | null;
  bio?: string | null;
  telefone?: string | null;
  data_criacao?: string | null;
  data_atualizacao?: string | null;
}

export interface PermissionSummary {
  name: string;
  description?: string | null;
}

export interface PaginatedCollection<TItem> {
  data: TItem[];
  pagination: Pagination;
}

export interface CreateUsuarioPayload {
  email: string;
  password: string;
  nome: string;
  papel?: string;
  cargo?: string;
  departamento?: string;
  telefone?: string;
}

export interface UpdateUsuarioPayload {
  nome?: string;
  papel?: string;
  ativo?: boolean;
  cargo?: string;
  departamento?: string;
  bio?: string;
  telefone?: string;
  avatar_url?: string;
}

export type UsuarioPermissions = string[];

export interface ResetPasswordPayload {
  newPassword: string;
}
