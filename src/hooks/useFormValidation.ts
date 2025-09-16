import { useState, useCallback } from 'react';
import { DocumentValidator } from '@/lib/validators';
import { logger } from '@/lib/logger';

interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
}

interface ValidationRules {
  [fieldName: string]: ValidationRule;
}

interface ValidationErrors {
  [fieldName: string]: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationErrors;
}

interface UseFormValidationReturn {
  errors: ValidationErrors;
  isValid: boolean;
  validateField: (fieldName: string, value: any) => string | null;
  validateForm: (formData: Record<string, any>) => ValidationResult;
  clearErrors: () => void;
  clearFieldError: (fieldName: string) => void;
}

export const useFormValidation = (rules: ValidationRules): UseFormValidationReturn => {
  const [errors, setErrors] = useState<ValidationErrors>({});

  const validateField = useCallback((fieldName: string, value: any): string | null => {
    const rule = rules[fieldName];
    if (!rule) return null;

    // Verificação de campo obrigatório
    if (rule.required && (!value || value.toString().trim() === '')) {
      return 'Este campo é obrigatório';
    }

    // Se campo não é obrigatório e está vazio, não validar outras regras
    if (!rule.required && (!value || value.toString().trim() === '')) {
      return null;
    }

    const stringValue = value.toString();

    // Verificação de comprimento mínimo
    if (rule.minLength && stringValue.length < rule.minLength) {
      return `Deve ter pelo menos ${rule.minLength} caracteres`;
    }

    // Verificação de comprimento máximo
    if (rule.maxLength && stringValue.length > rule.maxLength) {
      return `Deve ter no máximo ${rule.maxLength} caracteres`;
    }

    // Verificação de padrão (regex)
    if (rule.pattern && !rule.pattern.test(stringValue)) {
      return 'Formato inválido';
    }

    // Validação customizada
    if (rule.custom) {
      const customError = rule.custom(value);
      if (customError) return customError;
    }

    return null;
  }, [rules]);

  const validateForm = useCallback((formData: Record<string, any>): ValidationResult => {
    const newErrors: ValidationErrors = {};
    let hasErrors = false;

    // Validar todos os campos definidos nas regras
    Object.keys(rules).forEach(fieldName => {
      const error = validateField(fieldName, formData[fieldName]);
      if (error) {
        newErrors[fieldName] = error;
        hasErrors = true;
      }
    });

    setErrors(newErrors);

    if (hasErrors) {
      logger.info('Validação de formulário falhou', { 
        page: window.location.pathname,
        action: 'form_validation_failed'
      });
    }

    return { isValid: !hasErrors, errors: newErrors };
  }, [validateField, rules]);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const clearFieldError = useCallback((fieldName: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }, []);

  return {
    errors,
    isValid: Object.keys(errors).length === 0,
    validateField,
    validateForm,
    clearErrors,
    clearFieldError,
  };
}

// Regras de validação predefinidas para documentos brasileiros
export const createDocumentValidationRules = () => ({
  cpf: {
    required: true,
    custom: (value: string) => {
      const result = DocumentValidator.validateCPF(value);
      return result.isValid ? null : result.error!;
    }
  },
  email: {
    required: true,
    custom: (value: string) => {
      const result = DocumentValidator.validateEmail(value);
      return result.isValid ? null : result.error!;
    }
  },
  telefone: {
    custom: (value: string) => {
      if (!value) return null; // Campo opcional
      const result = DocumentValidator.validatePhone(value);
      return result.isValid ? null : result.error!;
    }
  },
  cep: {
    custom: (value: string) => {
      if (!value) return null; // Campo opcional
      const result = DocumentValidator.validateCEP(value);
      return result.isValid ? null : result.error!;
    }
  }
});

// Hook específico para validação de beneficiárias
export const useBeneficiariaValidation = () => {
  const baseRules = createDocumentValidationRules();

  const rules: ValidationRules = {
    cpf: baseRules.cpf,
    telefone: baseRules.telefone,
    cep: baseRules.cep,
    nome_completo: {
      required: true,
      minLength: 3,
      maxLength: 255,
      pattern: /^[a-zA-ZÀ-ÿ\s]+$/,
    },
    data_nascimento: {
      required: true,
      custom: (value: string) => {
        if (!value) return 'Data de nascimento é obrigatória';
        
        const birthDate = new Date(value);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        
        if (age < 0 || age > 150) {
          return 'Data de nascimento inválida';
        }
        
        return null;
      }
    },
    endereco: {
      maxLength: 500
    },
    rg: {
      minLength: 7,
      maxLength: 20
    }
  };

  return useFormValidation(rules);
};

export default useFormValidation;
