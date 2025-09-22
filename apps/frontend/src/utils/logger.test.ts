import { describe, it, expect } from 'vitest';
import { logger } from './logger';

describe('logger', () => {
  it('deve logar info', () => {
    expect(() => logger.info('mensagem')).not.toThrow();
  });
  it('deve logar erro', () => {
    expect(() => logger.error('erro')).not.toThrow();
  });
});
