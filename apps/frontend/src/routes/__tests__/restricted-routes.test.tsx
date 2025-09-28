import { type ReactNode } from 'react';
import { describe, it, beforeEach, expect, vi } from 'vitest';
import { MemoryRouter, Routes, Route, Outlet } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

const mockUseAuth = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth()
}));

vi.mock('@/pages/Analytics', () => ({
  default: () => <div>Analytics Page</div>
}));

vi.mock('@/pages/Configuracoes', () => ({
  default: () => <div>Config Page</div>
}));

const renderWithRoute = (initialEntry: string, routes: ReactNode) => {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/" element={<Outlet />}>
          <Route index element={<div>Home Page</div>} />
          {routes}
        </Route>
      </Routes>
    </MemoryRouter>
  );
};

describe('Restricted routes', () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
  });

  it('redirects non-admin users away from analytics', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, nome: 'Usuário', papel: 'user' },
      profile: null,
      loading: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
      isAuthenticated: true,
      isAdmin: false
    });

    renderWithRoute(
      '/analytics',
      <Route
        path="analytics"
        element={(
          <ProtectedRoute adminOnly>
            <div>Analytics Page</div>
          </ProtectedRoute>
        )}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Home Page')).toBeInTheDocument();
    });

    expect(screen.queryByText('Analytics Page')).not.toBeInTheDocument();
  });

  it('redirects non-admin users away from configuration pages', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 2, nome: 'Usuário', papel: 'user' },
      profile: null,
      loading: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
      isAuthenticated: true,
      isAdmin: false
    });

    renderWithRoute(
      '/configuracoes',
      <Route
        path="configuracoes"
        element={(
          <ProtectedRoute adminOnly>
            <Outlet />
          </ProtectedRoute>
        )}
      >
        <Route index element={<div>Config Page</div>} />
      </Route>
    );

    await waitFor(() => {
      expect(screen.getByText('Home Page')).toBeInTheDocument();
    });

    expect(screen.queryByText('Config Page')).not.toBeInTheDocument();
  });

  it('allows admin users to access analytics', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 3, nome: 'Admin', papel: 'admin' },
      profile: null,
      loading: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
      isAuthenticated: true,
      isAdmin: true
    });

    renderWithRoute(
      '/analytics',
      <Route
        path="analytics"
        element={(
          <ProtectedRoute adminOnly>
            <div>Analytics Page</div>
          </ProtectedRoute>
        )}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Analytics Page')).toBeInTheDocument();
    });
  });
});
