import { renderHook } from '@testing-library/react';
import useReports from '../useReports';

describe('useReports', () => {
  it('deve inicializar sem erro', () => {
    const { result } = renderHook(() => useReports());
    expect(result.current).toBeDefined();
  });
});
