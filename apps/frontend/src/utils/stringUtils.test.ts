import { describe, it, expect } from 'vitest';
import { capitalize } from './stringUtils';

describe('stringUtils', () => {
  it('deve capitalizar string', () => {
    expect(capitalize('teste')).toBe('Teste');
  });
});
