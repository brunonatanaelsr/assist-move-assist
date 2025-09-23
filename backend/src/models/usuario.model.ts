import type { UserRole } from '../types/auth';

export interface Usuario {
    id: number;
    email: string;
    nome: string;
    perfil: UserRole;
    senha_hash: string;
    avatar_url?: string;
    cpf?: string;
    telefone?: string;
    ativo: boolean;
    ultimo_login?: Date;
    created_at: Date;
    updated_at: Date;
    deleted_at?: Date;
}

export interface CreateUsuarioDTO extends Omit<Usuario, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'senha_hash'> {
    senha: string; // senha em texto plano para criação
}

export interface UpdateUsuarioDTO extends Partial<Omit<Usuario, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'senha_hash'>> {
    senha?: string; // senha em texto plano opcional para atualização
}
