import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProtectedRoute } from '../ProtectedRoute';

const mockNavigate = vi.fn();
const mockNavigateComponent = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Navigate: (props: React.ComponentProps<typeof actual.Navigate>) => {
      mockNavigateComponent(props);
      return null;
    }
  };
});

const mockUseAuth = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth()
}));

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockNavigateComponent.mockClear();
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
    expect(mockNavigateComponent).not.toHaveBeenCalled();
  });

  it('não renderiza conteúdo protegido para usuários sem permissão de admin', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 2, nome: 'Usuário Comum', papel: 'voluntaria' },
      profile: null,
      loading: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
      isAuthenticated: true,
      isAdmin: false
    });

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <ProtectedRoute adminOnly>
          <div>Área Administrativa</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.queryByText('Área Administrativa')).not.toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockNavigateComponent).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '/',
        replace: true,
        state: { from: '/admin' }
      })
    );
  });
});
