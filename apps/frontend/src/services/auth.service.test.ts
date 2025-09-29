import type { AxiosRequestConfig } from 'axios';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import api from '@/config/api';
import { AuthService } from './auth.service';
import { clearCsrfToken, getCsrfToken } from './csrfTokenStore';

function getHeaderValue(config: AxiosRequestConfig | undefined, header: string): string | undefined {
  if (!config?.headers) {
    return undefined;
  }

  const headers = config.headers as unknown;
  if (headers && typeof (headers as { get?: (name: string) => unknown }).get === 'function') {
    const value = (headers as { get: (name: string) => unknown }).get(header);
    return typeof value === 'string' ? value : undefined;
  }

  return (headers as Record<string, unknown>)[header] as string | undefined;
}

describe('AuthService', () => {
  const authService = AuthService.getInstance();
  const originalAdapter = api.defaults.adapter;

  beforeEach(() => {
    localStorage.clear();
    document.cookie = 'csrf_token=; Max-Age=0; path=/';
    clearCsrfToken();
    delete (api.defaults.headers.common as any)['X-CSRF-Token'];
    api.defaults.adapter = originalAdapter;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    api.defaults.adapter = originalAdapter;
  });

  it('should fetch csrf token before login and return response data', async () => {
    const getDeviceIdSpy = vi
      .spyOn(authService as unknown as { getDeviceId: () => string }, 'getDeviceId')
      .mockReturnValue('test-device-id');
    const getSpy = vi
      .spyOn(api, 'get')
      .mockResolvedValue({ data: { csrfToken: 'csrf-123' } } as any);
    const expectedResponse = {
      token: 'token123',
      refreshToken: 'refresh123',
      user: {
        id: 1,
        email: 'user@example.com',
        nome: 'User',
        papel: 'admin',
      },
    };
    const postSpy = vi
      .spyOn(api, 'post')
      .mockResolvedValue({ data: expectedResponse } as any);

    const result = await authService.login({ email: 'user@example.com', password: 'secret' });

    expect(getSpy).toHaveBeenCalledTimes(1);
    expect(getSpy).toHaveBeenCalledWith('/csrf-token', { withCredentials: true });
    expect(postSpy).toHaveBeenCalledWith(
      '/auth/login',
      { email: 'user@example.com', password: 'secret', deviceId: 'test-device-id' },
      { withCredentials: true }
    );
    expect(result).toEqual(expectedResponse);
    expect(getDeviceIdSpy).toHaveBeenCalled();
    expect(getCsrfToken()).toBe('csrf-123');
    expect(api.defaults.headers.common['X-CSRF-Token']).toBe('csrf-123');
  });

  it('should fallback to legacy CSRF endpoint when primary request fails', async () => {
    vi
      .spyOn(authService as unknown as { getDeviceId: () => string }, 'getDeviceId')
      .mockReturnValue('device');
    const getSpy = vi
      .spyOn(api, 'get')
      .mockRejectedValueOnce(new Error('not found'))
      .mockResolvedValueOnce({ data: { csrfToken: 'legacy-token' } } as any);
    const postSpy = vi.spyOn(api, 'post').mockResolvedValue({ data: { token: 'a', refreshToken: 'b', user: { id: 1, email: '', nome: '', papel: '' } } } as any);

    await authService.login({ email: 'a', password: 'b' });

    expect(getSpy).toHaveBeenCalledTimes(2);
    expect(getSpy.mock.calls[0]).toEqual(['/csrf-token', { withCredentials: true }]);
    expect(getSpy.mock.calls[1]).toEqual(['/auth/csrf', { withCredentials: true }]);
    expect(postSpy).toHaveBeenCalled();
    expect(getCsrfToken()).toBe('legacy-token');
  });

  it('should throw when no CSRF token can be retrieved', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: {} } as any);

    await expect(authService.login({ email: 'user@example.com', password: 'secret' })).rejects.toThrow(
      /token CSRF/i
    );
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
    const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ data: { csrfToken: 'logout-token' } } as any);
    const postSpy = vi.spyOn(api, 'post').mockResolvedValue({} as any);

    await authService.logout();

    expect(getSpy).toHaveBeenCalledWith('/csrf-token', { withCredentials: true });
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
    expect(api.defaults.headers.common['X-CSRF-Token']).toBe('logout-token');
  });

  it('should fetch csrf token before refreshing token', async () => {
    vi
      .spyOn(authService as unknown as { getDeviceId: () => string }, 'getDeviceId')
      .mockReturnValue('device-refresh');
    const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ data: { csrfToken: 'refresh-token' } } as any);
    const responsePayload = {
      message: 'ok',
      token: 'token',
      refreshToken: 'refresh',
      user: { id: 1, role: 'admin' },
    };
    const postSpy = vi.spyOn(api, 'post').mockResolvedValue({ data: responsePayload } as any);

    const result = await authService.refreshToken();

    expect(getSpy).toHaveBeenCalledWith('/csrf-token', { withCredentials: true });
    expect(postSpy).toHaveBeenCalledWith(
      '/auth/refresh',
      { deviceId: 'device-refresh' },
      { withCredentials: true }
    );
    expect(result).toEqual(responsePayload);
    expect(getCsrfToken()).toBe('refresh-token');
  });

  it('should inject pure CSRF token header on login requests', async () => {
    const expectedResponse = {
      token: 'token123',
      refreshToken: 'refresh123',
      user: { id: 1, email: 'user@example.com', nome: 'User', papel: 'admin' },
    };
    const requestLog: AxiosRequestConfig[] = [];
    api.defaults.adapter = vi
      .fn(async (config: AxiosRequestConfig) => {
        requestLog.push({ ...config, headers: config.headers });
        if (config.url === '/csrf-token' && config.method === 'get') {
          return {
            data: { csrfToken: 'csrf-123' },
            status: 200,
            statusText: 'OK',
            headers: {},
            config,
          };
        }

        if (config.url === '/auth/login' && config.method === 'post') {
          return {
            data: expectedResponse,
            status: 200,
            statusText: 'OK',
            headers: {},
            config,
          };
        }

        return {
          data: {},
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        };
      }) as any;

    document.cookie = 'csrf_token=csrf-cookie; path=/';

    const result = await authService.login({ email: 'user@example.com', password: 'secret' });

    const loginRequest = requestLog.find((req) => req.url === '/auth/login');
    expect(result).toEqual(expectedResponse);
    expect(getHeaderValue(loginRequest, 'X-CSRF-Token')).toBe('csrf-123');
    expect(getHeaderValue(loginRequest, 'X-CSRF-Token')).not.toBe('csrf-cookie');
  });

  it('should inject pure CSRF token header on logout requests', async () => {
    const requestLog: AxiosRequestConfig[] = [];
    api.defaults.adapter = vi
      .fn(async (config: AxiosRequestConfig) => {
        requestLog.push({ ...config, headers: config.headers });
        if (config.url === '/csrf-token' && config.method === 'get') {
          return {
            data: { csrfToken: 'logout-token' },
            status: 200,
            statusText: 'OK',
            headers: {},
            config,
          };
        }

        if (config.url === '/auth/logout' && config.method === 'post') {
          return {
            data: {},
            status: 200,
            statusText: 'OK',
            headers: {},
            config,
          };
        }

        return {
          data: {},
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        };
      }) as any;

    document.cookie = 'csrf_token=csrf-cookie; path=/';

    await authService.logout();

    const logoutRequest = requestLog.find((req) => req.url === '/auth/logout');
    expect(getHeaderValue(logoutRequest, 'X-CSRF-Token')).toBe('logout-token');
    expect(getHeaderValue(logoutRequest, 'X-CSRF-Token')).not.toBe('csrf-cookie');
  });

  it('should inject pure CSRF token header on refresh requests', async () => {
    const responsePayload = {
      message: 'ok',
      token: 'token',
      refreshToken: 'refresh',
      user: { id: 1, role: 'admin' },
    };
    const requestLog: AxiosRequestConfig[] = [];
    api.defaults.adapter = vi
      .fn(async (config: AxiosRequestConfig) => {
        requestLog.push({ ...config, headers: config.headers });
        if (config.url === '/csrf-token' && config.method === 'get') {
          return {
            data: { csrfToken: 'refresh-token' },
            status: 200,
            statusText: 'OK',
            headers: {},
            config,
          };
        }

        if (config.url === '/auth/refresh' && config.method === 'post') {
          return {
            data: responsePayload,
            status: 200,
            statusText: 'OK',
            headers: {},
            config,
          };
        }

        return {
          data: {},
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        };
      }) as any;

    document.cookie = 'csrf_token=csrf-cookie; path=/';

    const result = await authService.refreshToken();

    const refreshRequest = requestLog.find((req) => req.url === '/auth/refresh');
    expect(result).toEqual(responsePayload);
    expect(getHeaderValue(refreshRequest, 'X-CSRF-Token')).toBe('refresh-token');
    expect(getHeaderValue(refreshRequest, 'X-CSRF-Token')).not.toBe('csrf-cookie');
  });
});
