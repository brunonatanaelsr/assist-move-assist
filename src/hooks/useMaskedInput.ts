import { useState, useCallback } from 'react';

export function useMaskedInput(type: 'cpf' | 'telefone') {
  const [value, setValue] = useState('');

  const mask = useCallback((value: string) => {
    // Remove todos os caracteres não numéricos
    const numbers = value.replace(/\D/g, '');

    if (type === 'cpf') {
      if (numbers.length <= 11) {
        return numbers.replace(
          /^(\d{0,3})(\d{0,3})(\d{0,3})(\d{0,2})/,
          (_, g1, g2, g3, g4) => {
            let masked = '';
            if (g1) masked += g1;
            if (g2) masked += '.' + g2;
            if (g3) masked += '.' + g3;
            if (g4) masked += '-' + g4;
            return masked;
          }
        );
      }
      return value.slice(0, 14); // 000.000.000-00
    }

    if (type === 'telefone') {
      if (numbers.length <= 11) {
        if (numbers.length <= 10) {
          // Formato (00) 0000-0000
          return numbers.replace(
            /^(\d{0,2})(\d{0,4})(\d{0,4})/,
            (_, g1, g2, g3) => {
              let masked = '';
              if (g1) masked += '(' + g1 + ')';
              if (g2) masked += ' ' + g2;
              if (g3) masked += '-' + g3;
              return masked;
            }
          );
        } else {
          // Formato (00) 00000-0000
          return numbers.replace(
            /^(\d{0,2})(\d{0,5})(\d{0,4})/,
            (_, g1, g2, g3) => {
              let masked = '';
              if (g1) masked += '(' + g1 + ')';
              if (g2) masked += ' ' + g2;
              if (g3) masked += '-' + g3;
              return masked;
            }
          );
        }
      }
      return value.slice(0, 15); // (00) 00000-0000
    }

    return value;
  }, [type]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const maskedValue = mask(e.target.value);
    setValue(maskedValue);
  }, [mask]);

  const unmaskedValue = useCallback(() => {
    return value.replace(/\D/g, '');
  }, [value]);

  return {
    value,
    setValue,
    handleChange,
    unmaskedValue
  };
}
