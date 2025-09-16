import { describe, it, expect } from 'vitest';
import { uniqueArray } from './arrayUtils';

describe('arrayUtils', () => {
  it('deve retornar array único', () => {
    expect(uniqueArray([1, 1, 2, 2])).toEqual([1, 2]);
  });
});
