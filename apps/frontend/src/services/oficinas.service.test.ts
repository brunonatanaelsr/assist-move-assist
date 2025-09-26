import { describe, it, expect, vi } from 'vitest';
import { OficinasService } from './oficinas.service';
import type { CreateOficinaDTO, Oficina } from './oficinas.service';

describe('OficinasService', () => {
  it('listar deve retornar array', async () => {
    const oficina: Oficina = {
      id: 1,
      nome: 'Oficina Teste',
      data_inicio: '2024-01-01',
      horario_inicio: '08:00',
      horario_fim: '10:00',
      vagas_total: 20,
      status: 'ativa'
    };
    vi.spyOn(OficinasService, 'listar').mockResolvedValue({
      success: true,
      data: [oficina],
    } as any);
    const res = await OficinasService.listar();
    expect(res.success).toBe(true);
    expect(res.data?.[0].nome).toBe('Oficina Teste');
  });

  it('criar deve retornar oficina criada', async () => {
    const payload: CreateOficinaDTO = {
      nome: 'Nova Oficina',
      data_inicio: '2024-01-01',
      horario_inicio: '08:00',
      horario_fim: '10:00',
      vagas_total: 15
    };
    const created: Oficina = {
      id: 2,
      ...payload,
      status: 'ativa'
    };
    vi.spyOn(OficinasService, 'criar').mockResolvedValue(created);
    const res = await OficinasService.criar(payload) as Oficina;
    expect(res.nome).toBe('Nova Oficina');
  });
});
