import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface DeclaracaoData {
  tipo: string;
  beneficiaria_nome: string;
  cpf: string;
  atividades_participadas: string;
  data_inicio: string;
  data_fim?: string;
  carga_horaria?: number;
  frequencia_percentual?: number;
  finalidade: string;
  responsavel_emissao: string;
  data_emissao: string;
  observacoes?: string;
}

export interface ReciboData {
  tipo: string;
  beneficiaria_nome: string;
  cpf: string;
  descricao: string;
  valor: string;
  data_recebimento: string;
  periodo_referencia: string;
  responsavel_entrega: string;
  observacoes?: string;
}

/**
 * Gera PDF de declaração usando pdf-lib
 */
export async function gerarPDFDeclaracao(data: DeclaracaoData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
  
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const { width, height } = page.getSize();
  const margin = 50;
  const lineHeight = 20;
  let currentY = height - margin;

  // Função para adicionar texto
  const addText = (text: string, options: {
    font?: any,
    size?: number,
    color?: any,
    maxWidth?: number,
    align?: 'left' | 'center' | 'right'
  } = {}) => {
    const {
      font: textFont = font,
      size = 12,
      color = rgb(0, 0, 0),
      maxWidth = width - 2 * margin,
      align = 'left'
    } = options;

    const lines = splitTextToFit(text, textFont, size, maxWidth);
    
    lines.forEach(line => {
      let x = margin;
      if (align === 'center') {
        const textWidth = textFont.widthOfTextAtSize(line, size);
        x = (width - textWidth) / 2;
      } else if (align === 'right') {
        const textWidth = textFont.widthOfTextAtSize(line, size);
        x = width - margin - textWidth;
      }

      page.drawText(line, {
        x,
        y: currentY,
        size,
        font: textFont,
        color,
      });
      currentY -= lineHeight;
    });
  };

  // Função para quebrar texto em linhas que cabem na largura
  const splitTextToFit = (text: string, font: any, size: number, maxWidth: number): string[] => {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    words.forEach(word => {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const testWidth = font.widthOfTextAtSize(testLine, size);
      
      if (testWidth <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    });

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  };

  // Cabeçalho
  addText('INSTITUTO MOVE MARIAS', { 
    font: boldFont, 
    size: 18, 
    align: 'center' 
  });
  
  currentY -= 10;
  addText('CNPJ: 00.000.000/0001-00', { 
    size: 10, 
    align: 'center' 
  });
  
  currentY -= 30;

  // Título
  const tipoFormatado = data.tipo.toUpperCase().replace('_', ' ');
  addText(`DECLARAÇÃO DE ${tipoFormatado}`, { 
    font: boldFont, 
    size: 16, 
    align: 'center' 
  });
  
  currentY -= 40;

  // Conteúdo
  addText(`Declaramos para os devidos fins que ${data.beneficiaria_nome}, portador(a) do CPF ${data.cpf}, participou das seguintes atividades em nossa instituição:`);
  
  currentY -= 10;
  addText(data.atividades_participadas, { size: 11 });
  
  if (data.data_fim) {
    currentY -= 10;
    addText(`Período: ${formatarData(data.data_inicio)} até ${formatarData(data.data_fim)}`);
  } else {
    currentY -= 10;
    addText(`Data: ${formatarData(data.data_inicio)}`);
  }

  if (data.carga_horaria) {
    currentY -= 5;
    addText(`Carga Horária: ${data.carga_horaria} horas`);
  }

  if (data.frequencia_percentual) {
    currentY -= 5;
    addText(`Frequência: ${data.frequencia_percentual}%`);
  }

  currentY -= 20;
  addText(`Finalidade: ${data.finalidade}`);

  if (data.observacoes) {
    currentY -= 15;
    addText('Observações:', { font: boldFont });
    currentY -= 5;
    addText(data.observacoes, { size: 11 });
  }

  currentY -= 30;
  addText('Esta declaração é expedida a pedido do interessado para que possa fazer prova onde for necessário.');

  // Rodapé
  currentY = 150; // Posição fixa para assinatura
  addText('_'.repeat(50), { align: 'center' });
  currentY -= 5;
  addText(data.responsavel_emissao, { align: 'center', font: boldFont });
  currentY -= 5;
  addText('Instituto Move Marias', { align: 'center', size: 10 });
  
  currentY -= 30;
  addText(`São Paulo, ${formatarData(data.data_emissao)}`, { align: 'right', size: 10 });

  return await pdfDoc.save();
}

/**
 * Gera PDF de recibo usando pdf-lib
 */
export async function gerarPDFRecibo(data: ReciboData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
  
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const { width, height } = page.getSize();
  const margin = 50;
  const lineHeight = 20;
  let currentY = height - margin;

  // Função para adicionar texto (igual à da declaração)
  const addText = (text: string, options: any = {}) => {
    const {
      font: textFont = font,
      size = 12,
      color = rgb(0, 0, 0),
      align = 'left'
    } = options;

    let x = margin;
    if (align === 'center') {
      const textWidth = textFont.widthOfTextAtSize(text, size);
      x = (width - textWidth) / 2;
    } else if (align === 'right') {
      const textWidth = textFont.widthOfTextAtSize(text, size);
      x = width - margin - textWidth;
    }

    page.drawText(text, {
      x,
      y: currentY,
      size,
      font: textFont,
      color,
    });
    currentY -= lineHeight;
  };

  // Cabeçalho
  addText('INSTITUTO MOVE MARIAS', { 
    font: boldFont, 
    size: 18, 
    align: 'center' 
  });
  
  currentY -= 10;
  addText('CNPJ: 00.000.000/0001-00', { 
    size: 10, 
    align: 'center' 
  });
  
  currentY -= 30;

  // Título
  const tipoFormatado = data.tipo.toUpperCase().replace('_', ' ');
  addText(`RECIBO DE ${tipoFormatado}`, { 
    font: boldFont, 
    size: 16, 
    align: 'center' 
  });
  
  currentY -= 40;

  // Valor em destaque
  const valorFormatado = parseFloat(data.valor).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
  
  addText(`Valor: ${valorFormatado}`, { 
    font: boldFont, 
    size: 14, 
    align: 'center' 
  });
  
  currentY -= 30;

  // Conteúdo
  addText(`Eu, ${data.beneficiaria_nome}, portador(a) do CPF ${data.cpf}, DECLARO ter recebido do Instituto Move Marias o seguinte benefício:`);
  
  currentY -= 15;
  addText(`Descrição: ${data.descricao}`, { font: boldFont });
  
  currentY -= 10;
  addText(`Valor: ${valorFormatado}`);
  
  currentY -= 10;
  addText(`Data do Recebimento: ${formatarData(data.data_recebimento)}`);
  
  currentY -= 10;
  addText(`Período de Referência: ${data.periodo_referencia}`);

  if (data.observacoes) {
    currentY -= 15;
    addText('Observações:', { font: boldFont });
    currentY -= 5;
    addText(data.observacoes, { size: 11 });
  }

  currentY -= 30;
  addText('Por ser expressão da verdade, firmo o presente recibo.');

  // Assinaturas
  currentY = 200; // Posição fixa para assinaturas
  
  // Assinatura do beneficiário
  addText('_'.repeat(40), { align: 'left' });
  currentY -= 5;
  addText(data.beneficiaria_nome, { align: 'left', font: boldFont });
  currentY -= 5;
  addText(`CPF: ${data.cpf}`, { align: 'left', size: 10 });
  
  // Assinatura do responsável
  currentY += 35; // Voltar para linha das assinaturas
  addText('_'.repeat(40), { align: 'right' });
  currentY -= 5;
  addText(data.responsavel_entrega, { align: 'right', font: boldFont });
  currentY -= 5;
  addText('Instituto Move Marias', { align: 'right', size: 10 });
  
  currentY -= 30;
  addText(`São Paulo, ${formatarData(data.data_recebimento)}`, { align: 'center', size: 10 });

  return await pdfDoc.save();
}

/**
 * Formatar data para exibição
 */
function formatarData(dataStr: string): string {
  const data = new Date(dataStr);
  return data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
}
