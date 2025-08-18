/**
 * Utilitários para validação de dados
 */

/**
 * Valida CPF brasileiro
 */
export function validateCPF(cpf: string): boolean {
  // Remove formatação
  const cleanCPF = cpf.replace(/[^\d]/g, '');
  
  // Verifica se tem 11 dígitos
  if (cleanCPF.length !== 11) return false;
  
  // Verifica se não são todos iguais
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
  
  // Valida primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let digit1 = 11 - (sum % 11);
  if (digit1 >= 10) digit1 = 0;
  
  if (parseInt(cleanCPF.charAt(9)) !== digit1) return false;
  
  // Valida segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  let digit2 = 11 - (sum % 11);
  if (digit2 >= 10) digit2 = 0;
  
  return parseInt(cleanCPF.charAt(10)) === digit2;
}

/**
 * Valida email
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valida telefone brasileiro
 */
export function validatePhone(phone: string): boolean {
  const cleanPhone = phone.replace(/[^\d]/g, '');
  return cleanPhone.length === 10 || cleanPhone.length === 11;
}

/**
 * Valida CEP brasileiro
 */
export function validateCEP(cep: string): boolean {
  const cleanCEP = cep.replace(/[^\d]/g, '');
  return cleanCEP.length === 8;
}

/**
 * Valida data no formato DD/MM/AAAA
 */
export function validateDate(date: string): boolean {
  const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const match = date.match(dateRegex);
  
  if (!match) return false;
  
  const day = parseInt(match[1]!);
  const month = parseInt(match[2]!);
  const year = parseInt(match[3]!);
  
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (year < 1900 || year > new Date().getFullYear()) return false;
  
  return true;
}

/**
 * Valida senha forte
 */
export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Senha deve ter pelo menos 8 caracteres');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Senha deve ter pelo menos uma letra maiúscula');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Senha deve ter pelo menos uma letra minúscula');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Senha deve ter pelo menos um número');
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Senha deve ter pelo menos um caractere especial');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
