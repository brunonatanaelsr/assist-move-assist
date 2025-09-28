import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { toast } from 'sonner';
import apiService from '@/services/apiService';
import type {
  PaginatedCollection,
  PermissionSummary,
  UsuarioPermissions,
} from '@/types/configuracoes';
import type { Pagination } from '@/types/api';

export interface PermissionsQueryParams {
  search?: string;
  page?: number;
  limit?: number;
}

interface PermissionsQueryData extends PaginatedCollection<PermissionSummary> {}

const defaultPagination: Pagination = {
  page: 1,
  limit: 25,
  total: 0,
};

const normalizePagination = (
  params: PermissionsQueryParams,
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

export const configuracoesPermissoesKeys = {
  all: ['configuracoes', 'permissoes'] as const,
  lists: () => [...configuracoesPermissoesKeys.all, 'list'] as const,
  list: (params: PermissionsQueryParams = {}) => [...configuracoesPermissoesKeys.lists(), params] as const,
  roles: () => [...configuracoesPermissoesKeys.all, 'roles'] as const,
  rolePermissions: (role: string) => [...configuracoesPermissoesKeys.roles(), role, 'permissions'] as const,
};

export const useConfiguracoesPermissoes = (
  params: PermissionsQueryParams = {},
): UseQueryResult<PermissionsQueryData, Error> =>
  useQuery<PermissionsQueryData, Error>({
    queryKey: configuracoesPermissoesKeys.list(params),
    queryFn: async () => {
      const response = await apiService.listPermissions(params);
      if (!response.success || !response.data) {
        throw new Error(response.message ?? 'Não foi possível carregar as permissões.');
      }

      const permissoes = response.data.data ?? [];
      const pagination = normalizePagination(params, response.data.pagination, permissoes.length);

      return {
        data: permissoes,
        pagination,
      };
    },
    keepPreviousData: true,
  });

export const useConfiguracoesRoles = (): UseQueryResult<string[], Error> =>
  useQuery<string[], Error>({
    queryKey: configuracoesPermissoesKeys.roles(),
    queryFn: async () => {
      const response = await apiService.listRoles();
      if (!response.success || !response.data) {
        throw new Error(response.message ?? 'Não foi possível carregar os papéis.');
      }
      return response.data;
    },
  });

export const useConfiguracoesRolePermissoes = (
  role: string,
): UseQueryResult<UsuarioPermissions, Error> =>
  useQuery<UsuarioPermissions, Error>({
    queryKey: configuracoesPermissoesKeys.rolePermissions(role),
    queryFn: async () => {
      const response = await apiService.getRolePermissions(role);
      if (!response.success || !response.data) {
        throw new Error(response.message ?? 'Não foi possível carregar as permissões do papel.');
      }
      return response.data;
    },
    enabled: Boolean(role),
  });

export const useCreateConfiguracaoPermissao = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      const response = await apiService.createPermission(name, description);
      if (!response.success) {
        throw new Error(response.message ?? 'Não foi possível criar a permissão.');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: configuracoesPermissoesKeys.lists(), exact: false });
      toast.success('Permissão criada com sucesso.');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

export const useSetConfiguracoesRolePermissoes = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ role, permissions }: { role: string; permissions: UsuarioPermissions }) => {
      const response = await apiService.setRolePermissions(role, permissions);
      if (!response.success) {
        throw new Error(response.message ?? 'Não foi possível atualizar as permissões do papel.');
      }
      return { role, permissions };
    },
    onSuccess: ({ role, permissions }) => {
      queryClient.setQueryData(configuracoesPermissoesKeys.rolePermissions(role), permissions);
      queryClient.invalidateQueries({ queryKey: configuracoesPermissoesKeys.rolePermissions(role) });
      toast.success('Permissões do papel atualizadas com sucesso.');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

export const usePermissionsPaginationInfo = (
  query: UseQueryResult<PermissionsQueryData, Error>,
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

export default useConfiguracoesPermissoes;
