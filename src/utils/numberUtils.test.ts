import { describe, it, expect } from 'vitest';
import { toNumber } from './numberUtils';

describe('numberUtils', () => {
  it('deve converter string para número', () => {
    expect(toNumber('123')).toBe(123);
  });
});
