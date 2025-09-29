/**
 * Utilitário para formatação de datas no frontend
 * Garante consistência na exibição e conversão de datas
 */

/**
 * Formata data ISO para exibição em pt-BR
 * @param isoDate String de data ISO (YYYY-MM-DD)
 * @returns String formatada (DD/MM/YYYY)
 */
const UTC_SHORT_DATE_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'UTC',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
});

const UTC_LONG_DATE_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'long',
  year: 'numeric'
});

const parseDate = (value?: string | Date | null): Date | null => {
  if (!value) return null;

  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
};

export const formatDisplayDate = (isoDate?: string | null): string => {
  const date = parseDate(isoDate);
  if (!date) {
    if (isoDate) console.warn('Data inválida:', isoDate);
    return '-';
  }

  try {
    return UTC_SHORT_DATE_FORMATTER.format(date);
  } catch (error) {
    console.error('Erro ao formatar data:', error);
    return '-';
  }
};

/**
 * Formata data ISO para exibição em formato longo
 * @param isoDate String de data ISO (YYYY-MM-DD)
 * @returns String formatada (Ex: "15 de agosto de 2023")
 */
export const formatLongDate = (isoDate?: string | null): string => {
  const date = parseDate(isoDate);
  if (!date) {
    return '-';
  }

  try {
    return UTC_LONG_DATE_FORMATTER.format(date);
  } catch (error) {
    console.error('Erro ao formatar data longa:', error);
    return '-';
  }
};

/**
 * Formata data para DD/MM/YYYY
 */
export function formatDate(date: Date): string {
  const parsed = parseDate(date);
  if (!parsed) {
    return '';
  }

  try {
    return UTC_SHORT_DATE_FORMATTER.format(parsed);
  } catch (error) {
    console.error('Erro ao formatar data curta:', error);
    return '';
  }
}

/**
 * Converte data local (DD/MM/YYYY) para ISO (YYYY-MM-DD)
 * @param localDate String de data local
 * @returns String ISO
 */
export const formatISODate = (localDate: string): string => {
  if (!localDate) return '';
  
  // Se já está no formato ISO
  if (localDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return localDate;
  }
  
  // Assume formato DD/MM/YYYY
  const parts = localDate.split('/');
  if (parts.length !== 3) {
    console.warn('Formato de data inválido:', localDate);
    return '';
  }
  
  const [day, month, year] = parts;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

/**
 * Converte input date (YYYY-MM-DD) para exibição em input
 * @param isoDate String de data ISO
 * @returns String formatada para input (YYYY-MM-DD)
 */
export const formatInputDate = (isoDate?: string | null): string => {
  if (!isoDate) return '';
  
  try {
    // Se já está no formato correto
    if (isoDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return isoDate;
    }
    
    const date = new Date(isoDate);
    
    if (isNaN(date.getTime())) {
      return '';
    }
    
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Erro ao formatar data para input:', error);
    return '';
  }
};

/**
 * Calcula a diferença em dias entre duas datas
 * @param startDate Data inicial
 * @param endDate Data final
 * @returns Número de dias de diferença
 */
export const calculateDaysDifference = (startDate: string, endDate: string): number => {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return 0;
    }
    
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  } catch (error) {
    console.error('Erro ao calcular diferença de dias:', error);
    return 0;
  }
};

/**
 * Verifica se uma data está no passado
 * @param isoDate String de data ISO
 * @returns boolean
 */
export const isPastDate = (isoDate: string): boolean => {
  try {
    const date = new Date(isoDate);
    const today = new Date();
    
    // Zerar horas para comparar apenas as datas
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    
    return date < today;
  } catch (error) {
    return false;
  }
};

/**
 * Verifica se uma data está no futuro
 * @param isoDate String de data ISO
 * @returns boolean
 */
export const isFutureDate = (isoDate: string): boolean => {
  try {
    const date = new Date(isoDate);
    const today = new Date();
    
    // Zerar horas para comparar apenas as datas
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    
    return date > today;
  } catch (error) {
    return false;
  }
};

/**
 * Formata range de datas
 * @param startDate Data inicial
 * @param endDate Data final (opcional)
 * @returns String formatada
 */
export const formatDateRange = (startDate: string, endDate?: string | null): string => {
  const start = formatDisplayDate(startDate);
  
  if (!endDate) {
    return `${start} (sem data de término)`;
  }
  
  const end = formatDisplayDate(endDate);
  
  if (start === end) {
    return start;
  }
  
  return `${start} até ${end}`;
};
