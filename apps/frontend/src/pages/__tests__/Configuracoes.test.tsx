import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import Configuracoes from '../Configuracoes';
import type {
  ConfiguracaoUsuario,
  PaginatedCollection,
  PermissionSummary,
  UsuarioPermissions,
} from '@/types/configuracoes';

const createQueryResult = <T,>(
  overrides: Partial<UseQueryResult<T, Error>> = {},
): UseQueryResult<T, Error> => ({
  data: undefined,
  error: null,
  isLoading: false,
  isError: false,
  isSuccess: true,
  status: 'success',
  fetchStatus: 'idle',
  refetch: vi.fn(),
  isFetching: false,
  failureCount: 0,
  isFetched: true,
  isFetchedAfterMount: true,
  isFetchingNextPage: false,
  isFetchingPreviousPage: false,
  isInitialLoading: false,
  isPaused: false,
  isPlaceholderData: false,
  isRefetchError: false,
  isRefetching: false,
  dataUpdatedAt: 0,
  errorUpdatedAt: 0,
  ...overrides,
}) as UseQueryResult<T, Error>;

const createMutationResult = <TData, TVariables>(
  overrides: Partial<UseMutationResult<TData, Error, TVariables, unknown>> = {},
): UseMutationResult<TData, Error, TVariables, unknown> => ({
  mutate: vi.fn(),
  mutateAsync: vi.fn().mockResolvedValue(undefined),
  isPending: false,
  reset: vi.fn(),
  data: undefined,
  error: null,
  isError: false,
  isIdle: false,
  isPaused: false,
  isSuccess: true,
  status: 'success',
  failureCount: 0,
  variables: undefined,
  context: undefined,
  submittedAt: 0,
  ...overrides,
});

vi.mock('@/hooks/useConfiguracoesUsuarios', () => {
  const hooks = {
    useConfiguracoesUsuarios: vi.fn(),
    useCreateConfiguracaoUsuario: vi.fn(),
    useUpdateConfiguracaoUsuario: vi.fn(),
    useResetConfiguracaoUsuarioSenha: vi.fn(),
    useConfiguracoesUsuarioPermissoes: vi.fn(),
    useSetConfiguracoesUsuarioPermissoes: vi.fn(),
    useUsuariosPaginationInfo: vi.fn(),
  };
  return {
    __esModule: true,
    default: (...args: unknown[]) => hooks.useConfiguracoesUsuarios(...(args as [])),
    ...hooks,
  };
});

vi.mock('@/hooks/useConfiguracoesPermissoes', () => {
  const hooks = {
    useConfiguracoesPermissoes: vi.fn(),
    useConfiguracoesRoles: vi.fn(),
    useConfiguracoesRolePermissoes: vi.fn(),
    useCreateConfiguracaoPermissao: vi.fn(),
    useSetConfiguracoesRolePermissoes: vi.fn(),
    usePermissionsPaginationInfo: vi.fn(),
  };
  return {
    __esModule: true,
    default: (...args: unknown[]) => hooks.useConfiguracoesPermissoes(...(args as [])),
    ...hooks,
  };
});

import * as usuariosModule from '@/hooks/useConfiguracoesUsuarios';
import * as permissoesModule from '@/hooks/useConfiguracoesPermissoes';

const sampleUsuarios: PaginatedCollection<ConfiguracaoUsuario> = {
  data: [
    { id: 1, nome: 'Usuário Teste', email: 'teste@example.com', papel: 'admin', ativo: true },
  ],
  pagination: { page: 1, limit: 10, total: 1 },
};

const samplePermissoes: PaginatedCollection<PermissionSummary> = {
  data: [
    { name: 'geral.visualizar', description: 'Pode visualizar' },
    { name: 'geral.editar', description: 'Pode editar' },
  ],
  pagination: { page: 1, limit: 50, total: 2 },
};

const defaultUserPermissions: UsuarioPermissions = ['geral.visualizar'];

beforeEach(() => {
  vi.resetAllMocks();

  (usuariosModule.useConfiguracoesUsuarios as any).mockReturnValue(
    createQueryResult<PaginatedCollection<ConfiguracaoUsuario>>({ data: sampleUsuarios }),
  );
  (usuariosModule.useUsuariosPaginationInfo as any).mockReturnValue({
    total: sampleUsuarios.pagination.total,
    totalPages: 1,
    page: sampleUsuarios.pagination.page,
    limit: sampleUsuarios.pagination.limit,
  });
  (usuariosModule.useCreateConfiguracaoUsuario as any).mockReturnValue(createMutationResult());
  (usuariosModule.useUpdateConfiguracaoUsuario as any).mockReturnValue(createMutationResult());
  (usuariosModule.useResetConfiguracaoUsuarioSenha as any).mockReturnValue(createMutationResult());
  (usuariosModule.useSetConfiguracoesUsuarioPermissoes as any).mockReturnValue(createMutationResult());
  (usuariosModule.useConfiguracoesUsuarioPermissoes as any).mockImplementation((userId: number | null) =>
    createQueryResult<UsuarioPermissions>({ data: userId ? defaultUserPermissions : [] }),
  );

  (permissoesModule.useConfiguracoesPermissoes as any).mockImplementation((params: any) => {
    if (params?.limit === 500) {
      return createQueryResult<PaginatedCollection<PermissionSummary>>({
        data: { ...samplePermissoes, pagination: { page: 1, limit: 500, total: samplePermissoes.data.length } },
      });
    }
    if (params?.limit === 200) {
      return createQueryResult<PaginatedCollection<PermissionSummary>>({
        data: { ...samplePermissoes, pagination: { page: 1, limit: 200, total: samplePermissoes.data.length } },
      });
    }
    return createQueryResult<PaginatedCollection<PermissionSummary>>({ data: samplePermissoes });
  });
  (permissoesModule.useConfiguracoesRoles as any).mockReturnValue(createQueryResult<string[]>({ data: ['admin'] }));
  (permissoesModule.useConfiguracoesRolePermissoes as any).mockImplementation((role: string) =>
    createQueryResult<UsuarioPermissions>({ data: role ? defaultUserPermissions : [] }),
  );
  (permissoesModule.useSetConfiguracoesRolePermissoes as any).mockReturnValue(createMutationResult());
  (permissoesModule.useCreateConfiguracaoPermissao as any).mockReturnValue(createMutationResult());
  (permissoesModule.usePermissionsPaginationInfo as any).mockReturnValue({
    total: samplePermissoes.pagination.total,
    totalPages: 1,
    page: samplePermissoes.pagination.page,
    limit: samplePermissoes.pagination.limit,
  });
});

describe('Página Configurações', () => {
  it('exibe dados carregados dos hooks', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Configuracoes />
      </MemoryRouter>,
    );

    await act(async () => {
      await user.click(screen.getByRole('tab', { name: 'Usuários' }));
    });
    expect(await screen.findByText('Usuário Teste')).toBeInTheDocument();

    const permissoesButtons = screen
      .getAllByRole('button', { name: 'Permissões' })
      .filter((button) => button.getAttribute('role') !== 'tab');
    await act(async () => {
      await user.click(permissoesButtons[0]);
    });

    expect(await screen.findByText('Permissões do usuário 1')).toBeInTheDocument();
    expect(screen.getByText('geral.visualizar')).toBeInTheDocument();

    await act(async () => {
      await user.click(screen.getByRole('tab', { name: 'Papéis' }));
    });
    expect(await screen.findByText('Papéis existentes: admin')).toBeInTheDocument();

    await act(async () => {
      await user.click(screen.getByRole('tab', { name: 'Permissões' }));
    });
    expect(await screen.findByText('Criar permissão')).toBeInTheDocument();
    expect(screen.getByText('geral.editar')).toBeInTheDocument();
  });

  it('exibe estados de carregamento', async () => {
    const user = userEvent.setup();

    (usuariosModule.useConfiguracoesUsuarios as any).mockReturnValue(
      createQueryResult<PaginatedCollection<ConfiguracaoUsuario>>({
        isLoading: true,
        isSuccess: false,
        status: 'pending',
      }),
    );
    (permissoesModule.useConfiguracoesPermissoes as any).mockReturnValue(
      createQueryResult<PaginatedCollection<PermissionSummary>>({
        isLoading: true,
        isSuccess: false,
        status: 'pending',
      }),
    );
    (permissoesModule.useConfiguracoesRoles as any).mockReturnValue(
      createQueryResult<string[]>({ isLoading: true, isSuccess: false, status: 'pending' }),
    );
    (permissoesModule.useConfiguracoesRolePermissoes as any).mockReturnValue(
      createQueryResult<UsuarioPermissions>({ isLoading: true, isSuccess: false, status: 'pending' }),
    );

    render(
      <MemoryRouter>
        <Configuracoes />
      </MemoryRouter>,
    );

    await act(async () => {
      await user.click(screen.getByRole('tab', { name: 'Usuários' }));
    });
    expect(await screen.findByText('Carregando usuários...')).toBeInTheDocument();

    await act(async () => {
      await user.click(screen.getByRole('tab', { name: 'Papéis' }));
    });
    expect(await screen.findByText('Carregando permissões...')).toBeInTheDocument();

    await act(async () => {
      await user.click(screen.getByRole('tab', { name: 'Permissões' }));
    });
    expect(await screen.findByText('Carregando permissões...')).toBeInTheDocument();
  });

  it('exibe mensagens de erro', async () => {
    const user = userEvent.setup();

    (usuariosModule.useConfiguracoesUsuarios as any).mockReturnValue(
      createQueryResult<PaginatedCollection<ConfiguracaoUsuario>>({
        isError: true,
        isSuccess: false,
        error: new Error('Erro usuários'),
        status: 'error',
      }),
    );
    (permissoesModule.useConfiguracoesPermissoes as any).mockReturnValue(
      createQueryResult<PaginatedCollection<PermissionSummary>>({
        isError: true,
        isSuccess: false,
        error: new Error('Erro permissões'),
        status: 'error',
      }),
    );
    (permissoesModule.useConfiguracoesRoles as any).mockReturnValue(
      createQueryResult<string[]>({ isError: true, isSuccess: false, error: new Error('Erro papéis'), status: 'error' }),
    );
    (permissoesModule.useConfiguracoesRolePermissoes as any).mockReturnValue(
      createQueryResult<UsuarioPermissions>({
        isError: true,
        isSuccess: false,
        error: new Error('Erro role'),
        status: 'error',
      }),
    );

    render(
      <MemoryRouter>
        <Configuracoes />
      </MemoryRouter>,
    );

    await act(async () => {
      await user.click(screen.getByRole('tab', { name: 'Usuários' }));
    });
    expect(await screen.findByText(/Erro ao carregar usuários/i)).toBeInTheDocument();

    await act(async () => {
      await user.click(screen.getByRole('tab', { name: 'Papéis' }));
    });
    expect(await screen.findByText('Erro ao carregar permissões: Erro permissões')).toBeInTheDocument();

    await act(async () => {
      await user.click(screen.getByRole('tab', { name: 'Permissões' }));
    });
    expect(await screen.findByText('Erro ao carregar permissões: Erro permissões')).toBeInTheDocument();
  });
});
