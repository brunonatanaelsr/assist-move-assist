# Endpoints da API de Participações

Documentação dos endpoints disponíveis para gerenciamento de participações.

## Listar Participações

Retorna uma lista paginada de participações.

`GET /api/participacoes`

### Parâmetros de Query

| Parâmetro       | Tipo   | Descrição                                 |
| --------------- | ------ | ----------------------------------------- |
| page            | number | Número da página (default: 1)             |
| limit           | number | Registros por página (default: 10)        |
| beneficiaria_id | number | Filtrar por beneficiária                  |
| projeto_id      | number | Filtrar por projeto                       |
| oficina_id      | number | Filtrar por oficina                       |
| status          | string | Filtrar por status                        |
| data_inicio     | string | Data inicial (YYYY-MM-DD)                 |
| data_fim        | string | Data final (YYYY-MM-DD)                   |
| search          | string | Busca por nome da beneficiária ou projeto |

### Exemplo de Resposta

```json
{
  "data": [
    {
      "id": 1,
      "beneficiaria_id": 1,
      "projeto_id": 1,
      "status": "inscrita",
      "presenca_percentual": 0,
      "certificado_emitido": false,
      "observacoes": null,
      "data_inscricao": "2024-01-01T00:00:00.000Z",
      "data_conclusao": null,
      "data_atualizacao": "2024-01-01T00:00:00.000Z",
      "ativo": true,
      "projeto_nome": "Projeto Teste",
      "beneficiaria_nome": "Maria Teste"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

## Criar Participação

Cria uma nova participação.

`POST /api/participacoes`

### Corpo da Requisição

```json
{
  "beneficiaria_id": 1,
  "projeto_id": 1,
  "status": "inscrita",
  "observacoes": "Opcional"
}
```

### Exemplo de Resposta

```json
{
  "id": 1,
  "beneficiaria_id": 1,
  "projeto_id": 1,
  "status": "inscrita",
  "presenca_percentual": 0,
  "certificado_emitido": false,
  "observacoes": "Opcional",
  "data_inscricao": "2024-01-01T00:00:00.000Z",
  "data_conclusao": null,
  "data_atualizacao": "2024-01-01T00:00:00.000Z",
  "ativo": true
}
```

## Atualizar Participação

Atualiza uma participação existente.

`PATCH /api/participacoes/:id`

### Corpo da Requisição

```json
{
  "status": "em_andamento",
  "observacoes": "Atualização opcional"
}
```

### Exemplo de Resposta

```json
{
  "id": 1,
  "status": "em_andamento",
  "observacoes": "Atualização opcional",
  "data_atualizacao": "2024-01-01T00:00:00.000Z"
}
```

## Excluir Participação

Remove uma participação (soft delete).

`DELETE /api/participacoes/:id`

### Resposta

- Status: 204 No Content

## Registrar Presença

Registra o percentual de presença em uma participação.

`POST /api/participacoes/:id/presenca`

### Corpo da Requisição

```json
{
  "presenca": 80
}
```

### Exemplo de Resposta

```json
{
  "id": 1,
  "presenca_percentual": 80,
  "data_atualizacao": "2024-01-01T00:00:00.000Z"
}
```

## Emitir Certificado

Emite o certificado de uma participação.

`POST /api/participacoes/:id/certificado`

### Exemplo de Resposta

```json
{
  "id": 1,
  "certificado_emitido": true,
  "status": "concluida",
  "data_conclusao": "2024-01-01T00:00:00.000Z",
  "data_atualizacao": "2024-01-01T00:00:00.000Z"
}
```

## Observações

- Todas as rotas exigem autenticação
- O certificado só pode ser emitido se a presença for >= 75%
- Datas são retornadas no formato ISO 8601
