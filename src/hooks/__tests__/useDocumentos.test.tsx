import { renderHook } from '@testing-library/react';
import useDocumentos from '../useDocumentos';

describe('useDocumentos', () => {
  it('deve inicializar sem erro', () => {
    const { result } = renderHook(() => useDocumentos());
    expect(result.current).toBeDefined();
  });
});
