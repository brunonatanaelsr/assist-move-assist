import { beforeEach, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { beneficiariasService } from '../../services/api';
import useBeneficiarias from '../useBeneficiarias';
import { createQueryClientWrapper } from './testUtils';

beforeEach(() => {
  vi.spyOn(beneficiariasService, 'listar').mockResolvedValue({
    success: true,
    data: [],
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
});
