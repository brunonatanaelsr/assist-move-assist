import { describe, it, expect } from 'vitest';
import { filterBeneficiarias } from './beneficiarias';
import type { Beneficiaria } from '@/types/shared';

describe('filterBeneficiarias', () => {
  const createBeneficiaria = (
    overrides: Partial<Beneficiaria> & { programa_servico: string }
  ): Beneficiaria => ({
    id: 1,
    codigo: '001',
    nome_completo: 'Beneficiária',
    cpf: '12345678901',
    data_nascimento: '2000-01-01',
    telefone: '11999999999',
    status: 'ativa',
    programa_servico: overrides.programa_servico,
    ...overrides,
  });

  it('retorna apenas beneficiárias do programa selecionado', () => {
    const beneficiarias: Beneficiaria[] = [
      createBeneficiaria({ id: 1, codigo: '001', programa_servico: 'Programa A', nome_completo: 'Ana' }),
      createBeneficiaria({ id: 2, codigo: '002', programa_servico: 'Programa B', nome_completo: 'Beatriz' }),
      createBeneficiaria({ id: 3, codigo: '003', programa_servico: 'Programa B', nome_completo: 'Bianca' }),
    ];

    const filtradas = filterBeneficiarias(beneficiarias, { programa: 'Programa B' });

    expect(filtradas).toHaveLength(2);
    expect(filtradas.map((b) => b.nome_completo)).toEqual(['Beatriz', 'Bianca']);
  });
});
