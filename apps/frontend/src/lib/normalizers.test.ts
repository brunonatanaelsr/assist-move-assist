import { describe, it, expect } from 'vitest';
import { normalizeString } from './normalizers';

describe('normalizers', () => {
  it('deve normalizar string', () => {
    expect(normalizeString('áéíóú')).toBeTypeOf('string');
  });
});
