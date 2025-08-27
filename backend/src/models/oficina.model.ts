import { BaseEntity } from '../repositories/base.repository';

export interface Oficina extends BaseEntity {
    nome: string;
    descricao?: string;
    data_inicio: Date;
    data_fim?: Date;
    horario_inicio?: string; // HH:mm format
    horario_fim?: string; // HH:mm format
    vagas: number;
    local?: string;
    status: 'ativa' | 'concluida' | 'cancelada' | 'pendente';
    tipo: string;
    requisitos?: string;
    instrutor?: string;
    usuario_id?: number;
}

export interface ParticipacaoOficina extends BaseEntity {
    oficina_id: number;
    beneficiaria_id: number;
    status: 'inscrita' | 'confirmada' | 'concluida' | 'desistente' | 'cancelada';
    data_inscricao: Date;
    data_conclusao?: Date;
    frequencia: number;
    avaliacao?: number;
    feedback?: string;
    certificado_emitido: boolean;
}

export interface CreateOficinaDTO extends Omit<Oficina, 'id' | 'created_at' | 'updated_at' | 'deleted_at'> {}

export interface UpdateOficinaDTO extends Partial<CreateOficinaDTO> {}

export interface CreateParticipacaoDTO extends Omit<ParticipacaoOficina, 'id' | 'created_at' | 'updated_at' | 'deleted_at'> {}

export interface UpdateParticipacaoDTO extends Partial<Omit<ParticipacaoOficina, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'oficina_id' | 'beneficiaria_id'>> {}

// Tipo para as estatísticas de uma oficina
export interface EstatisticasOficina {
    total_inscritas: number;
    total_confirmadas: number;
    total_concluidas: number;
    total_desistentes: number;
    total_canceladas: number;
    media_frequencia: number;
    media_avaliacao: number;
    vagas_disponiveis: number;
    taxa_ocupacao: number;
    taxa_conclusao: number;
}

// Tipo para o resumo de uma oficina com participantes
export interface OficinaComParticipantes extends Oficina {
    participantes: (ParticipacaoOficina & {
        beneficiaria_nome: string;
        beneficiaria_cpf: string;
    })[];
    estatisticas: EstatisticasOficina;
}
