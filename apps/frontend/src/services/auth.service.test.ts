import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import api from '@/config/api';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const authService = AuthService.getInstance();

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should remove stored tokens after logout', async () => {
    localStorage.setItem('auth_token', 'token123');
    localStorage.setItem('token', 'token123');
    localStorage.setItem('user', JSON.stringify({ id: 1 }));

    const postSpy = vi.spyOn(api, 'post').mockResolvedValue({} as any);

    await authService.logout();

    expect(postSpy).toHaveBeenCalledWith('/auth/logout', undefined, { withCredentials: true });
    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });
});
