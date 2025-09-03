/**
 * Utilitário para download de PDFs
 * Garante compatibilidade entre diferentes browsers
 */

export interface DownloadPdfOptions {
  endpoint: string;
  filename: string;
  token?: string;
}

/**
 * Faz download de PDF via API
 * @param options Configurações do download
 * @returns Promise<boolean> - true se download foi bem sucedido
 */
export async function downloadPdf(options: DownloadPdfOptions): Promise<boolean> {
  const { endpoint, filename, token } = options;
  
  try {
    console.log(`Iniciando download de PDF: ${endpoint}`);
    
    // Headers da requisição
    const headers: HeadersInit = {
      'Accept': 'application/pdf, text/plain, */*'
    };
    
    // Adicionar token se fornecido
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Fazer requisição para o PDF
    const response = await fetch(endpoint, {
      method: 'GET',
      headers
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
      const fallbackUrl = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
      window.open(fallbackUrl, '_blank');
      return true;
    } catch (fallbackError) {
      console.error('Fallback também falhou:', fallbackError);
      return false;
    }
  }
}

/**
 * Download de declaração por ID
 */
export async function downloadDeclaracao(id: number, token?: string): Promise<boolean> {
  return downloadPdf({
    endpoint: `/api/declaracoes/${id}/pdf`,
    filename: `declaracao_${id}.pdf`,
    token
  });
}

/**
 * Download de recibo por ID
 */
export async function downloadRecibo(id: number, token?: string): Promise<boolean> {
  return downloadPdf({
    endpoint: `/api/recibos/${id}/pdf`,
    filename: `recibo_${id}.pdf`,
    token
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
export async function printPdf(endpoint: string, token?: string): Promise<boolean> {
  try {
    // Headers da requisição
    const headers: HeadersInit = {
      'Accept': 'application/pdf, text/plain, */*'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(endpoint, { headers });
    
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
