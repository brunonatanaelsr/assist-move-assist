import PDFDocument from 'pdfkit';
import { ReportTemplate } from '../types/report';

export async function generatePDF(data: any, template: ReportTemplate, options?: any) {
  const doc = new PDFDocument();
  const chunks: Buffer[] = [];

  return new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Cabeçalho
    doc.fontSize(20).text(template.name, { align: 'center' });
    if (template.description) {
      doc.moveDown().fontSize(12).text(template.description);
    }
    doc.moveDown().fontSize(14);

    // Métricas
    if (data.metrics) {
      doc.text('Métricas Principais', { underline: true });
      doc.moveDown();
      Object.entries(data.metrics).forEach(([key, value]: [string, any]) => {
        doc.text(`${key}: ${value}`);
      });
    }

    // Gráficos
    if (data.charts) {
      doc.addPage();
      doc.text('Gráficos', { underline: true });
      doc.moveDown();
      // Aqui você precisaria implementar a lógica para renderizar gráficos no PDF
      // Isso pode envolver converter gráficos em imagens e adicioná-los ao PDF
    }

    // Dados brutos
    if (options?.include_raw_data && data.rawData) {
      doc.addPage();
      doc.text('Dados Brutos', { underline: true });
      doc.moveDown();
      data.rawData.forEach((item: any) => {
        doc.text(JSON.stringify(item, null, 2));
        doc.moveDown();
      });
    }

    doc.end();
  });
}
