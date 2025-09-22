import PDFDocument = require('pdfkit');

export interface ExportOptions {
  titulo?: string;
  subtitulo?: string;
}

const kv = (doc: any, label: string, value: any) => {
  if (value === undefined || value === null || value === '') return;
  if (Array.isArray(value)) value = value.join(', ');
  doc.font('Helvetica-Bold').text(`${label}: `, { continued: true });
  doc.font('Helvetica').text(String(value));
};

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

export const renderAnamnesePdf = (form: any): Promise<Buffer> => {
  return new Promise((resolve) => {
    const doc = new (PDFDocument as any)({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    const d = form?.dados || {};
    doc.fontSize(18).text('Anamnese Social', { underline: true });
    doc.moveDown();
    kv(doc, 'Beneficiária', form?.beneficiaria_id);
    kv(doc, 'Data', form?.created_at);
    doc.moveDown();

    doc.fontSize(12).text('Composição Familiar e Habitação', { underline: true });
    doc.moveDown(0.5);
    kv(doc, 'Composição Familiar', d.composicao_familiar);
    kv(doc, 'Tipo Moradia', d.tipo_moradia);
    kv(doc, 'Situação Habitacional', d.situacao_habitacional);
    kv(doc, 'Condições da Moradia', d.condicoes_moradia);
    doc.moveDown();

    doc.fontSize(12).text('Situação Socioeconômica', { underline: true });
    doc.moveDown(0.5);
    kv(doc, 'Renda Familiar', d.renda_familiar_total);
    kv(doc, 'Fonte de Renda', d.fonte_renda);
    kv(doc, 'Benefícios Sociais', d.beneficios_sociais);
    kv(doc, 'Gastos Principais', d.gastos_principais);
    doc.moveDown();

    doc.fontSize(12).text('Saúde e Bem-Estar', { underline: true });
    doc.moveDown(0.5);
    kv(doc, 'Condição de Saúde', d.condicao_saude_geral);
    kv(doc, 'Problemas de Saúde', d.problemas_saude);
    kv(doc, 'Uso de Medicamentos', d.uso_medicamentos);
    kv(doc, 'Medicamentos em Uso', d.medicamentos_uso);
    kv(doc, 'Acompanhamento Médico', d.acompanhamento_medico);
    doc.moveDown();

    doc.fontSize(12).text('Educação e Trabalho', { underline: true });
    doc.moveDown(0.5);
    kv(doc, 'Nível de Escolaridade', d.nivel_escolaridade);
    kv(doc, 'Desejo de Capacitação', d.desejo_capacitacao);
    kv(doc, 'Áreas de Interesse', d.areas_interesse);
    doc.moveDown();

    doc.fontSize(12).text('Rede Social e Expectativas', { underline: true });
    doc.moveDown(0.5);
    kv(doc, 'Rede de Apoio', d.rede_apoio);
    kv(doc, 'Participação Comunitária', d.participacao_comunitaria);
    kv(doc, 'Violências Enfrentadas', d.violencias_enfrentadas);
    kv(doc, 'Expectativas no Programa', d.expectativas_programa);
    kv(doc, 'Objetivos Pessoais', d.objetivos_pessoais);
    kv(doc, 'Disponibilidade de Participação', d.disponibilidade_participacao);
    doc.moveDown();

    doc.fontSize(12).text('Observações', { underline: true });
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(10).text(d.observacoes || '-', { width: 500 });

    doc.end();
  });
};

export const renderFichaEvolucaoPdf = (form: any): Promise<Buffer> => {
  return new Promise((resolve) => {
    const doc = new (PDFDocument as any)({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    const d = form?.dados || {};
    doc.fontSize(18).text('Ficha de Evolução', { underline: true });
    doc.moveDown();
    kv(doc, 'Beneficiária', form?.beneficiaria_id);
    kv(doc, 'Data', form?.created_at);
    doc.moveDown();
    kv(doc, 'Resumo', d.resumo || d.descricao);
    if (Array.isArray(d.itens) && d.itens.length) {
      doc.moveDown();
      doc.fontSize(12).text('Itens/Registros');
      doc.moveDown(0.5);
      d.itens.forEach((item: any, idx: number) => {
        kv(doc, `• ${idx + 1}`, typeof item === 'object' ? JSON.stringify(item) : item);
      });
    }
    doc.end();
  });
};

export const renderTermosPdf = (form: any): Promise<Buffer> => {
  return new Promise((resolve) => {
    const doc = new (PDFDocument as any)({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    const d = form?.dados || {};
    doc.fontSize(18).text('Termo de Consentimento', { underline: true });
    doc.moveDown();
    kv(doc, 'Beneficiária', form?.beneficiaria_id);
    kv(doc, 'Data', form?.created_at);
    doc.moveDown();
    doc.fontSize(12).text('Conteúdo do Termo', { underline: true });
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(10).text(d.texto || d.conteudo || '-', { width: 500 });
    doc.moveDown();
    kv(doc, 'Ciente/Aceite', d.aceite || d.assinado || d.concorda);
    doc.end();
  });
};

export const renderVisaoHolisticaPdf = (form: any): Promise<Buffer> => {
  return new Promise((resolve) => {
    const doc = new (PDFDocument as any)({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    const d = form?.dados || {};
    doc.fontSize(18).text('Visão Holística', { underline: true });
    doc.moveDown();
    kv(doc, 'Beneficiária', form?.beneficiaria_id);
    kv(doc, 'Data', form?.created_at);
    doc.moveDown();
    Object.keys(d).forEach((k) => kv(doc, k, d[k]));
    doc.end();
  });
};
