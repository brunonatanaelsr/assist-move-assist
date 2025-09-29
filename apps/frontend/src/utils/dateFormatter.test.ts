import { describe, it, expect } from 'vitest';
import { formatDate, formatDisplayDate, formatInputDate } from './dateFormatter';

describe('dateFormatter', () => {
  it('deve formatar data para dd/MM/yyyy', () => {
    expect(formatDate(new Date('2023-01-01'))).toBe('01/01/2023');
  });

  it('mantém consistência entre formatDisplayDate e formatDate em fusos diferentes', () => {
    const isoDate = '2023-08-15';
    expect(formatDisplayDate(isoDate)).toBe(formatDate(new Date(`${isoDate}T12:00:00+09:00`)));
  });

  it('normaliza entradas com horário ao formatar para input', () => {
    expect(formatInputDate('2023-08-15T12:30:00Z')).toBe('2023-08-15');
  });
});
