import type { ApiResponse } from '@/types/api';
import type { Beneficiaria } from '@/types/shared';

export interface ListBeneficiariasParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: Beneficiaria['status'];
  escolaridade?: string;
}

export type BeneficiariaListResponse = ApiResponse<Beneficiaria[]>;

export type BeneficiariaResponse = ApiResponse<Beneficiaria>;

export interface BeneficiariaResumo {
  total_oficinas?: number;
  total_atendimentos?: number;
  ultima_atualizacao?: string | null;
  [key: string]: unknown;
}

export type BeneficiariaResumoResponse = ApiResponse<BeneficiariaResumo>;
