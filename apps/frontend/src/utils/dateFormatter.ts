/**
 * Utilitário para formatação de datas no frontend
 * Garante consistência na exibição e conversão de datas
 */

const shortDateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC'
});

const longDateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC'
});

const toUTCDate = (value: string | number | Date): Date | null => {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const normalizeUTCDate = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

/**
 * Formata data ISO para exibição em pt-BR
 * @param isoDate String de data ISO (YYYY-MM-DD)
 * @returns String formatada (DD/MM/YYYY)
 */
export const formatDisplayDate = (isoDate?: string | null): string => {
  if (!isoDate) return '-';

  try {
    const date = toUTCDate(isoDate);
    if (!date) {
      console.warn('Data inválida:', isoDate);
      return '-';
    }

    return shortDateFormatter.format(date);
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
  if (!isoDate) return '-';

  try {
    const date = toUTCDate(isoDate);
    if (!date) {
      console.warn('Data inválida:', isoDate);
      return '-';
    }

    return longDateFormatter.format(date);
  } catch (error) {
    console.error('Erro ao formatar data longa:', error);
    return '-';
  }
};

/**
 * Formata data para DD/MM/YYYY
 */
export function formatDate(date: Date | string | number): string {
  const parsed = toUTCDate(date);
  if (!parsed) {
    return '';
  }

  return shortDateFormatter.format(parsed);
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
    if (isoDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return isoDate;
    }

    const date = toUTCDate(isoDate);
    if (!date) {
      console.warn('Formato de data inválido:', isoDate);
      return '';
    }

    return date.toISOString().slice(0, 10);
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
    const start = toUTCDate(startDate);
    const end = toUTCDate(endDate);

    if (!start || !end) {
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
    const date = toUTCDate(isoDate);
    if (!date) {
      return false;
    }

    const today = new Date();
    const normalizedToday = normalizeUTCDate(today);
    const normalizedDate = normalizeUTCDate(date);

    return normalizedDate < normalizedToday;
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
    const date = toUTCDate(isoDate);
    if (!date) {
      return false;
    }

    const today = new Date();
    const normalizedToday = normalizeUTCDate(today);
    const normalizedDate = normalizeUTCDate(date);

    return normalizedDate > normalizedToday;
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
