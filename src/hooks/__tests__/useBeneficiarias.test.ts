import { renderHook } from '@testing-library/react';
import useBeneficiarias from '../useBeneficiarias';

describe('useBeneficiarias', () => {
  it('deve inicializar sem erro', () => {
    const { result } = renderHook(() => useBeneficiarias());
    expect(result.current).toBeDefined();
  });
});
