import { renderHook } from '@testing-library/react';
import useFeedUpdates from '../useFeedUpdates';

describe('useFeedUpdates', () => {
  it('deve inicializar sem erro', () => {
    const { result } = renderHook(() => useFeedUpdates());
    expect(result.current).toBeDefined();
  });
});
