import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProtectedRoute } from '../ProtectedRoute';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

const mockUseAuth = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth()
}));

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
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

    render(
      <MemoryRouter>
        <ProtectedRoute adminOnly>
          <div>Área Administrativa</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByText('Área Administrativa')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
