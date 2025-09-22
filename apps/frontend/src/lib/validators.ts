// Exportações diretas para testes
export function isValidCpf(cpf: string): boolean {
  return DocumentValidator.validateCPF(cpf).isValid;
}

export function isValidPhone(phone: string): boolean {
  return DocumentValidator.validatePhone(phone).isValid;
}
// Validações para documentos brasileiros
export class DocumentValidator {
  static validateCNPJ(cnpj: string): { isValid: boolean; error?: string } {
    const cleanCNPJ = cnpj.replace(/\D/g, '');
    if (cleanCNPJ.length !== 14) {
      return { isValid: false, error: 'CNPJ deve ter 14 dígitos' };
    }
    if (/^(\d)\1{13}$/.test(cleanCNPJ)) {
      return { isValid: false, error: 'CNPJ inválido' };
    }
    const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const calculateDigit = (base: string, weights: number[]) => {
      const sum = base.split('').reduce((acc, digit, index) => {
        return acc + (parseInt(digit) * weights[index]);
      }, 0);
      const remainder = sum % 11;
      return remainder < 2 ? 0 : 11 - remainder;
    };
    const base = cleanCNPJ.substring(0, 12);
    const digit1 = calculateDigit(base, weights1);
    const digit2 = calculateDigit(base + digit1, weights2);
    if (cleanCNPJ !== base + digit1 + digit2) {
      return { isValid: false, error: 'CNPJ inválido' };
    }
    return { isValid: true };
  }

  static validateEmail(email: string): { isValid: boolean; error?: string } {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { isValid: false, error: 'Email inválido' };
    }
    return { isValid: true };
  }
  static validateCPF(cpf: string): { isValid: boolean; error?: string } {
    const cleanCPF = cpf.replace(/\D/g, '');
    if (cleanCPF.length !== 11) {
      return { isValid: false, error: 'CPF deve ter 11 dígitos' };
    }
    if (/^(\d)\1{10}$/.test(cleanCPF)) {
      return { isValid: false, error: 'CPF inválido' };
    }
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
    }
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleanCPF.charAt(9))) {
      return { isValid: false, error: 'CPF inválido' };
    }
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleanCPF.charAt(10))) {
      return { isValid: false, error: 'CPF inválido' };
    }
    return { isValid: true };
  }

  static validatePhone(phone: string): { isValid: boolean; error?: string } {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length !== 10 && cleanPhone.length !== 11) {
      return { isValid: false, error: 'Telefone deve ter 10 ou 11 dígitos' };
    }
    const ddd = parseInt(cleanPhone.substring(0, 2));
    if (ddd < 11 || ddd > 99) {
      return { isValid: false, error: 'DDD inválido' };
    }
    return { isValid: true };
  }
  
  static validateCEP(cep: string): { isValid: boolean; error?: string } {
    const cleanCEP = cep.replace(/\D/g, '');
    
    if (cleanCEP.length !== 8) {
      return { isValid: false, error: 'CEP deve ter 8 dígitos' };
    }
    
    if (/^0{8}$/.test(cleanCEP)) {
      return { isValid: false, error: 'CEP inválido' };
    }
    
    return { isValid: true };
  }
  
  static formatCPF(cpf: string): string {
    const clean = cpf.replace(/\D/g, '');
    return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  
  static formatCNPJ(cnpj: string): string {
    const clean = cnpj.replace(/\D/g, '');
    return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  
  static formatPhone(phone: string): string {
    const clean = phone.replace(/\D/g, '');
    
    if (clean.length === 10) {
      return clean.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    } else if (clean.length === 11) {
      return clean.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    
    return phone;
  }
  
  static formatCEP(cep: string): string {
    const clean = cep.replace(/\D/g, '');
    return clean.replace(/(\d{5})(\d{3})/, '$1-$2');
  }
}

// Hook para usar validações em componentes
export const useDocumentValidator = () => {
  return {
    validateCPF: DocumentValidator.validateCPF,
    validateCNPJ: DocumentValidator.validateCNPJ,
    validateEmail: DocumentValidator.validateEmail,
    validatePhone: DocumentValidator.validatePhone,
    validateCEP: DocumentValidator.validateCEP,
    formatCPF: DocumentValidator.formatCPF,
    formatCNPJ: DocumentValidator.formatCNPJ,
    formatPhone: DocumentValidator.formatPhone,
    formatCEP: DocumentValidator.formatCEP,
  };
};
