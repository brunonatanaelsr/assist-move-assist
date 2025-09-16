import { describe, it, expect } from 'vitest';
import { deepClone } from './objectUtils';

describe('objectUtils', () => {
  it('deve clonar objeto profundamente', () => {
    const obj = { a: 1, b: { c: 2 } };
    expect(deepClone(obj)).toEqual(obj);
    expect(deepClone(obj)).not.toBe(obj);
  });
});
