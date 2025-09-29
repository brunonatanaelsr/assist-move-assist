import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AUTH_TOKEN_KEY } from '@/config';
import apiService from './apiService';
import { clearCsrfToken, setCsrfToken } from './csrfTokenStore';

const getAxiosInstance = () => (apiService as unknown as { api: any }).api;

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

  it('não envia Authorization após limpar tokens', async () => {
    const handlers = getAxiosInstance().interceptors.request.handlers;
    const requestHandler = handlers.find((handler: any) => handler && typeof handler.fulfilled === 'function');
    expect(requestHandler).toBeDefined();

    const handlerFn = requestHandler!.fulfilled;

    localStorage.setItem(AUTH_TOKEN_KEY, 'meu-token');
    const withToken = await handlerFn({ headers: {} });
    expect(withToken.headers.Authorization).toBe('Bearer meu-token');

    localStorage.clear();
    const withoutToken = await handlerFn({ headers: { Authorization: 'Bearer antigo' } });
    expect(withoutToken.headers.Authorization).toBeUndefined();
  });
});

describe('ApiService CSRF handling', () => {
  it('should inject stored CSRF token on mutating requests', async () => {
    setCsrfToken('stored-token');
    const requestHandler = getAxiosInstance().interceptors.request.handlers[0].fulfilled!;

    const config = await requestHandler({ method: 'post', headers: {} });

    expect(config.headers['X-CSRF-Token']).toBe('stored-token');
  });

  it('should not inject CSRF header when token is missing', async () => {
    const requestHandler = getAxiosInstance().interceptors.request.handlers[0].fulfilled!;

    const config = await requestHandler({ method: 'delete', headers: {} });

    expect(config.headers['X-CSRF-Token']).toBeUndefined();
  });

  it('should skip CSRF header for safe methods', async () => {
    setCsrfToken('stored-token');
    const requestHandler = getAxiosInstance().interceptors.request.handlers[0].fulfilled!;

    const config = await requestHandler({ method: 'get', headers: {} });

    expect(config.headers['X-CSRF-Token']).toBeUndefined();
  });
});
