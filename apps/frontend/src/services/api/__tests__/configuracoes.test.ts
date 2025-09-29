import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiResponse } from '@/types/api';

const mocks = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
  putMock: vi.fn(),
}));

vi.mock('../client', () => ({
  apiService: {
    get: mocks.getMock,
    post: mocks.postMock,
    put: mocks.putMock,
  },
}));

import {
  getConfiguracoes,
  listPermissions,
  listUsers,
  resetUserPassword,
  setRolePermissions,
} from '../configuracoes';

describe('configurações api module', () => {
  beforeEach(() => {
    mocks.getMock.mockReset();
    mocks.postMock.mockReset();
    mocks.putMock.mockReset();
  });

  it('busca configurações globais via apiService.get', async () => {
    const response: ApiResponse<any> = { success: true, data: { tema: 'escuro' } } as any;
    mocks.getMock.mockResolvedValue(response);

    const result = await getConfiguracoes();

    expect(mocks.getMock).toHaveBeenCalledWith('/configuracoes');
    expect(result).toBe(response);
  });

  it('envia filtros ao listar usuários e permissões', async () => {
    const response: ApiResponse<any> = { success: true, data: { data: [] } } as any;
    mocks.getMock.mockResolvedValue(response);

    await listUsers({ page: 3, limit: 20 });
    await listPermissions({ search: 'config' });

    expect(mocks.getMock).toHaveBeenCalledWith('/configuracoes/usuarios', { params: { page: 3, limit: 20 } });
    expect(mocks.getMock).toHaveBeenCalledWith('/configuracoes/permissions', { params: { search: 'config' } });
  });

  it('monta payload adequado para redefinir senha', async () => {
    const response: ApiResponse<any> = { success: true } as any;
    mocks.postMock.mockResolvedValue(response);

    const result = await resetUserPassword(5, 'nova-senha');

    expect(mocks.postMock).toHaveBeenCalledWith('/configuracoes/usuarios/5/reset-password', { newPassword: 'nova-senha' });
    expect(result).toBe(response);
  });

  it('define permissões de papéis reutilizando apiService.put', async () => {
    const response: ApiResponse<any> = { success: true } as any;
    mocks.putMock.mockResolvedValue(response);

    const result = await setRolePermissions('admin', ['config.view']);

    expect(mocks.putMock).toHaveBeenCalledWith('/configuracoes/roles/admin/permissions', { permissions: ['config.view'] });
    expect(result).toBe(response);
  });
});
