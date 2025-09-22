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

export interface Beneficiaria {
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
    status: 'ativa' | 'inativa' | 'pendente' | 'desligada' | 'arquivada';
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

export interface BeneficiariaFiltros {
    search?: string;
    status?: Beneficiaria['status'];
    data_inicio?: Date;
    data_fim?: Date;
    escolaridade?: string;
    renda_min?: number;
    renda_max?: number;
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

// Interface para Matrícula em Projetos
export interface MatriculaProjeto {
    id?: number;
    beneficiaria_id: number;
    projeto_id: number;
    data_matricula: string;
    data_inicio_prevista?: string;
    data_conclusao_prevista?: string;
    
    // Dados da Beneficiária na Matrícula
    situacao_social_familiar?: string;
    escolaridade_atual?: string;
    experiencia_profissional?: string;
    motivacao_participacao: string;
    expectativas: string;
    disponibilidade_horarios: string[];
    possui_dependentes: boolean;
    necessita_auxilio_transporte: boolean;
    necessita_auxilio_alimentacao: boolean;
    necessita_cuidado_criancas: boolean;
    
    // Critérios de Elegibilidade
    atende_criterios_idade: boolean;
    atende_criterios_renda: boolean;
    atende_criterios_genero: boolean;
    atende_criterios_territorio: boolean;
    atende_criterios_vulnerabilidade: boolean;
    observacoes_elegibilidade?: string;
    
    // Compromissos e Responsabilidades
    termo_compromisso_assinado: boolean;
    frequencia_minima_aceita: boolean;
    regras_convivencia_aceitas: boolean;
    participacao_atividades_aceita: boolean;
    avaliacao_periodica_aceita: boolean;
    
    // Dados Complementares
    como_conheceu_projeto?: string;
    pessoas_referencias?: string;
    condicoes_especiais?: string;
    medicamentos_uso_continuo?: string;
    alergias_restricoes?: string;
    
    // Profissional Responsável
    profissional_matricula?: string;
    observacoes_profissional?: string;
    
    // Status
    status_matricula: 'pendente' | 'aprovada' | 'reprovada' | 'lista_espera';
    motivo_status?: string;
    data_aprovacao?: string;
    
    // Timestamps
    created_at?: string;
    updated_at?: string;
}

export interface ElegibilidadeCheck {
    beneficiaria_id: number;
    projeto_id: number;
}

export interface ElegibilidadeResult {
    elegivel: boolean;
    motivos: string[];
    warnings: string[];
    matricula_existente?: MatriculaProjeto;
}
