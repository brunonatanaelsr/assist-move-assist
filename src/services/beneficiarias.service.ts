import type { Beneficiaria } from '@/types/shared';
import { api } from '@/services/api';
import { normalizeCpf, normalizePhone } from '@/lib/format';

// Algumas rotas aceitam contatos auxiliares que não fazem parte do tipo base
// mas podem ser enviados pelo formulário. Mantemos os campos opcionais para
// aplicar a mesma normalização.
type BeneficiariaPayload = Partial<Beneficiaria> & {
  contato1?: string | null;
  contato2?: string | null;
};

const sanitizeBeneficiariaPayload = (beneficiaria: BeneficiariaPayload): BeneficiariaPayload => {
  const payload: BeneficiariaPayload = { ...beneficiaria };

  if (payload.cpf != null) {
    payload.cpf = normalizeCpf(String(payload.cpf));
  }

  if (payload.telefone != null) {
    payload.telefone = normalizePhone(String(payload.telefone));
  }

  if (payload.contato1 != null) {
    payload.contato1 = normalizePhone(String(payload.contato1));
  }

  if (payload.contato2 != null) {
    payload.contato2 = normalizePhone(String(payload.contato2));
  }

  if (payload.status) {
    payload.status = payload.status.toLowerCase() as Beneficiaria['status'];
  }

  return payload;
};

export const BeneficiariasService = {
  listar: async (params?: {
    page?: number;
    limit?: number;
    status?: Beneficiaria['status'];
    search?: string;
  }): Promise<Beneficiaria[]> => {
    const response = await api.get<Beneficiaria[]>('/beneficiarias', { params });
    return response.data;
  },

  buscarPorId: async (id: number): Promise<Beneficiaria> => {
    const response = await api.get<Beneficiaria>(`/beneficiarias/${id}`);
    return response.data;
  },

  criar: async (beneficiaria: BeneficiariaPayload): Promise<Beneficiaria> => {
    const payload = sanitizeBeneficiariaPayload(beneficiaria);
    const response = await api.post<Beneficiaria>('/beneficiarias', payload);
    return response.data;
  },

  atualizar: async (id: number, beneficiaria: BeneficiariaPayload): Promise<Beneficiaria> => {
    const payload = sanitizeBeneficiariaPayload(beneficiaria);
    const response = await api.put<Beneficiaria>(`/beneficiarias/${id}`, payload);
    return response.data;
  },

  arquivar: async (id: number): Promise<void> => {
    await api.patch(`/beneficiarias/${id}/arquivar`);
  },

  atualizarInfoSocioeconomica: async (
    id: number,
    info: Beneficiaria['info_socioeconomica']
  ): Promise<Beneficiaria> => {
    const response = await api.put<Beneficiaria>(`/beneficiarias/${id}/info-socioeconomica`, info);
    return response.data;
  },

  adicionarDependente: async (
    id: number,
    dependente: Omit<NonNullable<Beneficiaria['dependentes']>[0], 'id'>
  ): Promise<Beneficiaria> => {
    const response = await api.post<Beneficiaria>(`/beneficiarias/${id}/dependentes`, dependente);
    return response.data;
  },

  removerDependente: async (id: number, dependenteId: number): Promise<void> => {
    await api.delete(`/beneficiarias/${id}/dependentes/${dependenteId}`);
  },

  adicionarAtendimento: async (
    id: number,
    atendimento: Omit<NonNullable<Beneficiaria['historico_atendimentos']>[0], 'id'>
  ): Promise<Beneficiaria> => {
    const response = await api.post<Beneficiaria>(`/beneficiarias/${id}/atendimentos`, atendimento);
    return response.data;
  },

  uploadFoto: async (id: number, foto: File): Promise<{ foto_url: string }> => {
    const formData = new FormData();
    formData.append('foto', foto);

    const response = await api.post<{ foto_url: string }>(`/beneficiarias/${id}/foto`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },
};

export default BeneficiariasService;
