import { describe, it, expect, vi } from 'vitest';
import { AUTH_TOKEN_KEY } from '@/config';
import apiService from './apiService';

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
    const handlers = (apiService as any).api.interceptors.request.handlers;
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
