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
    localStorage.setItem('test_auth_token', 'token123');
    localStorage.setItem('auth_token', 'token123');
    localStorage.setItem('token', 'token123');
    localStorage.setItem('test_user', JSON.stringify({ id: 1 }));
    localStorage.setItem('user', JSON.stringify({ id: 1 }));

    const getDeviceIdSpy = vi
      .spyOn(authService as unknown as { getDeviceId: () => string }, 'getDeviceId')
      .mockReturnValue('test-device-id');
    const postSpy = vi.spyOn(api, 'post').mockResolvedValue({} as any);

    await authService.logout();

    expect(getDeviceIdSpy).toHaveBeenCalled();
    expect(postSpy).toHaveBeenCalledWith(
      '/auth/logout',
      { deviceId: 'test-device-id' },
      { withCredentials: true }
    );
    expect(localStorage.getItem('test_auth_token')).toBeNull();
    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('test_user')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });
});
