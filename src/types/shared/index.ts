// Tipos compartilhados entre frontend e backend
export interface Usuario {
    id: number;
    nome: string;
    email: string;
    papel: 'superadmin' | 'admin' | 'coordenador' | 'profissional' | 'assistente' | 'usuario';
    telefone?: string;
    ultimo_login?: Date;
    ativo: boolean;
    token_version: number;
    ultimo_token_refresh?: Date;
    sessoes_ativas: number;
    max_sessoes: number;
    data_criacao: Date;
    data_atualizacao: Date;
}

interface Beneficiaria {
    id: number;
    nome_completo: string;
    cpf: string;
    rg?: string;
    data_nascimento: Date;
    estado_civil?: 'solteira' | 'casada' | 'divorciada' | 'viuva' | 'uniao_estavel' | 'separada';
    email?: string;
    telefone: string;
    telefone_emergencia?: string;
    endereco: {
        logradouro: string;
        numero: string;
        complemento?: string;
        bairro: string;
        cidade: string;
        estado: string; // UF em maiúsculo
        cep: string; // Somente números
    };
    status: 'ativa' | 'inativa' | 'arquivada';
    observacoes?: string;
    foto_url?: string;
    data_cadastro: Date;
    ultima_atualizacao: Date;
    info_socioeconomica?: {
        renda_familiar?: number;
        quantidade_moradores?: number;
        tipo_moradia?: string;
        escolaridade?: string;
        profissao?: string;
        situacao_trabalho?: string;
        beneficios_sociais?: string[];
    };
    dependentes?: Array<{
        id: number;
        nome_completo: string;
        data_nascimento: Date;
        parentesco: string;
        cpf?: string;
    }>;
    historico_atendimentos?: Array<{
        id: number;
        data: Date;
        tipo: string;
        descricao: string;
        profissional_id: number;
    }>;
}

export interface Projeto {
    id: number;
    titulo: string;
    descricao: string;
    objetivo?: string;
    data_inicio: Date;
    data_fim?: Date;
    status: 'ativo' | 'inativo' | 'concluido';
    coordenador_id: number;
    orcamento?: number;
    meta_beneficiarias?: number;
    area_atuacao?: string;
    parceiros?: string[];
    tags?: string[];
    created_at: Date;
    updated_at: Date;
}

export interface Oficina {
    id: number;
    titulo: string;
    descricao: string;
    projeto_id: number;
    responsavel_id: number;
    data_inicio: Date;
    data_fim?: Date;
    horario_inicio: string;
    horario_fim: string;
    dias_semana: ('segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta' | 'sabado' | 'domingo')[];
    local: string;
    vagas_total: number;
    vagas_disponiveis: number;
    status: 'ativa' | 'inativa' | 'cancelada' | 'concluida';
    pre_requisitos?: string[];
    materiais_necessarios?: string[];
    objetivos?: string;
    created_at: Date;
    updated_at: Date;
}

export interface MetaProjeto {
    id: number;
    projeto_id: number;
    descricao: string;
    indicador: string;
    valor_meta: number;
    valor_atual: number;
    unidade: string;
    data_limite?: Date;
    concluida: boolean;
    created_at: Date;
    updated_at: Date;
}

export interface ApiResponse<T> {
    data?: T;
    error?: {
        message: string;
        code: string;
        details?: any;
    };
    metadata?: {
        page?: number;
        perPage?: number;
        total?: number;
        filtros?: Record<string, any>;
    };
}

export interface ValidationError {
    field: string;
    message: string;
    code: string;
}
