import { renderHook } from '@testing-library/react';
import useCEP from '../useCEP';

describe('useCEP', () => {
  it('deve inicializar sem erro', () => {
    const { result } = renderHook(() => useCEP());
    expect(result.current).toBeDefined();
  });
});
