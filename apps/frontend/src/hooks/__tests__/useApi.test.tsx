import { beforeEach, afterEach, vi, describe, it, expect } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { apiService } from '@/services/apiService';
import useApi, { useBeneficiarias, useCreateParticipacao, useParticipacoes, useUpdateParticipacao } from '../useApi';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient, children });

  return { wrapper, queryClient };
};

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('useApi hooks', () => {
  beforeEach(() => {
    vi.spyOn(apiService, 'getBeneficiarias').mockResolvedValue({ success: true, data: [] });
    vi.spyOn(apiService, 'createBeneficiaria').mockResolvedValue({ success: true, data: {} });
    vi.spyOn(apiService, 'updateBeneficiaria').mockResolvedValue({ success: true, data: {} });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deve inicializar useApi sem erro', () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useApi(), { wrapper });
    expect(result.current).toBeDefined();
  });

  it('deve normalizar dados e paginação ao listar beneficiárias', async () => {
    const pagination = { page: 2, limit: 20, total: 40, totalPages: 2 };
    (apiService.getBeneficiarias as any).mockResolvedValueOnce({
      success: true,
      data: [{ id: 1 }],
      pagination,
      total: pagination.total,
    });

    const params = { page: 2, limit: 20 };
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useBeneficiarias(params), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(apiService.getBeneficiarias).toHaveBeenCalledWith(params);
    expect(result.current.data).toEqual({ items: [{ id: 1 }], pagination });
  });

  it('deve retornar array de dados e sem paginação quando a resposta for simples', async () => {
    (apiService.getBeneficiarias as any).mockResolvedValueOnce({
      success: true,
      data: [{ id: 1 }, { id: 2 }],
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useBeneficiarias(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(apiService.getBeneficiarias).toHaveBeenCalledWith(undefined);
    expect(result.current.data).toEqual({ items: [{ id: 1 }, { id: 2 }], pagination: undefined });
  });

  it('deve enviar o filtro correto ao buscar participações', async () => {
    vi.spyOn(apiService, 'getParticipacoes').mockResolvedValue({ success: true, data: [] });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useParticipacoes('beneficiaria-1'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(apiService.getParticipacoes).toHaveBeenCalledWith({ beneficiaria_id: 'beneficiaria-1' });
  });

  it('deve invalidar a lista de participações ao criar uma nova', async () => {
    vi.spyOn(apiService, 'createParticipacao').mockResolvedValue({ success: true, data: {} });
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateParticipacao(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ beneficiaria_id: 'beneficiaria-2' });
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['participacoes', { beneficiaria_id: 'beneficiaria-2' }],
    });
  });

  it('deve invalidar a lista de participações ao atualizar um registro', async () => {
    vi.spyOn(apiService, 'updateParticipacao').mockResolvedValue({ success: true, data: {} });
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateParticipacao(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        id: 'participacao-1',
        data: { beneficiaria_id: 'beneficiaria-3' },
      });
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['participacoes', { beneficiaria_id: 'beneficiaria-3' }],
    });
  });
});
