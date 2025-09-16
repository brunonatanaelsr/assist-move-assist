import { renderHook } from '@testing-library/react';
import useNotifications from '../useNotifications';

describe('useNotifications', () => {
  it('deve inicializar sem erro', () => {
    const { result } = renderHook(() => useNotifications());
    expect(result.current).toBeDefined();
  });
});
