import { beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { apiService } from '@/services/apiService';
import { AuthProvider, useAuth } from '../usePostgreSQLAuth';

beforeEach(() => {
  vi.spyOn(apiService, 'getCurrentUser').mockResolvedValue({ success: true, data: { user: null } } as any);
  vi.spyOn(apiService, 'login').mockResolvedValue({ success: true, data: { user: { id: 1, nome: 'Teste', email: 'teste@example.com', papel: 'user', ativo: true }, token: 'token' } } as any);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('usePostgreSQLAuth', () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  it('deve inicializar sem erro', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current).toMatchObject({
      user: null,
      isAuthenticated: false,
    });
  });
});
