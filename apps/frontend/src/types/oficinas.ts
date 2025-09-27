import type { ApiResponse, Pagination } from '@/types/api';

export type OficinaStatus = 'ativa' | 'inativa' | 'pausada' | 'concluida';

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
  vagas_ocupadas?: number | null;
  status: OficinaStatus;
  dias_semana?: string | null;
  projeto_id?: number | null;
  projeto_nome?: string | null;
  responsavel_id?: number | null;
  responsavel_nome?: string | null;
  total_participantes?: number | null;
  data_criacao?: string;
  data_atualizacao?: string;
}

export interface OficinaResumo {
  total_participantes?: number;
  taxa_ocupacao?: number;
  presenca_media?: number;
  encontros_realizados?: number;
  proximo_encontro?: string | null;
}

export interface CreateOficinaDTO {
  nome: string;
  descricao?: string | null;
  instrutor?: string | null;
  data_inicio: string;
  data_fim?: string | null;
  horario_inicio: string;
  horario_fim: string;
  local?: string | null;
  vagas_total: number;
  dias_semana?: string | null;
  projeto_id?: number | null;
  status?: OficinaStatus;
}

export interface UpdateOficinaDTO extends Partial<CreateOficinaDTO> {}

export interface ListOficinasParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: OficinaStatus | string;
  projeto_id?: number;
  data_inicio?: string;
  data_fim?: string;
  instrutor?: string;
  sort?: keyof Oficina;
  order?: 'asc' | 'desc';
}

export type OficinasApiResponse = ApiResponse<Oficina[]> & {
  pagination?: Pagination & { totalPages?: number };
};

export interface OficinaResumoResponse extends ApiResponse<OficinaResumo> {}

export interface OficinaFormValues {
  nome: string;
  descricao: string;
  instrutor: string;
  data_inicio: string;
  data_fim: string;
  horario_inicio: string;
  horario_fim: string;
  local: string;
  vagas_total: number;
  status: OficinaStatus;
  projeto_id: string;
  dias_semana: string;
}
