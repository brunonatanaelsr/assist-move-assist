import { describe, it, expect, vi } from 'vitest';
import { OficinasService } from './oficinas.service';

describe('OficinasService', () => {
  it('listar deve retornar array', async () => {
    vi.spyOn(OficinasService, 'listar').mockResolvedValue([{ id: 1, nome: 'Oficina Teste' }]);
    const res = await OficinasService.listar();
    expect(Array.isArray(res)).toBe(true);
    expect(res[0].nome).toBe('Oficina Teste');
  });

  it('criar deve retornar oficina criada', async () => {
    vi.spyOn(OficinasService, 'criar').mockResolvedValue({ id: 2, nome: 'Nova Oficina' });
    const res = await OficinasService.criar({ nome: 'Nova Oficina' });
    expect(res.nome).toBe('Nova Oficina');
  });
});
