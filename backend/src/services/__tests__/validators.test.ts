import { validateCPF, validateEmail, validatePhone, validateCEP, validatePassword } from '../validators';

describe('validators', () => {
  it('validates CPF correctly', () => {
    expect(validateCPF('39053344705')).toBe(true);
    expect(validateCPF('12345678900')).toBe(false);
  });

  it('validates email format', () => {
    expect(validateEmail('user@example.com')).toBe(true);
    expect(validateEmail('invalid-email')).toBe(false);
  });

  it('validates phone numbers', () => {
    expect(validatePhone('(11) 91234-5678')).toBe(true);
    expect(validatePhone('1234')).toBe(false);
  });

  it('validates CEP numbers', () => {
    expect(validateCEP('01311-100')).toBe(true);
    expect(validateCEP('123')).toBe(false);
  });

  it('validates strong passwords', () => {
    const result = validatePassword('Str0ng!Pass');
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);

    const weak = validatePassword('weak');
    expect(weak.isValid).toBe(false);
    expect(weak.errors.length).toBeGreaterThan(0);
  });
});
