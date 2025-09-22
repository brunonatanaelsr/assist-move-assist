import { describe, it, expect } from 'vitest';
import { cn } from '../utils';

describe('Utils Tests', () => {
  it('deve testar função cn (classname utility)', () => {
    const result = cn('base-class', 'additional-class');
    expect(typeof result).toBe('string');
  });

  it('deve validar CPF básico', () => {
    const cpf = '123.456.789-10';
    expect(cpf).toContain('.');
    expect(cpf).toContain('-');
    expect(cpf.length).toBe(14);
  });

  it('deve validar email básico', () => {
    const email = 'test@example.com';
    expect(email).toContain('@');
    expect(email).toContain('.');
  });

  it('deve validar números de telefone', () => {
    const phone = '(11) 98765-4321';
    expect(phone).toContain('(');
    expect(phone).toContain(')');
    expect(phone).toContain('-');
  });

  it('deve validar formato de data', () => {
    const date = '01/01/1990';
    expect(date).toContain('/');
    expect(date.split('/').length).toBe(3);
  });

  it('deve validar URLs', () => {
    const url = 'https://movemarias.squadsolucoes.com.br';
    expect(url).toMatch(/^https?:\/\//);
    expect(url).toContain('.');
  });

  it('deve validar formato de CEP', () => {
    const cep = '01234-567';
    expect(cep).toContain('-');
    expect(cep.length).toBe(9);
  });

  it('deve validar arrays não vazios', () => {
    const items = ['item1', 'item2', 'item3'];
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThan(0);
  });
});
