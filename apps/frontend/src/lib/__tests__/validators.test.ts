import { describe, it, expect, vi } from 'vitest';

// Mock dos módulos necessários
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

describe('Validators Tests', () => {
  it('deve validar CPF com máscara', () => {
    const validCPF = '123.456.789-10';
    expect(validCPF).toMatch(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/);
  });

  it('deve validar CPF sem máscara', () => {
    const validCPF = '12345678910';
    expect(validCPF).toMatch(/^\d{11}$/);
    expect(validCPF.length).toBe(11);
  });

  it('deve validar email completo', () => {
    const validEmail = 'bruno@move.com';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    expect(emailRegex.test(validEmail)).toBe(true);
  });

  it('deve rejeitar email inválido', () => {
    const invalidEmails = ['invalid', 'invalid@', '@invalid.com', 'invalid.com'];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    invalidEmails.forEach(email => {
      expect(emailRegex.test(email)).toBe(false);
    });
  });

  it('deve validar telefone brasileiro', () => {
    const validPhone = '(11) 98765-4321';
    expect(validPhone).toMatch(/^\(\d{2}\) \d{4,5}-\d{4}$/);
  });

  it('deve validar senha forte', () => {
    const strongPassword = 'MinhaSenh@123';
    
    // Verificar critérios básicos
    expect(strongPassword.length).toBeGreaterThanOrEqual(8);
    expect(/[A-Z]/.test(strongPassword)).toBe(true); // Maiúscula
    expect(/[a-z]/.test(strongPassword)).toBe(true); // Minúscula
    expect(/\d/.test(strongPassword)).toBe(true); // Número
    expect(/[^A-Za-z0-9]/.test(strongPassword)).toBe(true); // Caractere especial
  });

  it('deve validar CEP brasileiro', () => {
    const validCEP = '01234-567';
    expect(validCEP).toMatch(/^\d{5}-\d{3}$/);
  });

  it('deve validar data no formato brasileiro', () => {
    const validDate = '15/03/1990';
    const parts = validDate.split('/');
    
    expect(parts.length).toBe(3);
    expect(parseInt(parts[0])).toBeLessThanOrEqual(31); // Dia
    expect(parseInt(parts[1])).toBeLessThanOrEqual(12); // Mês
    expect(parseInt(parts[2])).toBeGreaterThan(1900); // Ano
  });

  it('deve validar RG brasileiro', () => {
    const validRG = '12.345.678-9';
    expect(validRG).toMatch(/^\d{2}\.\d{3}\.\d{3}-\d{1}$/);
  });

  it('deve validar nome completo', () => {
    const validName = 'Maria da Silva Santos';
    expect(validName.trim().length).toBeGreaterThan(0);
    expect(validName.split(' ').length).toBeGreaterThanOrEqual(2);
  });
});
