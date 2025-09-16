import { renderHook } from '@testing-library/react';
import useOficinas from '../useOficinas';

describe('useOficinas', () => {
  it('deve inicializar sem erro', () => {
    const { result } = renderHook(() => useOficinas());
    expect(result.current).toBeDefined();
  });
});
