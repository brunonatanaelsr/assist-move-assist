import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { configuracoesApi } from '@/services/apiService';
import {
  configuracoesUsuariosKeys,
  useConfiguracoesUsuarioPermissoes,
  useConfiguracoesUsuarios,
  useCreateConfiguracaoUsuario,
  useSetConfiguracoesUsuarioPermissoes,
  useUpdateConfiguracaoUsuario,
} from '../useConfiguracoesUsuarios';

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

describe('useConfiguracoesUsuarios', () => {
  it('consulta lista de usuários e normaliza paginação', async () => {
    vi.spyOn(configuracoesApi, 'listUsers').mockResolvedValue({
      success: true,
      data: {
        data: [
          { id: 1, nome: 'Usuário Teste', email: 'teste@example.com', papel: 'admin', ativo: true },
        ],
        pagination: { page: 2, limit: 5, total: 15, totalPages: 3 },
      },
    } as any);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useConfiguracoesUsuarios({ page: 2, limit: 5 }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(configuracoesApi.listUsers).toHaveBeenCalledWith({ page: 2, limit: 5 });
    expect(result.current.data?.data).toHaveLength(1);
    expect(result.current.data?.pagination).toEqual({ page: 2, limit: 5, total: 15, totalPages: 3 });
  });

  it('propaga erro quando a API falha', async () => {
    vi.spyOn(configuracoesApi, 'listUsers').mockResolvedValue({ success: false, message: 'Falha' } as any);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useConfiguracoesUsuarios(), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe('Falha');
  });
});

describe('mutações de usuários', () => {
  it('invalida lista ao criar usuário', async () => {
    vi.spyOn(configuracoesApi, 'createUser').mockResolvedValue({ success: true } as any);

    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateConfiguracaoUsuario(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ email: 'novo@example.com', password: '123', nome: 'Novo' });
    });

    expect(configuracoesApi.createUser).toHaveBeenCalled();
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: configuracoesUsuariosKeys.lists(),
      exact: false,
    });
  });

  it('invalida lista ao atualizar usuário', async () => {
    vi.spyOn(configuracoesApi, 'updateUser').mockResolvedValue({ success: true } as any);

    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateConfiguracaoUsuario(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: 3, data: { ativo: false } });
    });

    expect(configuracoesApi.updateUser).toHaveBeenCalledWith(3, { ativo: false });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: configuracoesUsuariosKeys.lists(),
      exact: false,
    });
  });
});

describe('permissões de usuário', () => {
  it('busca permissões do usuário quando habilitado', async () => {
    vi.spyOn(configuracoesApi, 'getUserPermissions').mockResolvedValue({ success: true, data: ['config.view'] } as any);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useConfiguracoesUsuarioPermissoes(9), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(configuracoesApi.getUserPermissions).toHaveBeenCalledWith(9);
    expect(result.current.data).toEqual(['config.view']);
  });

  it('atualiza cache ao salvar permissões', async () => {
    vi.spyOn(configuracoesApi, 'setUserPermissions').mockResolvedValue({ success: true } as any);

    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    queryClient.setQueryData(configuracoesUsuariosKeys.permissions(7), ['old.permission']);

    const { result } = renderHook(() => useSetConfiguracoesUsuarioPermissoes(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ userId: 7, permissions: ['new.permission'] });
    });

    expect(configuracoesApi.setUserPermissions).toHaveBeenCalledWith(7, ['new.permission']);
    expect(queryClient.getQueryData(configuracoesUsuariosKeys.permissions(7))).toEqual(['new.permission']);
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: configuracoesUsuariosKeys.permissions(7),
    });
  });
});
