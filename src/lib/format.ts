export const onlyDigits = (s: string) => (s || '').replace(/\D/g, '');

export const normalizeCpf = (cpf: string) => onlyDigits(cpf).slice(0, 11);
export const normalizePhone = (phone: string) => onlyDigits(phone).slice(0, 11);

export const formatCpf = (cpf: string) => {
  const n = normalizeCpf(cpf);
  return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

export const formatPhone = (phone: string) => {
  const n = onlyDigits(phone);
  if (n.length <= 10) {
    return n.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
  }
  return n.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
};

