import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, it, beforeEach, expect } from 'vitest';
import type { ReactNode } from 'react';

import { AuthProvider, useAuth } from '../useAuth';

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('useAuth - logout events', () => {
  const mockUser = {
    id: 1,
    email: 'user@example.com',
    nome: 'Test User',
    papel: 'admin'
  };

  beforeEach(() => {
    localStorage.clear();
  });

  it('should reset user and loading state when auth:logout event is dispatched', async () => {
    localStorage.setItem('user', JSON.stringify(mockUser));

    const { result, unmount } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toEqual(mockUser);

    act(() => {
      window.dispatchEvent(new Event('auth:logout'));
    });

    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(false);

    unmount();
  });
});
