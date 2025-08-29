import { logger } from '../services/logger';

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

    const [datePart] = dateObj.toISOString().split('T');
    return datePart ?? null;
  } catch (error) {
    logger.error('Erro ao formatar data para ISO', { error });
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
    logger.error('Erro ao formatar data para BR', { error });
    return null;
  }
};

/**
 * Formata objetos que contêm datas para o formato ISO
 * @param obj - Objeto com datas
 * @param dateFields - Campos que contêm datas
 * @returns Objeto com datas formatadas
 */
export const formatObjectDates = <T extends Record<string, unknown>>(obj: T, dateFields: (keyof T)[] = []): T => {
  if (!obj || typeof obj !== 'object') return obj;

  const formattedObj = { ...obj } as T;

  (dateFields as string[]).forEach(field => {
    if (formattedObj[field as keyof T]) {
      formattedObj[field as keyof T] = formatDateToISO(
        formattedObj[field as keyof T] as unknown as Date | string | null
      ) as T[keyof T];
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
export const formatArrayDates = <T extends Record<string, unknown>>(array: T[], dateFields: (keyof T)[] = []): T[] => {
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
