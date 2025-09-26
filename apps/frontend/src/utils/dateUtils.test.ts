import { describe, it, expect } from 'vitest';
import { formatDate } from './dateUtils';

describe('dateUtils', () => {
  it('deve formatar data', () => {
    expect(formatDate(new Date('2023-01-01'))).toBeTypeOf('string');
  });
});
