import { vi } from 'vitest';

vi.mock('../useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    profile: null,
  }),
}));

import { renderHook } from '@testing-library/react';
import useSocket from '../useSocket';

describe('useSocket', () => {
  it('deve inicializar sem erro', () => {
    const { result } = renderHook(() => useSocket('ws://localhost'));
    expect(result.current).toBeDefined();
  });
});
