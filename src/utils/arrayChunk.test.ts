import { describe, it, expect } from 'vitest';
import { arrayChunk } from './arrayChunk';

describe('arrayChunk', () => {
  it('deve dividir array em chunks', () => {
    expect(arrayChunk([1,2,3,4], 2)).toEqual([[1,2],[3,4]]);
  });
});
