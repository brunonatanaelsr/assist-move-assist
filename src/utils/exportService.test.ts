import { describe, it, expect } from 'vitest';
import { exportCSV } from './exportService';

describe('exportService', () => {
  it('deve exportar CSV sem erro', () => {
    expect(() => exportCSV([{ a: 1, b: 2 }], 'arquivo.csv')).not.toThrow();
  });
});
