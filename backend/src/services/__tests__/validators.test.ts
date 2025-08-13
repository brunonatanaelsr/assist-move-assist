import {
  validateCPF,
  validateEmail,
  validatePhone,
  validateCEP,
  validateDate,
  validatePassword
} from '../validators';

describe('Validators', () => {
  describe('validateCPF', () => {
    it('deve validar CPF correto', () => {
      expect(validateCPF('529.982.247-25')).toBe(true);
    });

    it('deve rejeitar CPF inválido', () => {
      expect(validateCPF('123.456.789-00')).toBe(false);
    });
  });

  describe('validateEmail', () => {
    it('deve validar email correto', () => {
      expect(validateEmail('usuario@teste.com')).toBe(true);
    });

    it('deve rejeitar email inválido', () => {
      expect(validateEmail('usuario@teste')).toBe(false);
    });
  });

  describe('validatePhone', () => {
    it('deve validar telefone com 11 dígitos', () => {
      expect(validatePhone('(11) 98765-4321')).toBe(true);
    });

    it('deve rejeitar telefone curto', () => {
      expect(validatePhone('12345')).toBe(false);
    });
  });

  describe('validateCEP', () => {
    it('deve validar CEP correto', () => {
      expect(validateCEP('12345-678')).toBe(true);
    });

    it('deve rejeitar CEP inválido', () => {
      expect(validateCEP('1234')).toBe(false);
    });
  });

  describe('validateDate', () => {
    it('deve validar data válida', () => {
      expect(validateDate('01/01/2020')).toBe(true);
    });

    it('deve rejeitar data inválida', () => {
      expect(validateDate('32/01/2020')).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('deve validar senha forte', () => {
      const result = validatePassword('Aa1!aaaa');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('deve detectar senha fraca', () => {
      const result = validatePassword('weak');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});

