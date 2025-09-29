import type { ApiResponse } from '@/types/api';
import { apiService } from './client';

type FormularioTipo = string;

type FormularioParams = Record<string, unknown> | undefined;

type TermoRevogacao = { motivo?: string } | undefined;

export const listFormularios = (params?: FormularioParams): Promise<ApiResponse<any>> =>
  apiService.get('/formularios', { params });

export const listFormulariosBeneficiaria = (
  beneficiariaId: number,
  params?: FormularioParams
): Promise<ApiResponse<any>> =>
  apiService.get(`/formularios/beneficiaria/${beneficiariaId}`, { params });

export const getFormulario = (tipo: FormularioTipo, id: number): Promise<ApiResponse<any>> =>
  apiService.get(`/formularios/${tipo}/${id}`);

export const createFormulario = (tipo: FormularioTipo, data: any): Promise<ApiResponse<any>> =>
  apiService.post(`/formularios/${tipo}`, data);

export const updateFormulario = (
  tipo: FormularioTipo,
  id: number,
  data: any
): Promise<ApiResponse<any>> => apiService.put(`/formularios/${tipo}/${id}`, data);

export const exportFormularioPdf = async (tipo: FormularioTipo, id: number): Promise<Blob> => {
  const response = await apiService
    .getHttpClient()
    .get(`/formularios/${tipo}/${id}/pdf`, { responseType: 'blob' });

  return response.data as Blob;
};

export const listTermosConsentimento = (
  beneficiariaId: number
): Promise<ApiResponse<any[]>> =>
  apiService.get(`/formularios/termos-consentimento/beneficiaria/${beneficiariaId}`);

export const revokeTermoConsentimento = (
  termoId: number,
  data?: TermoRevogacao
): Promise<ApiResponse<any>> => apiService.patch(`/formularios/termos-consentimento/${termoId}/revogacao`, data);

export const downloadTermoConsentimentoPdf = async (termoId: number): Promise<Blob> => {
  const response = await apiService
    .getHttpClient()
    .get(`/formularios/termos-consentimento/${termoId}/pdf`, { responseType: 'blob' });

  return response.data as Blob;
};

export const getFichaEvolucaoSeries = (
  beneficiariaId: number
): Promise<ApiResponse<any>> => apiService.get(`/formularios/ficha-evolucao/beneficiaria/${beneficiariaId}/series`);
