import { renderHook } from '@testing-library/react';
import useApi from '../useApi';

describe('useApi', () => {
  it('deve inicializar sem erro', () => {
    const { result } = renderHook(() => useApi());
    expect(result.current).toBeDefined();
  });
});
