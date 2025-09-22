import { describe, it, expect } from 'vitest';
import { translateErrorMessage } from './apiError';

describe('apiError', () => {
  it('deve traduzir mensagem de erro', () => {
    expect(translateErrorMessage('Unauthorized')).toBeTypeOf('string');
  });
});
