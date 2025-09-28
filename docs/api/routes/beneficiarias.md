# Rotas de Beneficiárias

## Lista de Beneficiárias
`GET /api/beneficiarias`

**Query Parameters:**
- `search` (opcional): Busca por nome, CPF ou PAEDI
- `status` (opcional): Filtra por status
- `page` (opcional): Página atual (default: 1)
- `limit` (opcional): Itens por página (default: 10)

**Resposta:**
```typescript
{
  success: true,
  data: {
    items: Beneficiaria[],
    pagination: {
      page: number,
      limit: number,
      total: number,
      totalPages: number
    }
  }
}
```

## Buscar Beneficiária por ID
`GET /api/beneficiarias/:id`

**Resposta:**
```typescript
{
  success: true,
  data: Beneficiaria
}
```

## Criar Beneficiária
`POST /api/beneficiarias`

**Payload:**
```typescript
{
  nome_completo: string;
  cpf: string;
  data_nascimento: string;
  telefone?: string;
  telefone_secundario?: string;
  email?: string;
  status: 'Ativa' | 'Aguardando' | 'Inativa' | 'Desistente';
}
```

**Resposta:**
```typescript
{
  success: true,
  data: Beneficiaria,
  message: 'Beneficiária cadastrada com sucesso'
}
```

## Atualizar Beneficiária
`PUT /api/beneficiarias/:id`

**Payload:**
```typescript
{
  nome_completo?: string;
  cpf?: string;
  data_nascimento?: string;
  telefone?: string;
  telefone_secundario?: string;
  email?: string;
  status?: 'Ativa' | 'Aguardando' | 'Inativa' | 'Desistente';
}
```

**Resposta:**
```typescript
{
  success: true,
  data: Beneficiaria,
  message: 'Beneficiária atualizada com sucesso'
}
```

## Buscar Resumo da Beneficiária
`GET /api/beneficiarias/:id/resumo`

**Resposta:**
```typescript
{
  success: true,
  data: {
    total_oficinas: number;
    total_atendimentos: number;
    ultima_atualizacao: string | null;
  }
}
```

## Respostas de Erro

Todas as rotas podem retornar os seguintes erros:

### Erro de Validação (400)
```typescript
{
  success: false,
  message: 'Erro de validação',
  error: {
    code: 'VALIDATION_ERROR',
    field?: string,
    message: string
  }
}
```

### Não Encontrado (404)
```typescript
{
  success: false,
  message: 'Registro não encontrado'
}
```

### Erro de Permissão (403)
```typescript
{
  success: false,
  message: 'Você não tem permissão para esta ação'
}
```

### Erro Interno (500)
```typescript
{
  success: false,
  message: 'Erro interno do servidor'
}
```