import { describe, it, expect } from 'vitest';
import { downloadPDF } from './pdfDownload';

describe('pdfDownload', () => {
  it('deve chamar downloadPDF sem erro', () => {
    expect(() => downloadPDF('url', 'arquivo.pdf')).not.toThrow();
  });
});
