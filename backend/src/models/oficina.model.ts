export interface Oficina {
    id: number;
    nome: string;
    descricao?: string;
    data_inicio: Date;
    data_fim?: Date;
    horario_inicio?: string;
    horario_fim?: string;
    vagas: number;
    local?: string;
    status: 'ativa' | 'cancelada' | 'concluida' | 'pendente';
    tipo: string;
    requisitos?: string;
    instrutor?: string;
    criado_em: Date;
    atualizado_em: Date;
    usuario_id?: number;
}

export interface ParticipacaoOficina {
    id: number;
    oficina_id: number;
    beneficiaria_id: number;
    status: 'inscrita' | 'confirmada' | 'concluida' | 'desistente' | 'cancelada';
    data_inscricao: Date;
    data_conclusao?: Date;
    frequencia: number;
    avaliacao?: number;
    feedback?: string;
    certificado_emitido: boolean;
    criado_em: Date;
    atualizado_em: Date;
}

export interface OficinaCreateInput extends Omit<Oficina, 'id' | 'criado_em' | 'atualizado_em'> {}

export interface ParticipacaoOficinaCreateInput extends Omit<ParticipacaoOficina, 'id' | 'criado_em' | 'atualizado_em' | 'data_inscricao' | 'frequencia' | 'certificado_emitido'> {}
