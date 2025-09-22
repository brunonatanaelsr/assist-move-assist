/**
 * Utilitário para tratamento e formatação de datas
 * Garante consistência entre PostgreSQL e frontend
 */

/**
 * Formata uma data para o formato ISO (YYYY-MM-DD)
 * @param {Date|string|null} date - Data para formatar
 * @returns {string|null} Data formatada ou null
 */
const formatDateToISO = (date) => {
  if (!date) return null;
  
  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return null;
    
    return dateObj.toISOString().split('T')[0];
  } catch (error) {
    console.error('Erro ao formatar data para ISO:', error);
    return null;
  }
};

/**
 * Formata uma data para o formato brasileiro (DD/MM/YYYY)
 * @param {Date|string|null} date - Data para formatar
 * @returns {string|null} Data formatada ou null
 */
const formatDateToBR = (date) => {
  if (!date) return null;
  
  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return null;
    
    return dateObj.toLocaleDateString('pt-BR');
  } catch (error) {
    console.error('Erro ao formatar data para BR:', error);
    return null;
  }
};

/**
 * Formata objetos que contêm datas para o formato ISO
 * @param {Object} obj - Objeto com datas
 * @param {string[]} dateFields - Campos que contêm datas
 * @returns {Object} Objeto com datas formatadas
 */
const formatObjectDates = (obj, dateFields = []) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const formattedObj = { ...obj };
  
  dateFields.forEach(field => {
    if (formattedObj[field]) {
      formattedObj[field] = formatDateToISO(formattedObj[field]);
    }
  });
  
  return formattedObj;
};

/**
 * Formata array de objetos com datas
 * @param {Array} array - Array de objetos
 * @param {string[]} dateFields - Campos que contêm datas
 * @returns {Array} Array com datas formatadas
 */
const formatArrayDates = (array, dateFields = []) => {
  if (!Array.isArray(array)) return array;
  
  return array.map(obj => formatObjectDates(obj, dateFields));
};

/**
 * Converte data do formato brasileiro para ISO
 * @param {string} brDate - Data no formato DD/MM/YYYY
 * @returns {string|null} Data no formato ISO
 */
const convertBRToISO = (brDate) => {
  if (!brDate || typeof brDate !== 'string') return null;
  
  const parts = brDate.split('/');
  if (parts.length !== 3) return null;
  
  const [day, month, year] = parts;
  if (!day || !month || !year) return null;
  
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

module.exports = { 
  formatDateToISO, 
  formatDateToBR,
  formatObjectDates, 
  formatArrayDates,
  convertBRToISO
};
