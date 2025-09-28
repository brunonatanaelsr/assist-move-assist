# Formato de Resposta da API

A API agora retorna todas as respostas em um formato normalizado e consistente.

## Estrutura Básica

```typescript
interface ApiResponse<T = unknown> {
  // Indica se a requisição foi bem sucedida
  success: boolean;
  
  // Dados da resposta (sempre normalizado)
  data?: {
    items: T[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages?: number;
    };
  };
  
  // Mensagem de sucesso ou erro
  message?: string;
  
  // Detalhes do erro quando success === false
  error?: {
    code?: string;
    field?: string;
    message: string;
    details?: string[];
  };
}
```

## Exemplos

### Sucesso - Lista de Beneficiárias

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "123",
        "nome_completo": "Maria Silva",
        "cpf": "123.456.789-00"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "totalPages": 5
    }
  }
}
```

### Erro - Validação

```json
{
  "success": false,
  "message": "Erro de validação",
  "error": {
    "code": "VALIDATION_ERROR",
    "field": "cpf",
    "message": "CPF inválido",
    "details": [
      "O CPF deve conter 11 dígitos"
    ]
  },
  "data": {
    "items": [],
    "pagination": undefined
  }
}
```

## Padronização de Erros

Os erros são categorizados em:

1. **Erros de Validação**
   - Campos inválidos
   - Dados faltando
   - Formato incorreto

2. **Erros de Autenticação**
   - Sessão expirada
   - Permissão negada
   - Credenciais inválidas

3. **Erros de Dados**
   - Registro não encontrado
   - Duplicidade
   - Limite excedido

4. **Erros de Servidor**
   - Erro interno
   - Timeout
   - Problemas de conexão

## Migração e Compatibilidade

Para manter compatibilidade com código existente:

1. Respostas antigas são automaticamente normalizadas
2. Arrays são convertidos para o formato `{ items: [] }`
3. Paginação é preservada quando disponível
4. Erros sempre incluem uma mensagem amigável