import { describe, expect, it } from '@jest/globals';
import {
  createParticipacaoSchema,
  updateParticipacaoSchema
} from '../participacao.validator';

describe('participacao.validator', () => {
  it('coerces string inputs for criação', () => {
    const parsed = createParticipacaoSchema.parse({
      beneficiaria_id: '10',
      projeto_id: '20',
      status: 'inscrita',
      data_inscricao: '2024-01-15'
    });

    expect(parsed.beneficiaria_id).toBe(10);
    expect(parsed.projeto_id).toBe(20);
    expect(parsed.data_inscricao).toBeInstanceOf(Date);
  });

  it('requires data_conclusao quando status concluida', () => {
    expect(() => updateParticipacaoSchema.parse({ status: 'concluida' })).toThrow();
    const parsed = updateParticipacaoSchema.parse({
      status: 'concluida',
      data_conclusao: '2024-02-01'
    });

    expect(parsed.data_conclusao).toBeInstanceOf(Date);
  });
});
