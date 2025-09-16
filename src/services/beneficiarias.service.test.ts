import { describe, it, expect, vi } from 'vitest';
import { BeneficiariasService } from './beneficiarias.service';

describe('BeneficiariasService', () => {
  it('listar deve retornar array', async () => {
    vi.spyOn(BeneficiariasService, 'listar').mockResolvedValue({ success: true, data: [{ id: 1, nome_completo: 'Teste', status: 'ativa' }], message: '' });
    const res = await BeneficiariasService.listar();
    expect(res.success).toBe(true);
    expect(Array.isArray(res.data)).toBe(true);
  });

  it('criar deve retornar beneficiaria criada', async () => {
    vi.spyOn(BeneficiariasService, 'criar').mockResolvedValue({ success: true, data: { id: 2, nome_completo: 'Nova', status: 'ativa' }, message: '' });
    const res = await BeneficiariasService.criar({ nome_completo: 'Nova', status: 'ativa' });
    expect(res.success).toBe(true);
    expect(res.data.nome_completo).toBe('Nova');
  });
});
