import { describe, it, expect } from 'vitest';
import { downloadPDF } from './pdfDownload';

describe('pdfDownload', () => {
  it('deve expor downloadPDF como função', () => {
    expect(typeof downloadPDF).toBe('function');
  });
});
