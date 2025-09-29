import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import type { ReactNode } from 'react';

import { AuthProvider, useAuth } from '../useAuth';
import { AuthService } from '../../services/auth.service';

function createWrapper(overrides?: Partial<AuthService>) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  });

  const mockService = {
    login: vi.fn(),
    logout: vi.fn(),
    fetchCurrentUser: vi.fn().mockResolvedValue(null),
    getUser: vi.fn().mockReturnValue(null),
    isAuthenticated: vi.fn().mockReturnValue(false),
    storeUser: vi.fn(),
    clearStoredSession: vi.fn(),
    clearStoredTokens: vi.fn(),
    clearStoredUser: vi.fn(),
    ensureCsrfToken: vi.fn(),
  } as unknown as AuthService;

  Object.assign(mockService, overrides);
  vi.spyOn(AuthService, 'getInstance').mockReturnValue(mockService);

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    );
  };
}

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
    localStorage.setItem('user', JSON.stringify(mockUser));
    const wrapper = createWrapper({
      getUser: vi.fn(() => mockUser),
      isAuthenticated: vi.fn(() => false),
      fetchCurrentUser: vi.fn().mockResolvedValue(mockUser),
      clearStoredSession: vi.fn(),
    });

    const { result, unmount } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toEqual(mockUser);

    act(() => {
      window.dispatchEvent(new Event('auth:logout'));
    });

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
    const wrapper = createWrapper({
      logout: logoutMock,
      getUser: vi.fn(() => mockUser),
      fetchCurrentUser: vi.fn().mockResolvedValue(mockUser),
      isAuthenticated: vi.fn(() => true),
    });

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
