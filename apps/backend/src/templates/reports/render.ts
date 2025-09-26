type ReportContext = {
  data: Array<Record<string, any>>;
  filters?: Record<string, any>;
};

type TemplateRenderer = (context: ReportContext) => string;

const escape = (value: any): string => {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const renderTable = (rows: Array<Record<string, any>>): string => {
  if (!rows || rows.length === 0) {
    return '<p>Sem dados disponíveis para os filtros selecionados.</p>';
  }

  const firstRow = rows[0] ?? {};
  const headers = Object.keys(firstRow as Record<string, any>);

  const headerHtml = headers
    .map((header) => `<th style="padding:8px;background:#f4f4f4;text-align:left">${escape(header)}</th>`)
    .join('');

  const rowsHtml = rows
    .map((row) => {
      const cells = headers
        .map((header) => `<td style="padding:8px;border-top:1px solid #eee">${escape(String(row[header] ?? ''))}</td>`)
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  return `
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <thead><tr>${headerHtml}</tr></thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  `;
};

const section = (title: string, content: string) => `
  <section style="margin-bottom:24px;">
    <h2 style="font-size:20px;margin-bottom:12px;">${escape(title)}</h2>
    ${content}
  </section>
`;

const defaultTemplate: TemplateRenderer = ({ data }) => `
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Relatório</title>
    </head>
    <body style="font-family:Arial, sans-serif; padding:32px; color:#222;">
      <h1 style="font-size:24px;margin-bottom:24px;">Relatório</h1>
      ${renderTable(data)}
    </body>
  </html>
`;

const templates: Record<string, TemplateRenderer> = {
  beneficiarias_completo: ({ data, filters }) => `
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Relatório de Beneficiárias</title>
      </head>
      <body style="font-family:Arial, sans-serif; padding:32px; color:#222;">
        <h1 style="font-size:26px;margin-bottom:8px;">Relatório de Beneficiárias</h1>
        <p style="margin-bottom:24px; color:#666;">${escape(`Filtros aplicados: ${JSON.stringify(filters ?? {})}`)}</p>
        ${renderTable(data)}
      </body>
    </html>
  `,
  participacao_oficinas: ({ data }) => `
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Participação em Oficinas</title>
      </head>
      <body style="font-family:Arial, sans-serif; padding:32px; color:#222;">
        <h1 style="font-size:26px;margin-bottom:24px;">Participação em Oficinas</h1>
        ${renderTable(data)}
      </body>
    </html>
  `,
  produtividade_equipe: ({ data }) => `
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Produtividade da Equipe</title>
      </head>
      <body style="font-family:Arial, sans-serif; padding:32px; color:#222;">
        <h1 style="font-size:26px;margin-bottom:24px;">Produtividade da Equipe</h1>
        ${section('Resumo', renderTable(data.slice(0, 10)))}
        ${section('Detalhes', renderTable(data))}
      </body>
    </html>
  `,
  timeline_atividades: ({ data }) => `
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Timeline de Atividades</title>
      </head>
      <body style="font-family:Arial, sans-serif; padding:32px; color:#222;">
        <h1 style="font-size:26px;margin-bottom:24px;">Linha do Tempo de Atividades</h1>
        ${renderTable(data)}
      </body>
    </html>
  `
};

export async function renderTemplate(template: string, context: ReportContext): Promise<string> {
  const renderer = templates[template] ?? defaultTemplate;
  return renderer({ data: context.data ?? [], filters: context.filters ?? {} });
}
