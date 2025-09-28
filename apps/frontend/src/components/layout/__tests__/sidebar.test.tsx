import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Sidebar from '../sidebar';

const mockUseAuth = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth()
}));

describe('Sidebar permissions', () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
  });

  const renderSidebar = () =>
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );

  it('renders admin-only items when the user is admin', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, nome: 'Admin', papel: 'admin' },
      isAdmin: true
    });

    renderSidebar();

    expect(screen.getByTestId('menu-relatorios')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
    expect(screen.getByText('Configurações')).toBeInTheDocument();
  });

  it('hides admin-only items for collaborators', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 2, nome: 'Colaboradora', papel: 'user' },
      isAdmin: false
    });

    renderSidebar();

    expect(screen.getByTestId('menu-dashboard')).toBeInTheDocument();
    expect(screen.queryByTestId('menu-relatorios')).not.toBeInTheDocument();
    expect(screen.queryByText('Analytics')).not.toBeInTheDocument();
    expect(screen.queryByText('Configurações')).not.toBeInTheDocument();
    expect(screen.getByText('Feed')).toBeInTheDocument();
    expect(screen.queryByText('Novo Cadastro')).not.toBeInTheDocument();
  });
});
