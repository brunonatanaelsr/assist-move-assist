const patterns: Array<[RegExp, string]> = [
  [/cpf/i, 'Verifique o CPF informado. Use um CPF válido.'],
  [/telefone|phone/i, 'Verifique o telefone. Use 10 ou 11 dígitos.'],
  [/email/i, 'Verifique o e-mail informado.'],
  [/permiss[aã]o|acesso negado|forbidden|403/i, 'Você não tem permissão para esta ação.'],
  [/não encontrado|not found|404/i, 'Registro não encontrado.'],
  [/duplicad|unique|já cadastr/i, 'Registro já existe.'],
  [/servidor|internal|500/i, 'Erro interno do servidor. Tente novamente.'],
];

export function translateErrorMessage(message?: string): string {
  const msg = (message || '').trim();
  if (!msg) return 'Erro de comunicação com o servidor';
  for (const [re, friendly] of patterns) {
    if (re.test(msg)) return friendly;
  }
  return msg;
}

