import { describe, it, expect } from 'vitest';
import { formatDate } from './dateFormatter';

describe('dateFormatter', () => {
  it('deve formatar data para dd/MM/yyyy respeitando UTC', () => {
    expect(formatDate(new Date('2023-01-01'))).toBe('01/01/2023');
  });

  it('deve aceitar string ISO', () => {
    expect(formatDate('2023-12-31')).toBe('31/12/2023');
  });

  it('deve retornar vazio para data inválida', () => {
    expect(formatDate('data-invalida')).toBe('');
  });
});
