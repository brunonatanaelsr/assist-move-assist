import { describe, it, expect } from 'vitest';
import { arrayFilter } from './arrayFilter';

describe('arrayFilter', () => {
  it('deve filtrar array', () => {
    expect(arrayFilter([1,2,3,4], n => n > 2)).toEqual([3,4]);
  });
});
