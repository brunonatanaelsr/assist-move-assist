import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

const createAuthState = (overrides: Record<string, unknown> = {}) => ({
  user: { id: 1, nome: 'Usuário Padrão', email: 'user@example.com', papel: 'user' },
  profile: null,
  loading: false,
  signIn: vi.fn(),
  signOut: vi.fn(),
  isAuthenticated: true,
  isAdmin: false,
  permissions: [],
  roles: [],
  hasPermission: vi.fn(() => true),
  hasRole: vi.fn(() => false),
  ...overrides
});

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockUseAuth.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('permite acesso quando o usuário possui as permissões exigidas', () => {
    const state = createAuthState({
      permissions: ['beneficiarias.create'],
      hasPermission: vi.fn(() => true)
    });
    mockUseAuth.mockReturnValue(state);

    render(
      <MemoryRouter>
        <ProtectedRoute requiredPermissions={['beneficiarias.create']}>
          <div>Área Restrita</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByText('Área Restrita')).toBeInTheDocument();
    expect(state.hasPermission).toHaveBeenCalledWith(['beneficiarias.create']);
  });

  it('renderiza CTA de login quando usuário não está autenticado', () => {
    mockUseAuth.mockReturnValue(createAuthState({
      user: null,
      isAuthenticated: false
    }));

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Conteúdo privado</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    const loginButton = screen.getByTestId('login-button');
    expect(loginButton).toBeInTheDocument();

    fireEvent.click(loginButton);
    expect(mockNavigate).toHaveBeenCalledWith('/auth');
  });

  it('bloqueia acesso quando permissões estão ausentes', () => {
    const hasPermission = vi.fn(() => false);
    mockUseAuth.mockReturnValue(createAuthState({ hasPermission }));

    render(
      <MemoryRouter>
        <ProtectedRoute requiredPermissions={['relatorios.view']}>
          <div>Relatórios</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByTestId('forbidden-access')).toBeInTheDocument();
    expect(hasPermission).toHaveBeenCalledWith(['relatorios.view']);
  });

  it('restringe rotas somente para admins', () => {
    const hasRole = vi.fn((roles: string[]) => roles.includes('admin'));
    mockUseAuth.mockReturnValue(createAuthState({ hasRole }));

    render(
      <MemoryRouter>
        <ProtectedRoute adminOnly>
          <div>Administração</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByText('Administração')).toBeInTheDocument();
    expect(hasRole).toHaveBeenCalledWith(['admin', 'super_admin', 'superadmin']);
  });
});

