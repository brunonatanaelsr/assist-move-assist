import { API_URL } from '@/config';

/**
 * Utilitário para download de PDFs
 * Garante compatibilidade entre diferentes browsers
 */

export interface DownloadPdfOptions {
  endpoint: string;
  filename: string;
}

function resolveApiUrl(endpoint: string): string {
  try {
    const isAbsoluteUrl = /^https?:\/\//i.test(API_URL);
    const baseUrl = isAbsoluteUrl ? API_URL : new URL(API_URL, window.location.origin).toString();
    return new URL(endpoint, baseUrl).toString();
  } catch (error) {
    console.error('Erro ao montar URL de download de PDF:', error);
    return endpoint;
  }
}

/**
 * Faz download de PDF via API
 * @param options Configurações do download
 * @returns Promise<boolean> - true se download foi bem sucedido
 */
export async function downloadPdf(options: DownloadPdfOptions): Promise<boolean> {
  const { endpoint, filename } = options;
  const requestUrl = resolveApiUrl(endpoint);

  try {
    console.log(`Iniciando download de PDF: ${requestUrl}`);

    // Headers da requisição
    const headers: HeadersInit = {
      'Accept': 'application/pdf, text/plain, */*'
    };

    // Fazer requisição para o PDF
    const response = await fetch(requestUrl, {
      method: 'GET',
      headers,
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
    }
    
    // Verificar se é realmente um PDF
    const contentType = response.headers.get('Content-Type');
    console.log(`Content-Type recebido: ${contentType}`);
    
    // Converter response para blob
    const blob = await response.blob();
    console.log(`Blob criado com tamanho: ${blob.size} bytes`);
    
    if (blob.size === 0) {
      throw new Error('PDF vazio recebido');
    }
    
    // Criar URL temporária para o blob
    const url = URL.createObjectURL(blob);
    
    // Criar elemento de link para download
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    // Adicionar ao DOM, clicar e remover
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Limpar URL temporária
    URL.revokeObjectURL(url);
    
    console.log(`Download concluído: ${filename}`);
    return true;
    
  } catch (error) {
    console.error('Erro no download do PDF:', error);

    // Fallback: tentar abrir em nova aba
    try {
      console.log('Tentando fallback: abrir em nova aba');
      window.open(requestUrl, '_blank');
      return true;
    } catch (fallbackError) {
      console.error('Fallback também falhou:', fallbackError);
      return false;
    }
  }
}

export { downloadPdf as downloadPDF };
export default downloadPdf;

/**
 * Download de declaração por ID
 */
export async function downloadDeclaracao(id: number): Promise<boolean> {
  return downloadPdf({
    endpoint: `/api/declaracoes/${id}/pdf`,
    filename: `declaracao_${id}.pdf`
  });
}

/**
 * Download de recibo por ID
 */
export async function downloadRecibo(id: number): Promise<boolean> {
  return downloadPdf({
    endpoint: `/api/recibos/${id}/pdf`,
    filename: `recibo_${id}.pdf`
  });
}

/**
 * Verificar se o browser suporta download de arquivos
 */
export function supportsDownload(): boolean {
  const a = document.createElement('a');
  return typeof a.download !== 'undefined';
}

/**
 * Imprimir PDF diretamente (abre em nova aba com foco na impressão)
 */
export async function printPdf(endpoint: string): Promise<boolean> {
  const requestUrl = resolveApiUrl(endpoint);

  try {
    // Headers da requisição
    const headers: HeadersInit = {
      'Accept': 'application/pdf, text/plain, */*'
    };

    const response = await fetch(requestUrl, {
      headers,
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }
    
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    
    // Abrir em nova janela/aba para impressão
    const printWindow = window.open(url, '_blank');
    
    if (printWindow) {
      // Aguardar carregamento e focar na impressão
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          URL.revokeObjectURL(url);
        }, 500);
      };
      return true;
    } else {
      URL.revokeObjectURL(url);
      return false;
    }
    
  } catch (error) {
    console.error('Erro ao imprimir PDF:', error);
    return false;
  }
}
