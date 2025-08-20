import type { Beneficiaria } from '@/types/shared';
import { apiService, ApiResponse } from './api.service';

export const BeneficiariasService = {
    listar: async (params?: {
        page?: number;
        limit?: number;
        status?: Beneficiaria['status'];
        search?: string;
    }): Promise<ApiResponse<Beneficiaria[]>> => {
        const response = await apiService.get('/beneficiarias', { params });
        return response.data;
    },

    buscarPorId: async (id: number): Promise<ApiResponse<Beneficiaria>> => {
        const response = await api.get(`/beneficiarias/${id}`);
        return response.data;
    },

    criar: async (beneficiaria: Partial<Beneficiaria>): Promise<ApiResponse<Beneficiaria>> => {
        const response = await api.post('/beneficiarias', beneficiaria);
        return response.data;
    },

    atualizar: async (id: number, beneficiaria: Partial<Beneficiaria>): Promise<ApiResponse<Beneficiaria>> => {
        const response = await api.put(`/beneficiarias/${id}`, beneficiaria);
        return response.data;
    },

    arquivar: async (id: number): Promise<ApiResponse<void>> => {
        const response = await api.patch(`/beneficiarias/${id}/arquivar`);
        return response.data;
    },

    // Métodos relacionados à informação socioeconômica
    atualizarInfoSocioeconomica: async (
        id: number, 
        info: Beneficiaria['info_socioeconomica']
    ): Promise<ApiResponse<Beneficiaria>> => {
        const response = await api.put(`/beneficiarias/${id}/info-socioeconomica`, info);
        return response.data;
    },

    // Métodos relacionados a dependentes
    adicionarDependente: async (
        id: number,
        dependente: Omit<NonNullable<Beneficiaria['dependentes']>[0], 'id'>
    ): Promise<ApiResponse<Beneficiaria>> => {
        const response = await api.post(`/beneficiarias/${id}/dependentes`, dependente);
        return response.data;
    },

    removerDependente: async (
        id: number,
        dependenteId: number
    ): Promise<ApiResponse<void>> => {
        const response = await api.delete(`/beneficiarias/${id}/dependentes/${dependenteId}`);
        return response.data;
    },

    // Métodos relacionados ao histórico de atendimentos
    adicionarAtendimento: async (
        id: number,
        atendimento: Omit<NonNullable<Beneficiaria['historico_atendimentos']>[0], 'id'>
    ): Promise<ApiResponse<Beneficiaria>> => {
        const response = await api.post(`/beneficiarias/${id}/atendimentos`, atendimento);
        return response.data;
    },

    // Upload de foto
    uploadFoto: async (id: number, foto: File): Promise<ApiResponse<{ foto_url: string }>> => {
        const formData = new FormData();
        formData.append('foto', foto);
        
        const response = await api.post(`/beneficiarias/${id}/foto`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    }
};
