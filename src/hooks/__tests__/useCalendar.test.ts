import { renderHook } from '@testing-library/react';
import useCalendar from '../useCalendar';

describe('useCalendar', () => {
  it('deve inicializar sem erro', () => {
    const { result } = renderHook(() => useCalendar());
    expect(result.current).toBeDefined();
  });
});
