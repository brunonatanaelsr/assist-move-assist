import type { Pagination } from './api';

export type TemaPreferido = 'claro' | 'escuro' | 'sistema';

export interface ConfiguracoesGlobais {
  tema: TemaPreferido;
  idioma: string;
  fusoHorario: string;
  notificacoes: {
    habilitarEmails: boolean;
    habilitarPush: boolean;
  };
  organizacao: {
    nome: string | null;
    emailSuporte: string | null;
  };
  atualizadoEm: string | null;
}

export type UpdateConfiguracoesPayload = Partial<Omit<ConfiguracoesGlobais, 'atualizadoEm'>> & {
  notificacoes?: Partial<ConfiguracoesGlobais['notificacoes']>;
  organizacao?: Partial<ConfiguracoesGlobais['organizacao']>;
};

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
