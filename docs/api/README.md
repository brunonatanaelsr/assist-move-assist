# API Documentation - Move Marias

## Base URL

`https://api.movemarias.org/v1`

## Autenticação

Todas as rotas (exceto /auth/login) requerem autenticação via Bearer Token JWT.

## Endpoints

### Autenticação

- `POST /auth/login` - Login de usuário
- `POST /auth/logout` - Logout
- `GET /auth/me` - Obter usuário atual
- `POST /auth/change-password` - Alterar senha
- `POST /auth/forgot-password` - Solicitar recuperação de senha
- `POST /auth/reset-password` - Resetar senha

### Usuários

- `GET /users` - Listar usuários
- `POST /users` - Criar usuário
- `GET /users/:id` - Obter usuário
- `PUT /users/:id` - Atualizar usuário
- `DELETE /users/:id` - Desativar usuário
- `GET /users/:id/permissions` - Listar permissões
- `PUT /users/:id/permissions` - Atualizar permissões

### Mensagens

- `GET /mensagens/conversas` - Listar histórico recente de mensagens diretas
- `GET /mensagens/conversa/:usuarioId` - Recuperar conversa direta com um usuário
- `GET /mensagens/threads` - Listar threads segmentadas por beneficiária/projeto ou gerais onde o usuário participa
- `POST /mensagens/threads` - Criar thread contextual informando escopo (`DIRECT`, `BENEFICIARIA`, `PROJETO`) e participantes
- `GET /mensagens/threads/:threadId` - Obter dados de uma thread, incluindo participantes e confidencialidade
- `GET /mensagens/threads/:threadId/mensagens` - Listar mensagens da thread em ordem cronológica
- `POST /mensagens/threads/:threadId/mensagens` - Enviar mensagem para a thread informando confidencialidade e menções
- `POST /mensagens/enviar` - Enviar mensagem direta (`destinatario_id`) ou anexar a uma thread existente (`thread_id`), com suporte a `confidencialidade`, `beneficiaria_id`, `projeto_id` e `mentions`

### Beneficiárias

- `GET /beneficiarias` - Listar beneficiárias
- `POST /beneficiarias` - Cadastrar beneficiária
- `GET /beneficiarias/:id` - Obter beneficiária
- `PUT /beneficiarias/:id` - Atualizar beneficiária
- `DELETE /beneficiarias/:id` - Desativar beneficiária
- `GET /beneficiarias/:id/formularios` - Listar formulários
- `GET /beneficiarias/:id/participacoes` - Listar participações
- `GET /beneficiarias/:id/documentos` - Listar documentos

### Projetos

- `GET /projetos` - Listar projetos
- `POST /projetos` - Criar projeto
- `GET /projetos/:id` - Obter projeto
- `PUT /projetos/:id` - Atualizar projeto
- `DELETE /projetos/:id` - Desativar projeto
- `GET /projetos/:id/oficinas` - Listar oficinas do projeto
- `GET /projetos/:id/beneficiarias` - Listar beneficiárias do projeto
- `GET /projetos/:id/documentos` - Listar documentos do projeto
- `GET /projetos/stats` - Obter estatísticas dos projetos

### Oficinas

- `GET /oficinas` - Listar oficinas
- `POST /oficinas` - Criar oficina
- `GET /oficinas/:id` - Obter oficina
- `PUT /oficinas/:id` - Atualizar oficina
- `DELETE /oficinas/:id` - Desativar oficina
- `POST /oficinas/:id/participacoes` - Registrar participação
- `GET /oficinas/:id/participacoes` - Listar participações
- `GET /oficinas/:id/presenca` - Lista de presença
- `GET /oficinas/stats` - Obter estatísticas das oficinas

### Formulários

#### Anamnese Social

- `GET /formularios/anamnese` - Listar anamneses
- `POST /formularios/anamnese` - Criar anamnese
- `GET /formularios/anamnese/:id` - Obter anamnese
- `PUT /formularios/anamnese/:id` - Atualizar anamnese
- `DELETE /formularios/anamnese/:id` - Desativar anamnese

#### Roda da Vida

- `GET /formularios/roda-vida` - Listar avaliações
- `POST /formularios/roda-vida` - Criar avaliação
- `GET /formularios/roda-vida/:id` - Obter avaliação
- `PUT /formularios/roda-vida/:id` - Atualizar avaliação
- `DELETE /formularios/roda-vida/:id` - Desativar avaliação

#### Plano de Desenvolvimento

- `GET /formularios/plano` - Listar planos
- `POST /formularios/plano` - Criar plano
- `GET /formularios/plano/:id` - Obter plano
- `PUT /formularios/plano/:id` - Atualizar plano
- `DELETE /formularios/plano/:id` - Desativar plano

### Documentos

- `GET /documentos` - Listar documentos
- `POST /documentos` - Upload de documento
- `GET /documentos/:id` - Obter documento
- `PUT /documentos/:id` - Atualizar documento
- `DELETE /documentos/:id` - Desativar documento
- `GET /documentos/:id/download` - Download do documento

### Auditoria

- `GET /auditoria` - Listar eventos
- `GET /auditoria/:id` - Obter evento
- `GET /auditoria/stats` - Obter estatísticas
- `GET /auditoria/export` - Exportar eventos

### Analytics

- `GET /analytics/dashboard` - Dados do dashboard
- `GET /analytics/beneficiarias` - Estatísticas de beneficiárias
- `GET /analytics/projetos` - Estatísticas de projetos
- `GET /analytics/oficinas` - Estatísticas de oficinas
- `GET /analytics/formularios` - Estatísticas de formulários

## Responses

### Sucesso

```json
{
  "success": true,
  "data": {},
  "message": "Operação realizada com sucesso"
}
```

### Erro

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Descrição do erro"
  }
}
```

### Paginação

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

## Códigos de Status

- 200: OK
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 409: Conflict
- 500: Internal Server Error
