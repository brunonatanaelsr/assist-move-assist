import PDFDocument = require('pdfkit');

export interface ExportOptions {
  titulo?: string;
  subtitulo?: string;
}

export const renderFormPdf = (form: any, options: ExportOptions = {}): Promise<Buffer> => {
  return new Promise((resolve) => {
    const doc = new (PDFDocument as any)({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    const title = options.titulo || 'Formulário';
    const subtitle = options.subtitulo || (form?.tipo ? `Tipo: ${form.tipo}` : '');

    doc.fontSize(18).text(title, { underline: true });
    if (subtitle) {
      doc.moveDown(0.5);
      doc.fontSize(12).text(subtitle);
    }
    doc.moveDown();

    doc.fontSize(10);
    const meta: Record<string, any> = {
      ID: form?.id,
      Beneficiaria: form?.beneficiaria_id,
      CriadoEm: form?.created_at || form?.data_criacao || form?.createdAt,
      CriadoPor: form?.created_by || form?.usuario_id || form?.autor_id,
      Tipo: form?.tipo || 'N/A',
    };
    Object.entries(meta).forEach(([k, v]) => {
      if (v !== undefined && v !== null) doc.text(`${k}: ${v}`);
    });

    doc.moveDown();
    doc.fontSize(12).text('Conteúdo', { underline: true });
    doc.moveDown(0.5);

    const dados = form?.dados || form || {};
    const pretty = typeof dados === 'string' ? dados : JSON.stringify(dados, null, 2);
    doc.font('Courier').fontSize(9).text(pretty, { width: 500 });

    doc.end();
  });
};

