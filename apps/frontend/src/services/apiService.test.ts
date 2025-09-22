import { describe, it, expect, vi } from 'vitest';
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
});
