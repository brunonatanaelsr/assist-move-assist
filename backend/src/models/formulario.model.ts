export interface Formulario {
    id: number;
    tipo: string;
    beneficiaria_id: number;
    data_preenchimento: Date;
    dados: any; // JSONB
    status: 'rascunho' | 'pendente' | 'concluido' | 'arquivado';
    observacoes?: string;
    criado_em: Date;
    atualizado_em: Date;
    usuario_id?: number;
}

export interface HistoricoAtendimento {
    id: number;
    beneficiaria_id: number;
    tipo_atendimento: string;
    data_atendimento: Date;
    descricao: string;
    encaminhamentos?: string;
    criado_em: Date;
    atualizado_em: Date;
    usuario_id?: number;
}

export interface FormularioCreateInput extends Omit<Formulario, 'id' | 'criado_em' | 'atualizado_em' | 'data_preenchimento'> {}

export interface HistoricoAtendimentoCreateInput extends Omit<HistoricoAtendimento, 'id' | 'criado_em' | 'atualizado_em'> {}
