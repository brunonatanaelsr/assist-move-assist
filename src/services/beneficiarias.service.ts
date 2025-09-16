import type { Beneficiaria } from '@/types/shared';
import { api } from '@/services/api';
import { normalizeCpf, normalizePhone } from '@/lib/format';

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

    criar: async (beneficiaria: Partial<Beneficiaria>): Promise<Beneficiaria> => {
        const payload = {
            ...beneficiaria,
            cpf: beneficiaria?.cpf ? normalizeCpf(String(beneficiaria.cpf)) : undefined,
            telefone: (beneficiaria as any)?.telefone ? normalizePhone(String((beneficiaria as any).telefone)) : undefined,
            contato1: (beneficiaria as any)?.contato1 ? normalizePhone(String((beneficiaria as any).contato1)) : undefined,
            contato2: (beneficiaria as any)?.contato2 ? normalizePhone(String((beneficiaria as any).contato2)) : undefined,
        } as any;
        const response = await api.post<Beneficiaria>('/beneficiarias', payload);
        return response.data;
    },

    atualizar: async (id: number, beneficiaria: Partial<Beneficiaria>): Promise<Beneficiaria> => {
        const payload = {
            ...beneficiaria,
            cpf: beneficiaria?.cpf ? normalizeCpf(String(beneficiaria.cpf)) : undefined,
            telefone: (beneficiaria as any)?.telefone ? normalizePhone(String((beneficiaria as any).telefone)) : undefined,
            contato1: (beneficiaria as any)?.contato1 ? normalizePhone(String((beneficiaria as any).contato1)) : undefined,
            contato2: (beneficiaria as any)?.contato2 ? normalizePhone(String((beneficiaria as any).contato2)) : undefined,
        } as any;
        const response = await api.put<Beneficiaria>(`/beneficiarias/${id}`, payload);
        return response.data;
    },

    arquivar: async (id: number): Promise<void> => {
        await api.patch(`/beneficiarias/${id}/arquivar`);
    },

    // Métodos relacionados à informação socioeconômica
    atualizarInfoSocioeconomica: async (
        id: number,
        info: Beneficiaria['info_socioeconomica']
    ): Promise<Beneficiaria> => {
        const response = await api.put<Beneficiaria>(`/beneficiarias/${id}/info-socioeconomica`, info);
        return response.data;
    },

    // Métodos relacionados a dependentes
    adicionarDependente: async (
        id: number,
        dependente: Omit<NonNullable<Beneficiaria['dependentes']>[0], 'id'>
    ): Promise<Beneficiaria> => {
        const response = await api.post<Beneficiaria>(`/beneficiarias/${id}/dependentes`, dependente);
        return response.data;
    },

    removerDependente: async (
        id: number,
        dependenteId: number
    ): Promise<void> => {
        await api.delete(`/beneficiarias/${id}/dependentes/${dependenteId}`);
    },

    // Métodos relacionados ao histórico de atendimentos
    adicionarAtendimento: async (
        id: number,
        atendimento: Omit<NonNullable<Beneficiaria['historico_atendimentos']>[0], 'id'>
    ): Promise<Beneficiaria> => {
        const response = await api.post<Beneficiaria>(`/beneficiarias/${id}/atendimentos`, atendimento);
        return response.data;
    },

    // Upload de foto
    uploadFoto: async (id: number, foto: File): Promise<{ foto_url: string }> => {
        const formData = new FormData();
        formData.append('foto', foto);

        const response = await api.post<{ foto_url: string }>(`/beneficiarias/${id}/foto`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    }
};
