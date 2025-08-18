/**
 * Utilitário para padronizar respostas da API
 * Garante que todas as respostas sigam o mesmo formato
 */

/**
 * Padroniza respostas da API
 * @param {Object} options - Opções da resposta
 * @param {any} options.data - Dados principais da resposta
 * @param {boolean} options.success - Status da operação (padrão: true)
 * @param {string} options.message - Mensagem opcional
 * @param {number} options.total - Total para paginação
 * @param {Object} options.pagination - Informações de paginação
 * @returns {Object} Resposta padronizada
 */
const formatResponse = ({ 
  data = null, 
  success = true, 
  message = '', 
  total = null,
  pagination = null
}) => {
  const response = { success };
  
  if (data !== null) response.data = data;
  if (message) response.message = message;
  if (total !== null) response.total = total;
  if (pagination) response.pagination = pagination;
  
  return response;
};

/**
 * Formata resposta de sucesso com dados
 * @param {any} data - Dados a serem retornados
 * @param {string} message - Mensagem opcional
 * @param {Object} meta - Metadados adicionais (total, pagination)
 * @returns {Object} Resposta formatada
 */
const successResponse = (data, message = '', meta = {}) => {
  return formatResponse({
    data,
    success: true,
    message,
    ...meta
  });
};

/**
 * Formata resposta de erro
 * @param {string} message - Mensagem de erro
 * @param {any} data - Dados adicionais (opcional)
 * @returns {Object} Resposta de erro formatada
 */
const errorResponse = (message, data = null) => {
  return formatResponse({
    success: false,
    message,
    data
  });
};

module.exports = { 
  formatResponse, 
  successResponse, 
  errorResponse 
};
