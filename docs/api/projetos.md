# Endpoints da API de Projetos

Documentação dos endpoints disponíveis para gerenciamento de projetos.

## Listar Projetos

Retorna uma lista paginada de projetos.

`GET /api/projetos`

### Parâmetros de Query

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| page | number | Número da página (default: 1) |
| limit | number | Registros por página (default: 50) |
| status | string | Filtrar por status (planejamento, em_andamento, concluido, cancelado) |
| search | string | Busca por nome, descrição ou localização |

### Exemplo de Resposta

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "nome": "Projeto Exemplo",
      "descricao": "Descrição do projeto",
      "data_inicio": "2025-01-01T00:00:00.000Z",
      "data_fim_prevista": "2025-12-31T00:00:00.000Z",
      "data_fim_real": null,
      "status": "em_andamento",
      "responsavel_id": 1,
      "responsavel_nome": "João Silva",
      "orcamento": 50000,
      "local_execucao": "São Paulo",
      "total_oficinas": 3,
      "data_criacao": "2025-01-01T00:00:00.000Z",
      "data_atualizacao": "2025-01-01T00:00:00.000Z",
      "ativo": true
    }
  ],
  "message": "Projetos carregados com sucesso",
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1,
    "totalPages": 1
  }
}
```

## Buscar Projeto

Retorna os detalhes de um projeto específico.

`GET /api/projetos/:id`

### Exemplo de Resposta

```json
{
  "success": true,
  "data": {
    "id": 1,
    "nome": "Projeto Exemplo",
    "descricao": "Descrição do projeto",
    "data_inicio": "2025-01-01T00:00:00.000Z",
    "data_fim_prevista": "2025-12-31T00:00:00.000Z",
    "data_fim_real": null,
    "status": "em_andamento",
    "responsavel_id": 1,
    "responsavel_nome": "João Silva",
    "orcamento": 50000,
    "local_execucao": "São Paulo",
    "data_criacao": "2025-01-01T00:00:00.000Z",
    "data_atualizacao": "2025-01-01T00:00:00.000Z",
    "ativo": true
  },
  "message": "Projeto carregado com sucesso"
}
```

## Criar Projeto

Cria um novo projeto.

`POST /api/projetos`

### Corpo da Requisição

```json
{
  "nome": "Novo Projeto",
  "descricao": "Descrição do novo projeto",
  "data_inicio": "2025-01-01",
  "data_fim_prevista": "2025-12-31",
  "status": "planejamento",
  "orcamento": 50000,
  "local_execucao": "São Paulo"
}
```

### Exemplo de Resposta

```json
{
  "success": true,
  "data": {
    "id": 1,
    "nome": "Novo Projeto",
    "descricao": "Descrição do novo projeto",
    "data_inicio": "2025-01-01T00:00:00.000Z",
    "data_fim_prevista": "2025-12-31T00:00:00.000Z",
    "data_fim_real": null,
    "status": "planejamento",
    "responsavel_id": 1,
    "orcamento": 50000,
    "local_execucao": "São Paulo",
    "data_criacao": "2025-01-01T00:00:00.000Z",
    "data_atualizacao": "2025-01-01T00:00:00.000Z",
    "ativo": true
  },
  "message": "Projeto criado com sucesso"
}
```

## Atualizar Projeto

Atualiza um projeto existente.

`PUT /api/projetos/:id`

### Corpo da Requisição

```json
{
  "nome": "Projeto Atualizado",
  "descricao": "Nova descrição",
  "status": "em_andamento",
  "orcamento": 60000
}
```

### Exemplo de Resposta

```json
{
  "success": true,
  "data": {
    "id": 1,
    "nome": "Projeto Atualizado",
    "descricao": "Nova descrição",
    "status": "em_andamento",
    "orcamento": 60000,
    "data_atualizacao": "2025-01-01T00:00:00.000Z"
  },
  "message": "Projeto atualizado com sucesso"
}
```

## Excluir Projeto

Remove um projeto (soft delete).

`DELETE /api/projetos/:id`

### Exemplo de Resposta

```json
{
  "success": true,
  "message": "Projeto removido com sucesso"
}
```

## Observações

- Todas as rotas exigem autenticação
- As rotas de criação, atualização e exclusão exigem permissão de gestor
- Não é possível excluir projetos que possuem oficinas ativas
- Datas são retornadas no formato ISO 8601
- O status do projeto pode ser: 'planejamento', 'em_andamento', 'concluido' ou 'cancelado'
- O campo total_oficinas na listagem indica o número de oficinas ativas associadas ao projeto
