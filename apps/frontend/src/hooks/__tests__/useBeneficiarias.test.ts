import { beforeEach, afterEach, vi, type Mock } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { beneficiariasService } from '../../services/api';
import useBeneficiarias from '../useBeneficiarias';
import { createQueryClientWrapper } from './testUtils';

beforeEach(() => {
  vi.spyOn(beneficiariasService, 'listar').mockResolvedValue({
    success: true,
    data: {
      items: [],
      pagination: { page: 1, limit: 0, total: 0 },
    },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useBeneficiarias', () => {
  it('deve inicializar sem erro', () => {
    const wrapper = createQueryClientWrapper();
    const { result } = renderHook(() => useBeneficiarias(), { wrapper });
    expect(result.current).toBeDefined();
  });

  it('retorna items e paginação normalizados', async () => {
    const wrapper = createQueryClientWrapper();
    const items = [{ id: 1, nome_completo: 'Teste' }] as any;
    (beneficiariasService.listar as unknown as Mock).mockResolvedValueOnce({
      success: true,
      data: {
        items,
        pagination: { page: 1, limit: 10, total: 1 },
      },
    });

    const { result } = renderHook(() => useBeneficiarias(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.data?.items).toEqual(items);
    expect(result.current.data?.data?.pagination).toEqual({ page: 1, limit: 10, total: 1 });
  });
});
