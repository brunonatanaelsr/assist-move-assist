import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '../ProtectedRoute';

const mockUseAuth = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth()
}));

const renderWithRoutes = (ui: React.ReactNode) =>
  render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route path="/admin" element={ui} />
        <Route path="/" element={<div>Home Pública</div>} />
      </Routes>
    </MemoryRouter>
  );

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('permite que usuários super_admin acessem rotas exclusivas de admin', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, nome: 'Super Admin', papel: 'super_admin' },
      profile: null,
      loading: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
      isAuthenticated: true,
      isAdmin: true
    });

    renderWithRoutes(
      <ProtectedRoute adminOnly>
        <div>Área Administrativa</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Área Administrativa')).toBeInTheDocument();
    expect(screen.queryByText('Home Pública')).not.toBeInTheDocument();
  });

  it('não renderiza conteúdo protegido para usuários sem permissão de admin', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 2, nome: 'Usuário Comum', papel: 'voluntaria' },
      profile: null,
      loading: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
      isAuthenticated: true,
      isAdmin: false
    });

    renderWithRoutes(
      <ProtectedRoute adminOnly>
        <div>Área Administrativa</div>
      </ProtectedRoute>
    );

    expect(screen.queryByText('Área Administrativa')).not.toBeInTheDocument();
    expect(screen.getByText('Home Pública')).toBeInTheDocument();
  });
});
