import { describe, it, expect } from 'vitest';
import { normalizeCpf, normalizePhone } from './format';

describe('format', () => {
  it('deve normalizar CPF', () => {
    expect(normalizeCpf('123.456.789-01')).toBe('12345678901');
  });
  it('deve normalizar telefone', () => {
    expect(normalizePhone('(11) 99999-8888')).toBe('11999998888');
  });
});
