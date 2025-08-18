/**
 * Utilitários para validações
 */

/**
 * Valida período de datas e horários
 * @param {Object} params Parâmetros de validação
 * @returns {Object} Objeto com resultado da validação
 */
function validarPeriodo({ dataInicio, dataFim, horarioInicio, horarioFim }) {
  const errors = [];

  // Converter datas para objetos Date
  const dtInicio = new Date(dataInicio);
  const dtFim = dataFim ? new Date(dataFim) : null;

  // Validar formato das datas
  if (isNaN(dtInicio.getTime())) {
    errors.push("Data de início inválida");
  }

  if (dataFim && isNaN(dtFim.getTime())) {
    errors.push("Data de fim inválida");
  }

  // Validar que data fim é depois da data início
  if (dtFim && dtInicio > dtFim) {
    errors.push("Data de fim deve ser posterior à data de início");
  }

  // Validar formato dos horários (HH:MM)
  const horarioRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  
  if (!horarioRegex.test(horarioInicio)) {
    errors.push("Horário de início inválido");
  }

  if (!horarioRegex.test(horarioFim)) {
    errors.push("Horário de fim inválido");
  }

  // Validar que horário fim é depois do horário início
  if (horarioInicio && horarioFim) {
    const [horaInicio, minInicio] = horarioInicio.split(':').map(Number);
    const [horaFim, minFim] = horarioFim.split(':').map(Number);
    
    if (horaInicio > horaFim || (horaInicio === horaFim && minInicio >= minFim)) {
      errors.push("Horário de fim deve ser posterior ao horário de início");
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

module.exports = {
  validarPeriodo
};
