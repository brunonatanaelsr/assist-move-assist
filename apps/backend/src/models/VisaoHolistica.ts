export interface VisaoHolistica {
  id: string;
  beneficiaria_id: string;
  data_visao: Date;
  objetivo_principal: string;
  areas_prioritarias: any;
  acoes: string;
  suporte_instituto: string;
  primeira_avaliacao_data?: Date;
  primeira_avaliacao_progresso?: string;
  segunda_avaliacao_data?: Date;
  segunda_avaliacao_progresso?: string;
  assinatura_beneficiaria: boolean;
  assinatura_responsavel_tecnico: boolean;
  historia_vida?: string;
  rede_apoio?: string;
  visao_tecnica_referencia?: string;
  encaminhamento_projeto?: string;
  data_criacao: Date;
  data_atualizacao?: Date;
}
