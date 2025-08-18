export interface IProjeto {
  id: string;
  titulo: string;
  descricao: string;
  objetivo: string;
  metodologia?: string;
  data_inicio: Date | string;
  data_fim?: Date | string;
  status: 'PLANEJADO' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'CANCELADO';
  area_atuacao: string[];
  responsavel: string;
  equipe?: string[];
  parceiros?: string[];
  patrocinadores?: string[];
  orcamento_previsto?: number;
  orcamento_realizado?: number;
  metas?: string[];
  indicadores?: string[];
  resultados?: string[];
  beneficiarias_impactadas?: number;
  documentos_url?: string[];
  observacoes?: string;
  meta_dados?: Record<string, any>;
  ativo: boolean;
  data_criacao: Date | string;
  data_atualizacao?: Date | string;
}
