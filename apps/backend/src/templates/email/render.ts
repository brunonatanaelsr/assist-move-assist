const escape = (value: any): string => {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

type EmailContext = Record<string, any>;

type EmailTemplate = (context: EmailContext) => string;

const baseLayout = (title: string, body: string): string => `
  <html>
    <head>
      <meta charset="utf-8" />
      <title>${escape(title)}</title>
    </head>
    <body style="font-family: Arial, sans-serif; background: #f7f7f7; padding: 32px; color: #222;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;">
        <tr>
          <td style="background:#4f46e5;padding:24px 32px;color:#ffffff;font-size:22px;font-weight:bold;">
            ${escape(title)}
          </td>
        </tr>
        <tr>
          <td style="padding:32px;font-size:15px;line-height:1.6;">
            ${body}
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px;font-size:12px;color:#666;background:#fafafa;text-align:center;">
            Esta é uma mensagem automática. Por favor, não responda.
          </td>
        </tr>
      </table>
    </body>
  </html>
`;

const templates: (Record<string, EmailTemplate> & { default: EmailTemplate }) = {
  notification: (context) => {
    const actionButton = context.actionUrl
      ? `<p style="margin-top:24px;"><a href="${escape(context.actionUrl)}" style="background:#4f46e5;color:#ffffff;padding:12px 24px;border-radius:4px;text-decoration:none;display:inline-block;">Acessar</a></p>`
      : '';

    return baseLayout(
      context.titulo ?? 'Notificação',
      `
        <p>${escape(context.mensagem ?? 'Você tem uma nova notificação.')}</p>
        <p style="margin-top:16px;color:#555;">Tipo: <strong>${escape(context.tipo ?? 'informativo')}</strong></p>
        <p style="margin-top:8px;color:#555;">Data: ${escape(context.data ?? new Date().toLocaleString())}</p>
        ${actionButton}
      `
    );
  },
  default: (context) => baseLayout(
    context.subject ?? 'Mensagem',
    `<p>${escape(context.message ?? 'Olá!')}</p>`
  )
};

export async function renderTemplate(template: string, context: EmailContext): Promise<string> {
  const renderer: EmailTemplate = templates[template] ?? templates.default;
  return renderer(context);
}
