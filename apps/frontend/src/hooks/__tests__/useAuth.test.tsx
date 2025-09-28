import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import type { ReactNode } from 'react';

import { AuthProvider, useAuth } from '../useAuth';
import { AuthService } from '../../services/auth.service';

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

afterEach(() => {
  vi.restoreAllMocks();
});

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
    const getUserMock = vi.fn(() => mockUser);
    vi.spyOn(AuthService, 'getInstance').mockReturnValue({
      login: vi.fn(),
      logout: vi.fn(),
      getUser: getUserMock
    } as unknown as AuthService);

    const { result, unmount } = renderHook(() => useAuth(), { wrapper });

    // Espera o hook inicializar e carregar o usuário
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.user).toEqual(mockUser);
    });

    // Dispara o evento de logout
    act(() => {
      window.dispatchEvent(new Event('auth:logout'));
    });

    // Verifica se o usuário foi removido
    await waitFor(() => {
      expect(result.current.user).toBeNull();
      expect(result.current.loading).toBe(false);
    });

    unmount();
  });
});

describe('useAuth - signOut cleanup', () => {
  const mockUser = {
    id: 2,
    email: 'admin@example.com',
    nome: 'Admin User',
    papel: 'admin'
  };

  beforeEach(() => {
    localStorage.clear();
  });

  it('should remove tokens and user data from storage after signOut', async () => {
    const logoutMock = vi.fn().mockResolvedValue(undefined);
    const getUserMock = vi.fn(() => mockUser);
    vi.spyOn(AuthService, 'getInstance').mockReturnValue({
      login: vi.fn(),
      logout: logoutMock,
      getUser: getUserMock
    } as unknown as AuthService);

    localStorage.setItem('auth_token', 'token123');
    localStorage.setItem('token', 'token123');
    localStorage.setItem('user', JSON.stringify(mockUser));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toEqual(mockUser);

    await act(async () => {
      await result.current.signOut();
    });

    expect(logoutMock).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(result.current.user).toBeNull();
  });
});
