import { beforeEach, afterEach, vi } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook } from '@testing-library/react';
import { api } from '@/services/api';
import useDocumentos from '../useDocumentos';
import { createQueryClientWrapper } from './testUtils';

vi.mock('@/components/ui/use-toast', () => ({
  toast: vi.fn(),
}));

vi.mock('@/components/ui/toast', () => ({
  ToastAction: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

beforeEach(() => {
  vi.spyOn(api, 'get').mockResolvedValue({ data: [] } as any);
  vi.spyOn(api, 'post').mockResolvedValue({ data: {} } as any);
  vi.spyOn(api, 'put').mockResolvedValue({ data: {} } as any);
  vi.spyOn(api, 'delete').mockResolvedValue({ data: {} } as any);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useDocumentos', () => {
  it('deve inicializar sem erro', () => {
    const wrapper = createQueryClientWrapper();
    const { result } = renderHook(() => useDocumentos(1), { wrapper });
    expect(result.current).toBeDefined();
  });
});
