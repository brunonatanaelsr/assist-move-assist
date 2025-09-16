import { describe, it, expect } from 'vitest';
import { saveToStorage, getFromStorage } from './storageUtils';

describe('storageUtils', () => {
  it('deve salvar e recuperar do storage', () => {
    saveToStorage('chave', 'valor');
    expect(getFromStorage('chave')).toBe('valor');
  });
});
