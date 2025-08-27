export interface PlanoAcao {
  id: number;
  beneficiaria_id: number;
  data_plano: Date;
  objetivo_principal: string;
  areas_prioritarias: string[];
  outras_areas?: string[];
  acoes_realizadas: string[];
  suporte_instituto?: string;
  primeira_avaliacao_data?: Date;
  primeira_avaliacao_progresso?: string;
  segunda_avaliacao_data?: Date;
  segunda_avaliacao_progresso?: string;
  assinatura_beneficiaria: boolean;
  assinatura_responsavel_tecnico: boolean;
  data_criacao: Date;
  data_atualizacao?: Date;
}

export type PlanoAcaoInput = Omit<PlanoAcao, 'id' | 'data_criacao' | 'data_atualizacao'>;

export interface PlanoAcaoResponse {
  data?: PlanoAcao | PlanoAcao[];
  error?: string;
  message?: string;
}
