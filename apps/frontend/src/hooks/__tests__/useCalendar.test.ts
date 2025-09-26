import { beforeEach, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { api } from '@/services/api';
import useCalendar from '../useCalendar';
import { createQueryClientWrapper } from './testUtils';

beforeEach(() => {
  vi.spyOn(api, 'get').mockResolvedValue({ data: [] } as any);
  vi.spyOn(api, 'post').mockResolvedValue({ data: {} } as any);
  vi.spyOn(api, 'put').mockResolvedValue({ data: {} } as any);
  vi.spyOn(api, 'delete').mockResolvedValue({ data: {} } as any);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useCalendar', () => {
  it('deve inicializar sem erro', () => {
    const wrapper = createQueryClientWrapper();
    const { result } = renderHook(() => useCalendar(), { wrapper });
    expect(result.current).toBeDefined();
  });
});
