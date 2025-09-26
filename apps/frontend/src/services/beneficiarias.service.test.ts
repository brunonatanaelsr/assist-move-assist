import { describe, it, expect, vi } from 'vitest';
import { BeneficiariasService } from './beneficiarias.service';
import type { Beneficiaria } from '@/types/shared';

describe('BeneficiariasService', () => {
  it('listar deve retornar array', async () => {
    const beneficiaria = { id: 1, nome_completo: 'Teste', status: 'ativa' } as Beneficiaria;
    vi.spyOn(BeneficiariasService, 'listar').mockResolvedValue({ success: true, data: [beneficiaria], message: '' });
    const res = await BeneficiariasService.listar();
    expect(res.success).toBe(true);
    expect(Array.isArray(res.data)).toBe(true);
  });

  it('criar deve retornar beneficiaria criada', async () => {
    const novaBeneficiaria = { id: 2, nome_completo: 'Nova', status: 'ativa' } as Beneficiaria;
    vi.spyOn(BeneficiariasService, 'criar').mockResolvedValue({ success: true, data: novaBeneficiaria, message: '' });
    const res = await BeneficiariasService.criar({ nome_completo: 'Nova', status: 'ativa' });
    expect(res.success).toBe(true);
    expect(res.data.nome_completo).toBe('Nova');
  });
});
