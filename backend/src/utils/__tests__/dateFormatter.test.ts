import { formatDateToISO, formatDateToBR } from '../dateFormatter';

describe('dateFormatter utilities', () => {
  it('formats date to ISO', () => {
    expect(formatDateToISO('2024-01-15')).toBe('2024-01-15');
  });

  it('formats date to BR', () => {
    expect(formatDateToBR('2024-01-15')).toBe('15/01/2024');
  });
});
