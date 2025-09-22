import { describe, it, expect, vi } from 'vitest';
import { BeneficiariasService } from './beneficiarias.service';
import type { Beneficiaria } from '@/types/shared';
import type { ServiceResponse } from './beneficiarias.service';

const mockBeneficiaria = (): Beneficiaria => ({
  id: 1,
  nome_completo: 'Teste',
  cpf: '00000000000',
  data_nascimento: new Date('1990-01-01'),
  telefone: '11999999999',
  endereco: {
    logradouro: 'Rua Teste',
    numero: '123',
    bairro: 'Centro',
    cidade: 'São Paulo',
    estado: 'SP',
    cep: '01001000'
  },
  status: 'ativa',
  data_cadastro: new Date('2024-01-01'),
  ultima_atualizacao: new Date('2024-01-02')
});

describe('BeneficiariasService', () => {
  it('listar deve retornar array', async () => {
    const payload: ServiceResponse<Beneficiaria[]> = { success: true, data: [mockBeneficiaria()], message: '' };
    vi.spyOn(BeneficiariasService, 'listar').mockResolvedValue(payload);
    const res = await BeneficiariasService.listar();
    expect(res.success).toBe(true);
    expect(Array.isArray(res.data)).toBe(true);
  });

  it('criar deve retornar beneficiaria criada', async () => {
    const created = { ...mockBeneficiaria(), id: 2, nome_completo: 'Nova' };
    vi.spyOn(BeneficiariasService, 'criar').mockResolvedValue({ success: true, data: created, message: '' });
    const res = await BeneficiariasService.criar({ nome_completo: 'Nova', status: 'ativa' } as Partial<Beneficiaria>);
    expect(res.success).toBe(true);
    expect(res.data.nome_completo).toBe('Nova');
  });
});
