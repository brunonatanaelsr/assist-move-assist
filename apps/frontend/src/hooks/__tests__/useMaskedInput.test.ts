import { renderHook } from '@testing-library/react';
import useMaskedInput from '../useMaskedInput';

describe('useMaskedInput', () => {
  it('deve inicializar sem erro', () => {
    const { result } = renderHook(() => useMaskedInput());
    expect(result.current).toBeDefined();
  });
});
