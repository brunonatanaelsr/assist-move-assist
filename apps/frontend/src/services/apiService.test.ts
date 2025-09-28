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

    // Primeiro teste com o token
    localStorage.setItem(AUTH_TOKEN_KEY, 'meu-token');
    const configWithToken = await handlerFn({ headers: {} });
    expect(configWithToken.headers.Authorization).toBe('Bearer meu-token');

    // Limpa o token e verifica que não é mais enviado
    localStorage.removeItem(AUTH_TOKEN_KEY);
    const configWithoutToken = await handlerFn({ headers: {} });
    expect(configWithoutToken.headers.Authorization).toBeUndefined();
  });
});
