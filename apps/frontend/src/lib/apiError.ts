const patterns: Array<[RegExp, string]> = [
  // Erros de validação
  [/cpf/i, 'Verifique o CPF informado. Use um CPF válido.'],
  [/telefone|phone/i, 'Verifique o telefone. Use 10 ou 11 dígitos.'],
  [/email/i, 'Verifique o e-mail informado.'],
  [/data|date/i, 'Verifique a data informada.'],
  [/campo obrigat[oó]rio|required/i, 'Preencha todos os campos obrigatórios.'],
  [/inv[aá]lid[ao]|validation/i, 'Verifique os dados informados.'],
  
  // Erros de autenticação
  [/autentica[cç][aã]o|unauthorized|401/i, 'Sessão expirada. Faça login novamente.'],
  [/permiss[aã]o|acesso negado|forbidden|403/i, 'Você não tem permissão para esta ação.'],
  
  // Erros de dados
  [/não encontrado|not found|404/i, 'Registro não encontrado.'],
  [/duplicad|unique|já cadastr/i, 'Registro já existe.'],
  [/limite excedido|too many/i, 'Limite de requisições excedido. Tente novamente em alguns minutos.'],
  
  // Erros de servidor
  [/servidor|internal|500/i, 'Erro interno do servidor. Tente novamente em alguns instantes.'],
  [/timeout|tempo excedido/i, 'O servidor demorou para responder. Tente novamente.'],
  [/conex[aã]o|network/i, 'Verifique sua conexão com a internet.'],
];

export interface ApiErrorDetails {
  code?: string;
  field?: string;
  message: string;
  details?: string[];
}

export function isApiError(error: unknown): error is ApiErrorDetails {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as any).message === 'string'
  );
}

export function translateErrorMessage(error: string | ApiErrorDetails | unknown): string {
  if (isApiError(error)) {
    return error.field 
      ? `${error.message} (${error.field})` 
      : error.message;
  }
  
  const msg = (typeof error === 'string' ? error : (error as any)?.message || '').trim();
  if (!msg) return 'Erro de comunicação com o servidor';

  for (const [re, friendly] of patterns) {
    if (re.test(msg)) return friendly;
  }

  return msg;
}

