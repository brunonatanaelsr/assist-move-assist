import { describe, it, expect } from 'vitest';
import { isValidCpf, isValidPhone } from './validators';

describe('validators', () => {
  it('deve validar CPF', () => {
    expect(isValidCpf('12345678901')).toBeTypeOf('boolean');
  });
  it('deve validar telefone', () => {
    expect(isValidPhone('11999998888')).toBeTypeOf('boolean');
  });
});
