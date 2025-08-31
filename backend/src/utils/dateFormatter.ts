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
    let dateObj: Date;

    // Evita problemas de fuso horário para strings no formato YYYY-MM-DD
    if (typeof date === 'string') {
      const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (match) {
        const [, y, m, d] = match;
        // Cria a data em UTC para preservar o dia informado
        dateObj = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
      } else {
        dateObj = new Date(date);
      }
    } else {
      dateObj = new Date(date);
    }

    if (isNaN(dateObj.getTime())) return null;
    // Usa timezone UTC para garantir consistência independente do ambiente
    return dateObj.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
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

  const formattedObj: Record<string, unknown> = { ...(obj as Record<string, unknown>) };

  (dateFields as (keyof T)[]).forEach((field) => {
    const key = String(field);
    if (key in formattedObj) {
      const value = formattedObj[key];
      formattedObj[key] = formatDateToISO(value as Date | string | null);
    }
  });

  return formattedObj as T;
};

/**
 * Formata array de objetos com datas
 * @param array - Array de objetos
 * @param dateFields - Campos que contêm datas
 * @returns Array com datas formatadas
 */
export const formatArrayDates = <T extends Record<string, unknown>>(array: T[], dateFields: (keyof T)[] = []): T[] => {
  if (!Array.isArray(array)) return array;
  return array.map((obj) => formatObjectDates(obj, dateFields));
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
