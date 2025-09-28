import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import apiService from '@/services/apiService';
import {
  configuracoesPermissoesKeys,
  useConfiguracoesPermissoes,
  useConfiguracoesRolePermissoes,
  useConfiguracoesRoles,
  useCreateConfiguracaoPermissao,
  useSetConfiguracoesRolePermissoes,
} from '../useConfiguracoesPermissoes';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

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

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return { wrapper, queryClient };
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useConfiguracoesPermissoes', () => {
  it('carrega permissões com paginação', async () => {
    vi.spyOn(apiService, 'listPermissions').mockResolvedValue({
      success: true,
      data: {
        data: [{ name: 'config.read', description: 'Ler configs' }],
        pagination: { page: 1, limit: 25, total: 1 },
      },
    } as any);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useConfiguracoesPermissoes({ page: 1, limit: 25 }), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(apiService.listPermissions).toHaveBeenCalledWith({ page: 1, limit: 25 });
    expect(result.current.data?.data).toHaveLength(1);
    expect(result.current.data?.pagination.page).toBe(1);
  });

  it('propaga erro ao listar permissões', async () => {
    vi.spyOn(apiService, 'listPermissions').mockResolvedValue({ success: false, message: 'Erro' } as any);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useConfiguracoesPermissoes(), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe('Erro');
  });
});

describe('papéis e permissões', () => {
  it('lista papéis existentes', async () => {
    vi.spyOn(apiService, 'listRoles').mockResolvedValue({ success: true, data: ['admin'] } as any);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useConfiguracoesRoles(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(['admin']);
  });

  it('busca permissões de um papel específico', async () => {
    vi.spyOn(apiService, 'getRolePermissions').mockResolvedValue({ success: true, data: ['config.read'] } as any);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useConfiguracoesRolePermissoes('admin'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(['config.read']);
  });

  it('atualiza permissões do papel e sincroniza cache', async () => {
    vi.spyOn(apiService, 'setRolePermissions').mockResolvedValue({ success: true } as any);

    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    queryClient.setQueryData(configuracoesPermissoesKeys.rolePermissions('admin'), ['old']);

    const { result } = renderHook(() => useSetConfiguracoesRolePermissoes(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ role: 'admin', permissions: ['new'] });
    });

    expect(apiService.setRolePermissions).toHaveBeenCalledWith('admin', ['new']);
    expect(queryClient.getQueryData(configuracoesPermissoesKeys.rolePermissions('admin'))).toEqual(['new']);
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: configuracoesPermissoesKeys.rolePermissions('admin'),
    });
  });
});

describe('mutações de permissões', () => {
  it('invalida lista ao criar permissão', async () => {
    vi.spyOn(apiService, 'createPermission').mockResolvedValue({ success: true } as any);

    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateConfiguracaoPermissao(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ name: 'config.create' });
    });

    expect(apiService.createPermission).toHaveBeenCalledWith('config.create', undefined);
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: configuracoesPermissoesKeys.lists(),
      exact: false,
    });
  });
});
