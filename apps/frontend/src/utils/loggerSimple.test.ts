import { describe, it, expect } from 'vitest';
import { loggerSimple } from './loggerSimple';

describe('loggerSimple', () => {
  it('deve logar info', () => {
    expect(() => loggerSimple.info('mensagem')).not.toThrow();
  });
  it('deve logar erro', () => {
    expect(() => loggerSimple.error('erro')).not.toThrow();
  });
});
