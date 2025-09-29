import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import type { ReactNode } from 'react';

import { AuthProvider, useAuth } from '../useAuth';
import { AuthService } from '../../services/auth.service';

let queryClient: QueryClient;
let wrapper: ({ children }: { children: ReactNode }) => JSX.Element;

beforeEach(() => {
  queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
    },
  });

  wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );

  localStorage.clear();
});

afterEach(() => {
  queryClient.clear();
  vi.restoreAllMocks();
});

describe('useAuth - logout events', () => {
  const mockUser = {
    id: 1,
    email: 'user@example.com',
    nome: 'Test User',
    papel: 'admin'
  };

  it('should reset user and loading state when auth:logout event is dispatched', async () => {
    localStorage.setItem('user', JSON.stringify(mockUser));
    const authService = AuthService.getInstance();
    vi
      .spyOn(authService, 'fetchCurrentUser')
      .mockResolvedValueOnce(mockUser as any)
      .mockResolvedValue(null);

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
    });
    expect(result.current.loading).toBe(false);

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

  it('should remove tokens and user data from storage after signOut', async () => {
    const authService = AuthService.getInstance();
    const logoutMock = vi.spyOn(authService, 'logout').mockResolvedValue(undefined);
    vi.spyOn(authService, 'fetchCurrentUser').mockResolvedValue(mockUser as any);

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
