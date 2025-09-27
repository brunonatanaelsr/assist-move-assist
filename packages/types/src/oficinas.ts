export type OficinaStatus = 'ativa' | 'inativa' | 'pausada' | 'concluida' | 'cancelada' | string;

export interface Oficina {
  id: number;
  nome: string;
  descricao?: string | null;
  instrutor?: string | null;
  data_inicio: string;
  data_fim?: string | null;
  horario_inicio: string;
  horario_fim: string;
  local?: string | null;
  vagas_total: number;
  vagas_ocupadas?: number;
  status: OficinaStatus;
  dias_semana?: string;
  projeto_id?: number;
  responsavel_id?: string | number;
  ativo?: boolean;
  data_criacao?: string;
  data_atualizacao?: string;
}
