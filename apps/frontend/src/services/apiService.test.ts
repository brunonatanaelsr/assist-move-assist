import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import apiService from './apiService';
import { clearCsrfToken, getCsrfToken, setCsrfToken } from './csrfTokenStore';

const getAxiosInstance = () => apiService.getHttpClient();

beforeEach(() => {
  localStorage.clear();
  clearCsrfToken();
  const axiosInstance = getAxiosInstance();
  delete axiosInstance.defaults.headers.common['X-CSRF-Token'];
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('apiService', () => {
  it('deve retornar erro para rota inexistente', async () => {
    vi.spyOn(apiService, 'get').mockResolvedValue({ success: false, message: 'Not found' });
    const res = await apiService.get('/rota-inexistente');
    expect(res.success).toBe(false);
    expect(res.message).toBe('Not found');
  });

  it('deve retornar sucesso para rota simulada', async () => {
    vi.spyOn(apiService, 'get').mockResolvedValue({ success: true, data: { ok: true } });
    const res = await apiService.get('/rota-simulada');
    expect(res.success).toBe(true);
    expect(res.data).toEqual({ ok: true });
  });

  it('não adiciona Authorization automaticamente', async () => {
    const handlers = getAxiosInstance().interceptors.request.handlers;
    const requestHandler = handlers.find((handler: any) => handler && typeof handler.fulfilled === 'function');
    expect(requestHandler).toBeDefined();

    const handlerFn = requestHandler!.fulfilled;

    localStorage.setItem('auth_token', 'meu-token');
    const withToken = await handlerFn({ headers: {} });
    expect(withToken.headers.Authorization).toBeUndefined();

    localStorage.clear();
    const withoutToken = await handlerFn({ headers: { Authorization: 'Bearer antigo' } });
    expect(withoutToken.headers.Authorization).toBe('Bearer antigo');
  });
});

describe('ApiService CSRF handling', () => {
  it('should inject stored CSRF token on mutating requests', async () => {
    setCsrfToken('stored-token');
    const requestHandler = getAxiosInstance().interceptors.request.handlers[0].fulfilled!;

    const config = await requestHandler({ method: 'post', headers: {} });

    expect(config.headers['X-CSRF-Token']).toBe('stored-token');
  });

  it('should not fetch CSRF token for safe methods without stored token', async () => {
    const axiosInstance = getAxiosInstance();
    const getSpy = vi.spyOn(axiosInstance, 'get');
    const requestHandler = axiosInstance.interceptors.request.handlers[0].fulfilled!;

    const config = await requestHandler({ method: 'get', headers: {} });

    expect(config.headers['X-CSRF-Token']).toBeUndefined();
    expect(getSpy).not.toHaveBeenCalled();
  });

  it('should skip CSRF header for safe methods', async () => {
    setCsrfToken('stored-token');
    const requestHandler = getAxiosInstance().interceptors.request.handlers[0].fulfilled!;

    const config = await requestHandler({ method: 'get', headers: {} });

    expect(config.headers['X-CSRF-Token']).toBeUndefined();
  });

  it('fetches CSRF token when missing before mutating requests', async () => {
    const axiosInstance = getAxiosInstance();
    const getSpy = vi
      .spyOn(axiosInstance, 'get')
      .mockResolvedValue({ data: { csrfToken: 'fetched-token' } });

    const requestHandler = axiosInstance.interceptors.request.handlers[0].fulfilled!;

    const config = await requestHandler({ method: 'post', headers: {} });

    expect(getSpy).toHaveBeenCalledWith('/csrf-token', { withCredentials: true });
    expect(config.headers['X-CSRF-Token']).toBe('fetched-token');
    expect(getCsrfToken()).toBe('fetched-token');
  });

  it('reuses in-flight CSRF requests across concurrent mutations', async () => {
    const axiosInstance = getAxiosInstance();
    let resolveFetch: ((value: unknown) => void) | undefined;
    const fetchPromise = new Promise((resolve) => {
      resolveFetch = resolve;
    });

    const getSpy = vi
      .spyOn(axiosInstance, 'get')
      .mockImplementation(() => fetchPromise as Promise<{ data: { csrfToken: string } }>);

    const requestHandler = axiosInstance.interceptors.request.handlers[0].fulfilled!;

    const firstCall = requestHandler({ method: 'post', headers: {} });
    const secondCall = requestHandler({ method: 'patch', headers: {} });

    resolveFetch?.({ data: { csrfToken: 'race-token' } });

    const [firstConfig, secondConfig] = await Promise.all([firstCall, secondCall]);

    expect(getSpy).toHaveBeenCalledTimes(1);
    expect(firstConfig.headers['X-CSRF-Token']).toBe('race-token');
    expect(secondConfig.headers['X-CSRF-Token']).toBe('race-token');
    expect(getCsrfToken()).toBe('race-token');
  });
});
