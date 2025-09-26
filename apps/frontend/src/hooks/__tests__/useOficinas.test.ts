import { beforeEach, afterEach, vi } from 'vitest';

vi.mock('../../services/oficinas.service', async () => {
  const actual = await vi.importActual<typeof import('../../services/oficinas.service')>(
    '../../services/oficinas.service'
  );
  return {
    ...actual,
    oficinasService: actual.OficinasService,
  };
});

import { renderHook } from '@testing-library/react';
import { OficinasService } from '../../services/oficinas.service';
import useOficinas from '../useOficinas';
import { createQueryClientWrapper } from './testUtils';

beforeEach(() => {
  vi.spyOn(OficinasService, 'listar').mockResolvedValue({
    success: true,
    data: [],
    pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
  } as any);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useOficinas', () => {
  it('deve inicializar sem erro', () => {
    const wrapper = createQueryClientWrapper();
    const { result } = renderHook(() => useOficinas(), { wrapper });
    expect(result.current).toBeDefined();
  });
});
