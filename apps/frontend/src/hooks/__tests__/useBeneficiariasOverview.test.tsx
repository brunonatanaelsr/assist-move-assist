import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useBeneficiariasOverview } from '../useBeneficiariasOverview';
import { beneficiariasService } from '@/services/api';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
    },
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return { wrapper, queryClient };
};

describe('useBeneficiariasOverview', () => {
  let listarSpy: ReturnType<typeof vi.spyOn<typeof beneficiariasService, 'listar'>>;
  let buscarSpy: ReturnType<typeof vi.spyOn<typeof beneficiariasService, 'buscarPorId'>>;

  beforeEach(() => {
    listarSpy = vi.spyOn(beneficiariasService, 'listar').mockResolvedValue({ success: true, data: [] });
    buscarSpy = vi.spyOn(beneficiariasService, 'buscarPorId').mockResolvedValue({ success: true, data: {} });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('monta estatísticas e realiza prefetch da primeira beneficiária', async () => {
    const beneficiarias = [
      { id: 1, nome_completo: 'Ana', cpf: '111', data_nascimento: '1990-01-01', status: 'ativa', ativo: true },
      { id: 2, nome_completo: 'Beatriz', cpf: '222', data_nascimento: '1991-01-01', status: 'inativa', ativo: false },
      { id: 3, nome_completo: 'Carla', cpf: '333', data_nascimento: '1992-01-01', status: 'pendente', ativo: true },
    ];

    listarSpy.mockResolvedValueOnce({
      success: true,
      data: beneficiarias,
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useBeneficiariasOverview(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.beneficiarias).toHaveLength(3);
    expect(result.current.data?.stats).toEqual({ total: 3, ativas: 1, aguardando: 1, inativas: 1 });

    await waitFor(() => {
      expect(buscarSpy).toHaveBeenCalledWith('1');
    });
  });

  it('retorna mensagem de erro quando a API sinaliza falha', async () => {
    listarSpy.mockResolvedValueOnce({
      success: false,
      data: [],
      message: 'Erro ao carregar',
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useBeneficiariasOverview(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.beneficiarias).toEqual([]);
    expect(result.current.data?.stats).toEqual({ total: 0, ativas: 0, aguardando: 0, inativas: 0 });
    expect(result.current.data?.backendError).toBe('Erro ao carregar');
    expect(buscarSpy).not.toHaveBeenCalled();
  });
});
