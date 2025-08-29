export function validate_cpf(cpf: string): boolean {
  if (!cpf) return false;
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false; // todos iguais

  const calcCheckDigit = (base: string, factor: number) => {
    let sum = 0;
    for (let i = 0; i < base.length; i++) {
      sum += parseInt(base.charAt(i), 10) * (factor - i);
    }
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };

  const baseNine = digits.substring(0, 9);
  const d1 = calcCheckDigit(baseNine, 10);
  const d2 = calcCheckDigit(baseNine + d1, 11);

  return digits.endsWith(`${d1}${d2}`);
}

export default validate_cpf;
