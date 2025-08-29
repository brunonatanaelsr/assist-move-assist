import { User } from './auth';

export interface UserFormData {
  nome: string;
  email: string;
  role: User['role'];
  telefone?: string;
  senha?: string; // opcional para edição
}

export interface UserPermission {
  modulo: string;
  acoes: {
    ler: boolean;
    criar: boolean;
    editar: boolean;
    excluir: boolean;
  };
}

export interface UserWithPermissions extends User {
  permissoes: UserPermission[];
}

export interface PermissionGroup {
  id: number;
  nome: string;
  descricao: string;
  permissoes: UserPermission[];
  data_criacao: Date;
  data_atualizacao: Date;
}

export const MODULOS = [
  'beneficiarias',
  'projetos',
  'oficinas',
  'documentos',
  'formularios',
  'relatorios',
  'configuracoes'
] as const;

export type ModuloSistema = typeof MODULOS[number];

export const PAPEIS = {
  admin: 'Administrador',
  coordenador: 'Coordenador',
  profissional: 'Profissional',
  assistente: 'Assistente'
} as const;

export type PapelSistema = keyof typeof PAPEIS;
