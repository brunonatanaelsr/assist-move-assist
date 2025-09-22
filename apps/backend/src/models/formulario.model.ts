import { BaseEntity } from '../repositories/base.repository';

// Tipos de formulários disponíveis
export type TipoFormulario = 
    | 'triagem_inicial'
    | 'avaliacao_risco'
    | 'plano_acao'
    | 'roda_vida'
    | 'visao_holistica'
    | 'acompanhamento_mensal'
    | 'avaliacao_final';

// Status possíveis para um formulário
export type StatusFormulario = 
    | 'rascunho'
    | 'pendente'
    | 'completo'
    | 'arquivado';

// Tipos de atendimento disponíveis
export type TipoAtendimento = 
    | 'acolhimento'
    | 'psicologico'
    | 'juridico'
    | 'social'
    | 'encaminhamento'
    | 'orientacao'
    | 'outro';

// Interface para o formulário
export interface Formulario extends BaseEntity {
    tipo: TipoFormulario;
    beneficiaria_id: number;
    data_preenchimento: Date;
    dados: Record<string, any>; // Estrutura JSON flexível
    status: StatusFormulario;
    observacoes?: string;
    usuario_id?: number;
}

// Interface para o histórico de atendimentos
export interface HistoricoAtendimento extends BaseEntity {
    beneficiaria_id: number;
    tipo_atendimento: TipoAtendimento;
    data_atendimento: Date;
    descricao: string;
    encaminhamentos?: string;
    usuario_id?: number;
}

// DTOs para criação
export interface CreateFormularioDTO extends Omit<Formulario, 'id' | 'created_at' | 'updated_at' | 'deleted_at'> {}

export interface CreateAtendimentoDTO extends Omit<HistoricoAtendimento, 'id' | 'created_at' | 'updated_at' | 'deleted_at'> {}

// DTOs para atualização
export interface UpdateFormularioDTO extends Partial<Omit<Formulario, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'beneficiaria_id'>> {}

export interface UpdateAtendimentoDTO extends Partial<Omit<HistoricoAtendimento, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'beneficiaria_id'>> {}

// Interface para estatísticas de formulários
export interface EstatisticasFormularios {
    total_formularios: number;
    por_tipo: Record<TipoFormulario, number>;
    por_status: Record<StatusFormulario, number>;
    media_tempo_preenchimento: number; // em dias
}

// Interface para estatísticas de atendimentos
export interface EstatisticasAtendimentos {
    total_atendimentos: number;
    por_tipo: Record<TipoAtendimento, number>;
    media_atendimentos_por_beneficiaria: number;
    atendimentos_por_mes: Array<{
        mes: string;
        total: number;
        por_tipo: Record<TipoAtendimento, number>;
    }>;
}

// Interface para resumo de beneficiária com formulários e atendimentos
export interface BeneficiariaFormulariosAtendimentos {
    beneficiaria_id: number;
    nome: string;
    cpf: string;
    formularios: Array<Formulario>;
    atendimentos: Array<HistoricoAtendimento>;
    estatisticas: {
        total_formularios: number;
        total_atendimentos: number;
        ultimo_atendimento?: Date;
        status_formularios: Record<StatusFormulario, number>;
        tipos_atendimento: Record<TipoAtendimento, number>;
    };
}
