/**
 * Utilitários de validação de formulários
 */

/**
 * Valida dados básicos de pessoa
 */
export const validatePessoaData = (data: any) => {
  const errors: string[] = [];

  if (!data.nome_completo?.trim()) {
    errors.push("Nome completo é obrigatório");
  }

  if (!data.cpf?.trim() || !/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(data.cpf)) {
    errors.push("CPF inválido");
  }

  if (data.data_nascimento && !isValidDate(data.data_nascimento)) {
    errors.push("Data de nascimento inválida");
  }

  if (data.email && !isValidEmail(data.email)) {
    errors.push("E-mail inválido");
  }

  if (data.telefone && !isValidPhone(data.telefone)) {
    errors.push("Telefone inválido");
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Valida dados de projeto
 */
export const validateProjetoData = (data: any) => {
  const errors: string[] = [];

  if (!data.nome?.trim()) {
    errors.push("Nome do projeto é obrigatório");
  }

  if (!data.data_inicio) {
    errors.push("Data de início é obrigatória");
  }

  if (data.data_fim && new Date(data.data_fim) <= new Date(data.data_inicio)) {
    errors.push("Data fim deve ser posterior à data início");
  }

  if (!data.responsavel_id) {
    errors.push("Responsável é obrigatório");
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Valida dados de oficina
 */
export const validateOficinaData = (data: any) => {
  const errors: string[] = [];

  if (!data.nome?.trim()) {
    errors.push("Nome da oficina é obrigatório");
  }

  if (!data.data_inicio) {
    errors.push("Data de início é obrigatória");
  }

  if (!data.horario_inicio || !data.horario_fim) {
    errors.push("Horários são obrigatórios");
  }

  if (data.vagas_totais && (isNaN(data.vagas_totais) || data.vagas_totais < 1)) {
    errors.push("Número de vagas inválido");
  }

  if (!data.responsavel_id) {
    errors.push("Responsável é obrigatório");
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Funções auxiliares
 */
const isValidDate = (dateString: string) => {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
};

const isValidEmail = (email: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const isValidPhone = (phone: string) => {
  return /^\(\d{2}\) \d{4,5}-\d{4}$/.test(phone);
};
