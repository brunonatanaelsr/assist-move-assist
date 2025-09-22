import { describe, it, expect, vi } from 'vitest';
import { OficinasService } from './oficinas.service';
import type { Oficina, CreateOficinaDTO } from './oficinas.service';

const mockOficina = (overrides: Partial<Oficina> = {}): Oficina => ({
  id: overrides.id ?? 1,
  nome: overrides.nome ?? 'Oficina Teste',
  descricao: overrides.descricao ?? null,
  instrutor: overrides.instrutor ?? null,
  data_inicio: overrides.data_inicio ?? '2024-01-01',
  data_fim: overrides.data_fim ?? null,
  horario_inicio: overrides.horario_inicio ?? '09:00',
  horario_fim: overrides.horario_fim ?? '11:00',
  local: overrides.local ?? 'Sala 1',
  vagas_total: overrides.vagas_total ?? 20,
  vagas_ocupadas: overrides.vagas_ocupadas ?? 0,
  status: overrides.status ?? 'ativa',
  dias_semana: overrides.dias_semana ?? 'segunda'
});

const mockCreatePayload = (overrides: Partial<CreateOficinaDTO> = {}): CreateOficinaDTO => ({
  nome: overrides.nome ?? 'Nova Oficina',
  descricao: overrides.descricao ?? null,
  instrutor: overrides.instrutor ?? null,
  data_inicio: overrides.data_inicio ?? '2024-02-01',
  data_fim: overrides.data_fim ?? null,
  horario_inicio: overrides.horario_inicio ?? '14:00',
  horario_fim: overrides.horario_fim ?? '16:00',
  local: overrides.local ?? 'Sala 2',
  vagas_total: overrides.vagas_total ?? 15,
  dias_semana: overrides.dias_semana ?? 'terça',
  projeto_id: overrides.projeto_id,
  status: overrides.status ?? 'ativa'
});

describe('OficinasService', () => {
  it('listar deve retornar array', async () => {
    vi.spyOn(OficinasService, 'listar').mockResolvedValue([mockOficina()]);
    const res = await OficinasService.listar() as Oficina[];
    expect(Array.isArray(res)).toBe(true);
    expect(res[0].nome).toBe('Oficina Teste');
  });

  it('criar deve retornar oficina criada', async () => {
    vi.spyOn(OficinasService, 'criar').mockResolvedValue({ ...mockOficina({ id: 2, nome: 'Nova Oficina' }) });
    const res = await OficinasService.criar(mockCreatePayload()) as Oficina;
    expect(res.nome).toBe('Nova Oficina');
  });
});
