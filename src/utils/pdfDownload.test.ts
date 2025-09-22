import { describe, it, expect, vi, afterEach } from 'vitest';
import { downloadPDF } from './pdfDownload';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('pdfDownload', () => {
  it('deve suportar assinatura antiga (endpoint, filename, token)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'Content-Type': 'application/pdf' }),
      blob: () => Promise.resolve(new Blob(['teste'], { type: 'application/pdf' }))
    } as Response);
    vi.stubGlobal('fetch', fetchMock);

    if (!('createObjectURL' in URL)) {
      Object.defineProperty(URL, 'createObjectURL', {
        value: vi.fn(),
        writable: true
      });
    }

    if (!('revokeObjectURL' in URL)) {
      Object.defineProperty(URL, 'revokeObjectURL', {
        value: vi.fn(),
        writable: true
      });
    }

    const createUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:teste');
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const appendSpy = vi.spyOn(document.body, 'appendChild');
    const removeSpy = vi.spyOn(document.body, 'removeChild');
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const result = await downloadPDF('/api/teste.pdf', 'arquivo.pdf', 'token');

    expect(result).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith('/api/teste.pdf', expect.objectContaining({ method: 'GET' }));
    expect(createUrlSpy).toHaveBeenCalledOnce();
    expect(revokeSpy).toHaveBeenCalledWith('blob:teste');
    expect(appendSpy).toHaveBeenCalledTimes(1);
    expect(removeSpy).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });
});
