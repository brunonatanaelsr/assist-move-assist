import { beforeEach, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import api from '@/config/api';
import useNotifications from '../useNotifications';
import { createQueryClientWrapper } from './testUtils';

beforeEach(() => {
  vi.spyOn(api, 'get').mockResolvedValue({ data: { data: [] } } as any);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useNotifications', () => {
  it('deve inicializar sem erro', () => {
    const wrapper = createQueryClientWrapper();
    const { result } = renderHook(() => useNotifications(), { wrapper });
    expect(result.current).toBeDefined();
  });
});
