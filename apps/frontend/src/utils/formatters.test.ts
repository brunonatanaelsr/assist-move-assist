import { describe, it, expect } from 'vitest';
import { formatCPF, formatPhone } from './formatters';

describe('formatters', () => {
  it('deve formatar CPF', () => {
    expect(formatCPF('12345678901')).toBe('123.456.789-01');
  });
  it('deve formatar telefone', () => {
    expect(formatPhone('11999998888')).toBe('(11) 99999-8888');
  });
});
