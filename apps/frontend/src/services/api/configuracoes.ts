import type { ApiResponse } from '@/types/api';
import type {
  ConfiguracoesGlobais,
  ConfiguracaoUsuario,
  CreateUsuarioPayload,
  PaginatedCollection,
  PermissionSummary,
  ResetPasswordPayload,
  UpdateConfiguracoesPayload,
  UpdateUsuarioPayload,
  UsuarioPermissions
} from '@/types/configuracoes';
import { apiService } from './client';

type PaginationQuery = Partial<{ search: string; page: number; limit: number }>;

type PaginatedUsersPayload = PaginatedCollection<ConfiguracaoUsuario>;

type PaginatedPermissionsPayload = PaginatedCollection<PermissionSummary>;

export const getConfiguracoes = (): Promise<ApiResponse<ConfiguracoesGlobais>> =>
  apiService.get<ConfiguracoesGlobais>('/configuracoes');

export const updateConfiguracoes = (
  data: UpdateConfiguracoesPayload
): Promise<ApiResponse<ConfiguracoesGlobais>> => apiService.put('/configuracoes', data);

export const listUsers = (
  params?: PaginationQuery
): Promise<ApiResponse<PaginatedUsersPayload>> =>
  apiService.get('/configuracoes/usuarios', { params });

export const createUser = (
  data: CreateUsuarioPayload
): Promise<ApiResponse<ConfiguracaoUsuario>> => apiService.post('/configuracoes/usuarios', data);

export const updateUser = (
  id: number,
  data: UpdateUsuarioPayload
): Promise<ApiResponse<ConfiguracaoUsuario>> => apiService.put(`/configuracoes/usuarios/${id}`, data);

export const resetUserPassword = (
  id: number,
  newPassword: string
): Promise<ApiResponse<{ id: number }>> => {
  const payload: ResetPasswordPayload = { newPassword };
  return apiService.post(`/configuracoes/usuarios/${id}/reset-password`, payload);
};

export const listRoles = (): Promise<ApiResponse<string[]>> =>
  apiService.get('/configuracoes/roles');

export const listPermissions = (
  params?: PaginationQuery
): Promise<ApiResponse<PaginatedPermissionsPayload>> =>
  apiService.get('/configuracoes/permissions', { params });

export const createPermission = (
  name: string,
  description?: string
): Promise<ApiResponse<PermissionSummary>> =>
  apiService.post('/configuracoes/permissions', { name, description });

export const getRolePermissions = (
  role: string
): Promise<ApiResponse<UsuarioPermissions>> =>
  apiService.get(`/configuracoes/roles/${role}/permissions`);

export const setRolePermissions = (
  role: string,
  permissions: UsuarioPermissions
): Promise<ApiResponse<{ role: string; permissions: UsuarioPermissions }>> =>
  apiService.put(`/configuracoes/roles/${role}/permissions`, { permissions });

export const getUserPermissions = (
  userId: number
): Promise<ApiResponse<UsuarioPermissions>> =>
  apiService.get(`/configuracoes/usuarios/${userId}/permissions`);

export const setUserPermissions = (
  userId: number,
  permissions: UsuarioPermissions
): Promise<ApiResponse<{ id: number; permissions: UsuarioPermissions }>> =>
  apiService.put(`/configuracoes/usuarios/${userId}/permissions`, { permissions });
