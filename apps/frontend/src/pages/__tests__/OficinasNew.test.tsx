import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import OficinasNew from '../OficinasNew';
import * as oficinasHooks from '@/hooks/useOficinas';
import { useQuery } from '@tanstack/react-query';

vi.mock('@/hooks/useOficinas', () => ({
  useOficinas: vi.fn(),
  useCreateOficina: vi.fn(),
  useUpdateOficina: vi.fn(),
  useDeleteOficina: vi.fn(),
  useOficinaResumo: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}));

describe('OficinasNew page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (oficinasHooks.useOficinas as unknown as Mock).mockReturnValue({
      data: { success: true, data: [] },
      isLoading: false,
      isRefetching: false,
      isError: false,
    });
    (oficinasHooks.useCreateOficina as unknown as Mock).mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    (oficinasHooks.useUpdateOficina as unknown as Mock).mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    (oficinasHooks.useDeleteOficina as unknown as Mock).mockReturnValue({ mutate: vi.fn() });
    (oficinasHooks.useOficinaResumo as unknown as Mock).mockReturnValue({ data: { success: true, data: null }, isLoading: false, isError: false });

    (useQuery as unknown as Mock).mockReturnValue({ data: { success: true, data: [] } });
  });

  it('renders loading placeholders while fetching', () => {
    (oficinasHooks.useOficinas as unknown as Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      isRefetching: false,
      isError: false,
    });

    const { container } = render(
      <MemoryRouter>
        <OficinasNew />
      </MemoryRouter>
    );

    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('shows error alert when loading fails', () => {
    (oficinasHooks.useOficinas as unknown as Mock).mockReturnValue({
      data: { success: true, data: [] },
      isLoading: false,
      isError: true,
      error: new Error('Erro de rede'),
      isRefetching: false,
    });

    render(
      <MemoryRouter>
        <OficinasNew />
      </MemoryRouter>
    );

    const alert = screen.getByTestId('oficinas-error');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent('Erro de rede');
  });
});
