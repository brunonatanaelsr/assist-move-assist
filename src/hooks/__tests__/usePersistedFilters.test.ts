import { renderHook } from '@testing-library/react';
import usePersistedFilters from '../usePersistedFilters';

describe('usePersistedFilters', () => {
  it('deve inicializar sem erro', () => {
    const { result } = renderHook(() => usePersistedFilters({ key: 'test', initial: {} }));
    expect(result.current).toBeDefined();
  });
});
