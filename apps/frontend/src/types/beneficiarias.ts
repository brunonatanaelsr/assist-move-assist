import type { ApiResponse, Pagination } from '@/types/api';
import type { Beneficiaria } from '@/types/shared';

export interface ListBeneficiariasParams extends Record<string, string | number | undefined> {
  page?: number;
  limit?: number;
  search?: string;
  status?: Beneficiaria['status'];
  escolaridade?: string;
}

export interface BeneficiariaListData {
  items: Beneficiaria[];
  pagination?: Pagination;
}

export type BeneficiariaListResponse = ApiResponse<BeneficiariaListData>;

export type BeneficiariaResponse = ApiResponse<Beneficiaria>;

export interface BeneficiariaResumo {
  total_oficinas?: number;
  total_atendimentos?: number;
  ultima_atualizacao?: string | null;
  [key: string]: unknown;
}

export type BeneficiariaResumoResponse = ApiResponse<BeneficiariaResumo>;
