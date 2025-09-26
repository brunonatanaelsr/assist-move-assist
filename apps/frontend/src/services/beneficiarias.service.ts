import type { Beneficiaria } from '@/types/shared';
import { api } from '@/services/api';
import { normalizeCpf, normalizePhone } from '@/lib/format';

export type ServiceResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
};

export const BeneficiariasService = {
  listar: async (params?: {
    page?: number;
    limit?: number;
    status?: Beneficiaria['status'];
    search?: string;
  }): Promise<ServiceResponse<Beneficiaria[]>> => {
    const response = await api.get<ServiceResponse<Beneficiaria[]>>('/beneficiarias', { params });
    return response.data;
  },

  buscarPorId: async (id: number): Promise<ServiceResponse<Beneficiaria>> => {
    const response = await api.get<ServiceResponse<Beneficiaria>>(`/beneficiarias/${id}`);
    return response.data;
  },

  criar: async (beneficiaria: Partial<Beneficiaria>): Promise<ServiceResponse<Beneficiaria>> => {
    const payload: Partial<Beneficiaria> = {
      ...beneficiaria,
      cpf: beneficiaria?.cpf ? normalizeCpf(String(beneficiaria.cpf)) : undefined,
      telefone: beneficiaria?.telefone ? normalizePhone(String(beneficiaria.telefone)) : undefined,
    };

    const response = await api.post<ServiceResponse<Beneficiaria>>('/beneficiarias', payload);
    return response.data;
  },

  atualizar: async (id: number, beneficiaria: Partial<Beneficiaria>): Promise<ServiceResponse<Beneficiaria>> => {
    const payload: Partial<Beneficiaria> = {
      ...beneficiaria,
      cpf: beneficiaria?.cpf ? normalizeCpf(String(beneficiaria.cpf)) : undefined,
      telefone: beneficiaria?.telefone ? normalizePhone(String(beneficiaria.telefone)) : undefined,
    };

    if (payload.status && typeof payload.status === 'string') {
      payload.status = payload.status.toLowerCase() as Beneficiaria['status'];
    }

    const response = await api.put<ServiceResponse<Beneficiaria>>(`/beneficiarias/${id}`, payload);
    return response.data;
  },

  arquivar: async (id: number): Promise<ServiceResponse<void>> => {
    const response = await api.patch<ServiceResponse<void>>(`/beneficiarias/${id}/arquivar`);
    return response.data;
  },

  atualizarInfoSocioeconomica: async (
    id: number,
    info: Beneficiaria['info_socioeconomica']
  ): Promise<ServiceResponse<Beneficiaria>> => {
    const response = await api.put<ServiceResponse<Beneficiaria>>(`/beneficiarias/${id}/info-socioeconomica`, info);
    return response.data;
  },

  adicionarDependente: async (
    id: number,
    dependente: Omit<NonNullable<Beneficiaria['dependentes']>[0], 'id'>
  ): Promise<ServiceResponse<Beneficiaria>> => {
    const response = await api.post<ServiceResponse<Beneficiaria>>(`/beneficiarias/${id}/dependentes`, dependente);
    return response.data;
  },

  removerDependente: async (id: number, dependenteId: number): Promise<ServiceResponse<void>> => {
    const response = await api.delete<ServiceResponse<void>>(`/beneficiarias/${id}/dependentes/${dependenteId}`);
    return response.data;
  },

  adicionarAtendimento: async (
    id: number,
    atendimento: Omit<NonNullable<Beneficiaria['historico_atendimentos']>[0], 'id'>
  ): Promise<ServiceResponse<Beneficiaria>> => {
    const response = await api.post<ServiceResponse<Beneficiaria>>(`/beneficiarias/${id}/atendimentos`, atendimento);
    return response.data;
  },

  uploadFoto: async (id: number, foto: File): Promise<ServiceResponse<{ foto_url: string }>> => {
    const formData = new FormData();
    formData.append('foto', foto);

    const response = await api.post<ServiceResponse<{ foto_url: string }>>(
      `/beneficiarias/${id}/foto`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data;
  },
};

export default BeneficiariasService;
