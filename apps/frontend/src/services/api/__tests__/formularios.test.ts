import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiResponse } from '@/types/api';

const mocks = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
  putMock: vi.fn(),
  patchMock: vi.fn(),
  httpGetMock: vi.fn(),
}));

vi.mock('../client', () => ({
  apiService: {
    get: mocks.getMock,
    post: mocks.postMock,
    put: mocks.putMock,
    patch: mocks.patchMock,
    getHttpClient: () => ({ get: mocks.httpGetMock }),
  },
}));

import {
  downloadTermoConsentimentoPdf,
  exportFormularioPdf,
  listFormulariosBeneficiaria,
  revokeTermoConsentimento,
} from '../formularios';

describe('formularios api module', () => {
  beforeEach(() => {
    mocks.getMock.mockReset();
    mocks.postMock.mockReset();
    mocks.putMock.mockReset();
    mocks.patchMock.mockReset();
    mocks.httpGetMock.mockReset();
  });

  it('solicita a listagem de formulários da beneficiária com os parâmetros corretos', async () => {
    const response: ApiResponse<any> = { success: true, data: { data: [] } } as any;
    mocks.getMock.mockResolvedValue(response);

    const result = await listFormulariosBeneficiaria(42, { page: 1 });

    expect(mocks.getMock).toHaveBeenCalledWith('/formularios/beneficiaria/42', { params: { page: 1 } });
    expect(result).toBe(response);
  });

  it('baixa PDFs utilizando o cliente axios cru', async () => {
    const blob = new Blob(['pdf']);
    mocks.httpGetMock.mockResolvedValue({ data: blob });

    const result = await exportFormularioPdf('anamnese', 7);

    expect(mocks.httpGetMock).toHaveBeenCalledWith('/formularios/anamnese/7/pdf', { responseType: 'blob' });
    expect(result).toBe(blob);
  });

  it('baixa PDF de termo de consentimento com headers apropriados', async () => {
    const blob = new Blob(['pdf']);
    mocks.httpGetMock.mockResolvedValue({ data: blob });

    const result = await downloadTermoConsentimentoPdf(5);

    expect(mocks.httpGetMock).toHaveBeenCalledWith('/formularios/termos-consentimento/5/pdf', { responseType: 'blob' });
    expect(result).toBe(blob);
  });

  it('encaminha requisições de revogação para apiService.patch', async () => {
    const response: ApiResponse<any> = { success: true } as any;
    mocks.patchMock.mockResolvedValue(response);

    const result = await revokeTermoConsentimento(9, { motivo: 'teste' });

    expect(mocks.patchMock).toHaveBeenCalledWith('/formularios/termos-consentimento/9/revogacao', { motivo: 'teste' });
    expect(result).toBe(response);
  });
});
