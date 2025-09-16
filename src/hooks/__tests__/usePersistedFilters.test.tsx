
import { render, act } from '@testing-library/react';
import React from 'react';
import usePersistedFilters from '../usePersistedFilters';
import { vi } from 'vitest';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ search: '', pathname: '/test' })
}));

function TestComponent({ keyName, initial }: { keyName: string; initial: any }) {
  const { state, set, reset } = usePersistedFilters({ key: keyName, initial });
  (window as any).testState = state;
  (window as any).testSet = set;
  (window as any).testReset = reset;
  return null;
}

describe('usePersistedFilters', () => {
  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockClear();
    delete (window as any).testState;
    delete (window as any).testSet;
    delete (window as any).testReset;
  });

  it('deve inicializar com o valor inicial', () => {
    render(<TestComponent keyName="filtros" initial={{ a: 1, b: 'x' }} />);
    expect((window as any).testState).toEqual({ a: 1, b: 'x' });
  });

  it('deve atualizar o estado e persistir no localStorage', () => {
    render(<TestComponent keyName="filtros" initial={{ a: 1, b: 'x' }} />);
    act(() => {
      (window as any).testSet({ a: 2 });
    });
    expect((window as any).testState.a).toBe(2);
    expect(JSON.parse(localStorage.getItem('filtros')!)).toEqual({ a: 2, b: 'x' });
  });

  it('deve resetar o estado para o valor inicial', () => {
    render(<TestComponent keyName="filtros" initial={{ a: 1, b: 'x' }} />);
    act(() => {
      (window as any).testSet({ a: 2 });
      (window as any).testReset();
    });
    expect((window as any).testState).toEqual({ a: 1, b: 'x' });
  });
});
