export interface Usuario {
    id: number;
    email: string;
    senha?: string; // opcional ao retornar dados
    nome: string;
    papel: 'admin' | 'coordenador' | 'atendente' | 'usuario';
    avatar_url?: string;
    ultimo_login?: Date;
    criado_em: Date;
    atualizado_em: Date;
}

export interface UsuarioCreateInput extends Omit<Usuario, 'id' | 'criado_em' | 'atualizado_em' | 'ultimo_login'> {
    senha: string; // obrigatório na criação
}

export interface UsuarioUpdateInput extends Partial<Omit<Usuario, 'id' | 'criado_em' | 'atualizado_em'>> {}
