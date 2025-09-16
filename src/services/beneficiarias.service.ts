import type { Beneficiaria } from '@/types/shared';
import { api } from '@/services/api';
import { normalizeCpf, normalizePhone } from '@/lib/format';

export const BeneficiariasService = {
    listar: async (params?: {
        page?: number;
        limit?: number;
        status?: Beneficiaria['status'];
        search?: string;
<<<<<<< HEAD
    }): Promise<Beneficiaria[]> => {
        const response = await api.get<Beneficiaria[]>('/beneficiarias', { params });
        return response.data;
    },
        buscarPorId: async (id: number): Promise<ApiResponse<Beneficiaria>> => {
            const response = await api.get(`/beneficiarias/${id}`);
            return response.data as ApiResponse<Beneficiaria>;
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
        atualizar: async (id: number, beneficiaria: Partial<Beneficiaria>): Promise<ApiResponse<Beneficiaria>> => {
            const payload: Partial<Beneficiaria> = {
                ...beneficiaria,
                cpf: beneficiaria?.cpf ? normalizeCpf(String(beneficiaria.cpf)) : undefined,
                telefone: beneficiaria?.telefone ? normalizePhone(String(beneficiaria.telefone)) : undefined,
            };
            if (payload.status && typeof payload.status === 'string') {
                payload.status = payload.status.toLowerCase() as Beneficiaria['status'];
            }
            const response = await api.put(`/beneficiarias/${id}`, payload);
            return response.data as ApiResponse<Beneficiaria>;
        return response.data;
    },

    arquivar: async (id: number): Promise<void> => {
        arquivar: async (id: number): Promise<ApiResponse<void>> => {
            const response = await api.patch(`/beneficiarias/${id}/arquivar`);
            return response.data as ApiResponse<void>;
        await api.patch(`/beneficiarias/${id}/arquivar`);
=======
    }): Promise<ApiResponse<Beneficiaria[]>> => {
        const response = await api.get('/beneficiarias', { params });
        return response.data as ApiResponse<Beneficiaria[]>;
    },

    buscarPorId: async (id: number): Promise<ApiResponse<Beneficiaria>> => {
        const response = await api.get(`/beneficiarias/${id}`);
        return response.data as ApiResponse<Beneficiaria>;
    },

    criar: async (beneficiaria: Partial<Beneficiaria>): Promise<ApiResponse<Beneficiaria>> => {
            const payload: Partial<Beneficiaria> = {
                ...beneficiaria,
                cpf: beneficiaria?.cpf ? normalizeCpf(String(beneficiaria.cpf)) : undefined,
                telefone: beneficiaria?.telefone ? normalizePhone(String(beneficiaria.telefone)) : undefined,
                // contato1 e contato2 não existem no tipo Beneficiaria, mas se existirem, adicione ao tipo Beneficiaria
            };
            // Garantir que status esteja padronizado
            if (payload.status && typeof payload.status === 'string') {
                payload.status = payload.status.toLowerCase() as Beneficiaria['status'];
            }
        const response = await api.post('/beneficiarias', payload);
        return response.data as ApiResponse<Beneficiaria>;
    },

    atualizar: async (id: number, beneficiaria: Partial<Beneficiaria>): Promise<ApiResponse<Beneficiaria>> => {
            const payload: Partial<Beneficiaria> = {
                ...beneficiaria,
                cpf: beneficiaria?.cpf ? normalizeCpf(String(beneficiaria.cpf)) : undefined,
                telefone: beneficiaria?.telefone ? normalizePhone(String(beneficiaria.telefone)) : undefined,
            };
            if (payload.status && typeof payload.status === 'string') {
                payload.status = payload.status.toLowerCase() as Beneficiaria['status'];
            }
        const response = await api.put(`/beneficiarias/${id}`, payload);
        return response.data as ApiResponse<Beneficiaria>;
    },

    arquivar: async (id: number): Promise<ApiResponse<void>> => {
        const response = await api.patch(`/beneficiarias/${id}/arquivar`);
        return response.data as ApiResponse<void>;
>>>>>>> 1d267c4 (fix: ajustes de exportação, blocos e sintaxe em hooks para testes passarem)
    },

    // Métodos relacionados à informação socioeconômica
    atualizarInfoSocioeconomica: async (
        id: number,
        info: Beneficiaria['info_socioeconomica']
<<<<<<< HEAD
    ): Promise<Beneficiaria> => {
        const response = await api.put<Beneficiaria>(`/beneficiarias/${id}/info-socioeconomica`, info);
        return response.data;
=======
    ): Promise<ApiResponse<Beneficiaria>> => {
        const response = await api.put(`/beneficiarias/${id}/info-socioeconomica`, info);
        return response.data as ApiResponse<Beneficiaria>;
>>>>>>> 1d267c4 (fix: ajustes de exportação, blocos e sintaxe em hooks para testes passarem)
    },

    // Métodos relacionados a dependentes
    adicionarDependente: async (
        id: number,
        dependente: Omit<NonNullable<Beneficiaria['dependentes']>[0], 'id'>
<<<<<<< HEAD
    ): Promise<Beneficiaria> => {
        const response = await api.post<Beneficiaria>(`/beneficiarias/${id}/dependentes`, dependente);
        return response.data;
=======
    ): Promise<ApiResponse<Beneficiaria>> => {
        const response = await api.post(`/beneficiarias/${id}/dependentes`, dependente);
        return response.data as ApiResponse<Beneficiaria>;
>>>>>>> 1d267c4 (fix: ajustes de exportação, blocos e sintaxe em hooks para testes passarem)
    },

    removerDependente: async (
        id: number,
        dependenteId: number
<<<<<<< HEAD
    ): Promise<void> => {
        await api.delete(`/beneficiarias/${id}/dependentes/${dependenteId}`);
=======
    ): Promise<ApiResponse<void>> => {
        const response = await api.delete(`/beneficiarias/${id}/dependentes/${dependenteId}`);
        return response.data as ApiResponse<void>;
>>>>>>> 1d267c4 (fix: ajustes de exportação, blocos e sintaxe em hooks para testes passarem)
    },

    // Métodos relacionados ao histórico de atendimentos
    adicionarAtendimento: async (
        id: number,
        atendimento: Omit<NonNullable<Beneficiaria['historico_atendimentos']>[0], 'id'>
<<<<<<< HEAD
    ): Promise<Beneficiaria> => {
        const response = await api.post<Beneficiaria>(`/beneficiarias/${id}/atendimentos`, atendimento);
        return response.data;
=======
    ): Promise<ApiResponse<Beneficiaria>> => {
        const response = await api.post(`/beneficiarias/${id}/atendimentos`, atendimento);
        return response.data as ApiResponse<Beneficiaria>;
>>>>>>> 1d267c4 (fix: ajustes de exportação, blocos e sintaxe em hooks para testes passarem)
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
        return response.data as ApiResponse<{ foto_url: string }>;
    }
};
