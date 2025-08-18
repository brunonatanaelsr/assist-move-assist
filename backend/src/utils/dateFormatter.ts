/**
 * Formata uma data para o formato ISO (YYYY-MM-DD)
 * @param date - Data para formatar
 * @returns Data formatada ou null
 */
export const formatDateToISO = (date: Date | string | null): string | null => {
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
 * @param date - Data para formatar
 * @returns Data formatada ou null
 */
export const formatDateToBR = (date: Date | string | null): string | null => {
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
 * @param obj - Objeto com datas
 * @param dateFields - Campos que contêm datas
 * @returns Objeto com datas formatadas
 */
export const formatObjectDates = (obj: Record<string, any>, dateFields: string[] = []): Record<string, any> => {
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
 * @param array - Array de objetos
 * @param dateFields - Campos que contêm datas
 * @returns Array com datas formatadas
 */
export const formatArrayDates = (array: Record<string, any>[], dateFields: string[] = []): Record<string, any>[] => {
  if (!Array.isArray(array)) return array;
  
  return array.map(obj => formatObjectDates(obj, dateFields));
};

/**
 * Converte data do formato brasileiro para ISO
 * @param brDate - Data no formato DD/MM/YYYY
 * @returns Data no formato ISO
 */
export const convertBRToISO = (brDate: string): string | null => {
  if (!brDate || typeof brDate !== 'string') return null;
  
  const parts = brDate.split('/');
  if (parts.length !== 3) return null;
  
  const [day, month, year] = parts;
  if (!day || !month || !year) return null;
  
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};
