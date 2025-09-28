import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { toast } from 'sonner';
import apiService from '@/services/apiService';
import type {
  ConfiguracaoUsuario,
  CreateUsuarioPayload,
  PaginatedCollection,
  UpdateUsuarioPayload,
  UsuarioPermissions,
} from '@/types/configuracoes';
import type { Pagination } from '@/types/api';

export interface UsuariosQueryParams {
  search?: string;
  page?: number;
  limit?: number;
}

interface UsuariosQueryData extends PaginatedCollection<ConfiguracaoUsuario> {}

const defaultPagination: Pagination = {
  page: 1,
  limit: 10,
  total: 0,
};

const normalizePagination = (
  params: UsuariosQueryParams,
  pagination?: Pagination,
  totalItems?: number,
): Pagination => {
  const page = pagination?.page ?? params.page ?? defaultPagination.page;
  const limit = pagination?.limit ?? params.limit ?? defaultPagination.limit;
  const total = pagination?.total ?? totalItems ?? defaultPagination.total;
  const totalPages = pagination?.totalPages ?? (limit > 0 ? Math.ceil(total / limit) : undefined);

  return {
    page,
    limit,
    total,
    ...(totalPages !== undefined ? { totalPages } : {}),
  };
};

export const configuracoesUsuariosKeys = {
  all: ['configuracoes', 'usuarios'] as const,
  lists: () => [...configuracoesUsuariosKeys.all, 'list'] as const,
  list: (params: UsuariosQueryParams = {}) => [...configuracoesUsuariosKeys.lists(), params] as const,
  permissionsRoot: () => [...configuracoesUsuariosKeys.all, 'permissions'] as const,
  permissions: (userId: number) => [...configuracoesUsuariosKeys.permissionsRoot(), userId] as const,
  permissionsPlaceholder: () => [...configuracoesUsuariosKeys.permissionsRoot(), 'placeholder'] as const,
};

export const useConfiguracoesUsuarios = (
  params: UsuariosQueryParams = {},
): UseQueryResult<UsuariosQueryData, Error> =>
  useQuery<UsuariosQueryData, Error>({
    queryKey: configuracoesUsuariosKeys.list(params),
    queryFn: async () => {
      const response = await apiService.listUsers(params);
      if (!response.success || !response.data) {
        throw new Error(response.message ?? 'Não foi possível carregar os usuários.');
      }

      const usuarios = response.data.data ?? [];
      const pagination = normalizePagination(params, response.data.pagination, usuarios.length);

      return {
        data: usuarios,
        pagination,
      };
    },
    keepPreviousData: true,
  });

export const useCreateConfiguracaoUsuario = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateUsuarioPayload) => {
      const response = await apiService.createUser(payload);
      if (!response.success) {
        throw new Error(response.message ?? 'Não foi possível criar o usuário.');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: configuracoesUsuariosKeys.lists(), exact: false });
      toast.success('Usuário criado com sucesso.');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

export const useUpdateConfiguracaoUsuario = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateUsuarioPayload }) => {
      const response = await apiService.updateUser(id, data);
      if (!response.success) {
        throw new Error(response.message ?? 'Não foi possível atualizar o usuário.');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: configuracoesUsuariosKeys.lists(), exact: false });
      toast.success('Usuário atualizado com sucesso.');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

export const useResetConfiguracaoUsuarioSenha = () =>
  useMutation({
    mutationFn: async ({ id, newPassword }: { id: number; newPassword: string }) => {
      const response = await apiService.resetUserPassword(id, newPassword);
      if (!response.success) {
        throw new Error(response.message ?? 'Não foi possível redefinir a senha.');
      }
      return response;
    },
    onSuccess: () => {
      toast.success('Senha redefinida com sucesso.');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

export const useConfiguracoesUsuarioPermissoes = (
  userId: number | null,
): UseQueryResult<UsuarioPermissions, Error> =>
  useQuery<UsuarioPermissions, Error>({
    queryKey:
      userId != null
        ? configuracoesUsuariosKeys.permissions(userId)
        : configuracoesUsuariosKeys.permissionsPlaceholder(),
    queryFn: async () => {
      if (userId == null) return [];
      const response = await apiService.getUserPermissions(userId);
      if (!response.success || !response.data) {
        throw new Error(response.message ?? 'Não foi possível carregar as permissões do usuário.');
      }
      return response.data;
    },
    enabled: userId != null,
  });

export const useSetConfiguracoesUsuarioPermissoes = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, permissions }: { userId: number; permissions: UsuarioPermissions }) => {
      const response = await apiService.setUserPermissions(userId, permissions);
      if (!response.success) {
        throw new Error(response.message ?? 'Não foi possível atualizar as permissões do usuário.');
      }
      return { userId, permissions };
    },
    onSuccess: ({ userId, permissions }) => {
      queryClient.setQueryData(configuracoesUsuariosKeys.permissions(userId), permissions);
      queryClient.invalidateQueries({ queryKey: configuracoesUsuariosKeys.permissions(userId) });
      toast.success('Permissões do usuário atualizadas com sucesso.');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

export const useUsuariosPaginationInfo = (
  query: UseQueryResult<UsuariosQueryData, Error>,
): { total: number; totalPages: number; page: number; limit: number } =>
  useMemo(() => {
    const pagination = query.data?.pagination ?? defaultPagination;
    const totalPages =
      pagination.totalPages ??
      (pagination.limit > 0 ? Math.max(1, Math.ceil(pagination.total / pagination.limit)) : 1);

    return {
      total: pagination.total,
      totalPages,
      page: pagination.page,
      limit: pagination.limit,
    };
  }, [query.data?.pagination]);

export default useConfiguracoesUsuarios;
