import { renderHook } from '@testing-library/react';
import { AuthProvider } from '../usePostgreSQLAuth';

describe('usePostgreSQLAuth', () => {
  it('deve inicializar sem erro', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => <AuthProvider>{children}</AuthProvider>;
    const { result } = renderHook(() => ({}), { wrapper });
    expect(result.current).toBeDefined();
  });
});
