import { describe, it, expect } from 'vitest';
import { formatDate } from './dateFormatter';

describe('dateFormatter', () => {
  it('deve formatar data para dd/MM/yyyy', () => {
    expect(formatDate(new Date('2023-01-01'))).toBe('01/01/2023');
  });
});
