import { describe, it, expect } from 'vitest';
import { arraySort } from './arraySort';

describe('arraySort', () => {
  it('deve ordenar array', () => {
    expect(arraySort([3,1,2])).toEqual([1,2,3]);
  });
});
