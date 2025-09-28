export type PlanoAcaoItemStatus = 'pendente' | 'em_andamento' | 'concluida' | 'cancelada';

export interface PlanoAcaoItem {
  id: number;
  titulo: string;
  responsavel: string | null;
  prazo: string | null;
  status: PlanoAcaoItemStatus;
  suporte_oferecido: string | null;
  criado_em: string | null;
  atualizado_em: string | null;
}

export interface PlanoAcao {
  id: number;
  beneficiaria_id: number;
  criado_por: number | null;
  criado_em: string | null;
  atualizado_em: string | null;
  objetivo_principal: string;
  areas_prioritarias: string[];
  observacoes: string | null;
  primeira_avaliacao_em: string | null;
  primeira_avaliacao_nota: string | null;
  segunda_avaliacao_em: string | null;
  segunda_avaliacao_nota: string | null;
  assinatura_beneficiaria: string | null;
  assinatura_responsavel: string | null;
  itens: PlanoAcaoItem[];
}

export interface PlanoAcaoResponse {
  data?: PlanoAcao | PlanoAcao[];
  error?: string;
  detalhes?: unknown;
}
