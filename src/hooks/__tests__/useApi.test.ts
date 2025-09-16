import { beforeEach, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { apiService } from '@/services/apiService';
import useApi from '../useApi';
import { createQueryClientWrapper } from './testUtils';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

beforeEach(() => {
  vi.spyOn(apiService, 'getBeneficiarias').mockResolvedValue({ success: true, data: [] });
  vi.spyOn(apiService, 'createBeneficiaria').mockResolvedValue({ success: true, data: {} });
  vi.spyOn(apiService, 'updateBeneficiaria').mockResolvedValue({ success: true, data: {} });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useApi', () => {
  it('deve inicializar sem erro', () => {
    const wrapper = createQueryClientWrapper();
    const { result } = renderHook(() => useApi(), { wrapper });
    expect(result.current).toBeDefined();
  });
});
