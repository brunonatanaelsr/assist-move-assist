import React, { type ReactNode } from 'react';
import { renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import usePersistedFilters from '../usePersistedFilters';

function RouterWrapper({ children }: { children: ReactNode }) {
  return React.createElement(MemoryRouter, { initialEntries: ['/test'] }, children);
}

describe('usePersistedFilters', () => {
  it('deve inicializar sem erro', () => {
    const { result } = renderHook(() => usePersistedFilters({ key: 'test', initial: {} }), {
      wrapper: RouterWrapper,
    });
    expect(result.current).toBeDefined();
  });
});
