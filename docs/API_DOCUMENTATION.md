# Documentação da API - Assist Move Assist

A API é construída em Node.js/Express e expõe recursos REST sob o prefixo `/api`. Todas as respostas utilizam JSON e a autenticação é feita por JWT (enviado via header `Authorization: Bearer <token>` ou cookie `auth_token`).

## URLs Importantes
- **Produção**: `https://<seu-dominio>/api`
- **Homologação**: `https://staging.<seu-dominio>/api`
- **Desenvolvimento**: `http://localhost:4000/api`
- **Health Check**: `GET /api/health`

## Autenticação
### Login
`POST /api/auth/login`

```json
{
  "email": "admin@exemplo.org",
  "password": "senhaSegura123"
}
```

**Resposta**
```json
{
  "message": "Login realizado com sucesso",
  "token": "<jwt>",
  "user": {
    "id": 1,
    "email": "admin@exemplo.org",
    "nome_completo": "Admin",
    "role": "admin"
  }
}
```

### Refresh Token
`POST /api/auth/refresh`

Requer header/cookie de autenticação válido. Retorna um novo JWT.

### Logout
`POST /api/auth/logout`

Limpa o cookie `auth_token` e invalida a sessão ativa no Redis.

### Perfil do Usuário
`GET /api/auth/profile`

Retorna dados do usuário autenticado e permissões associadas.

## Recursos Principais
### Beneficiárias
- `GET /api/beneficiarias`: lista paginada com filtros (`status`, `nome`, `projetoId`).
- `POST /api/beneficiarias`: cria nova beneficiária.
- `GET /api/beneficiarias/:id`: detalhes completos com histórico.
- `PUT /api/beneficiarias/:id`: atualização total/parcial.
- `DELETE /api/beneficiarias/:id`: inativa o cadastro (soft delete).

**Exemplo de resposta**
```json
{
  "data": [
    {
      "id": "b8ae7b52-7f52-4e29-9147-0a42c248b279",
      "nome_completo": "Maria da Silva",
      "status": "ativa",
      "cpf": "123.456.789-09",
      "data_nascimento": "1992-04-18",
      "contatos": ["(11) 91234-5678"],
      "created_at": "2024-08-01T12:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 148
  }
}
```

### Projetos
- `GET /api/projetos`
- `POST /api/projetos`
- `GET /api/projetos/:id`
- `PATCH /api/projetos/:id`
- `GET /api/projetos/:id/beneficiarias`

### Oficinas
- `GET /api/oficinas`: suporta filtros por `projetoId`, `status`, intervalo de datas e texto livre.
- `POST /api/oficinas`: criação com validações (`capacidade`, `instrutor`, `cronograma`).
- `GET /api/oficinas/:id`
- `PATCH /api/oficinas/:id`
- `DELETE /api/oficinas/:id`: marca como cancelada.

### Formulários e Documentos
- `POST /api/formularios/:tipo`: salva formulário (anamnese, ficha de evolução etc.).
- `GET /api/formularios/:tipo`: lista envios por beneficiária/projeto.
- `POST /api/declaracoes`: gera declaração em PDF e registra histórico.
- `POST /api/recibos`: gera recibo em PDF (retorna URL temporária para download autenticado).
- `GET /api/documentos`: consulta documentos emitidos com filtros (`tipo`, `beneficiariaId`, `periodo`).

### Comunicação e Feed
- `GET /api/feed`: retorna posts ordenados por data e prioridade.
- `POST /api/feed`: cria novo anúncio/notícia.
- `GET /api/mensagens`: inbox segmentada por grupo.
- `POST /api/mensagens`: envia mensagens privadas ou em grupo.
- WebSocket: canal `notifications` para updates em tempo real (`NEXT_PUBLIC_WS_URL`).

### Relatórios e Dashboard
- `GET /api/dashboard/resumo`: métricas agregadas (beneficiárias ativas, oficinas semanais, ocupação de projetos).
- `GET /api/relatorios/oficinas`: exporta CSV/XLSX.
- `GET /api/relatorios/beneficiarias`: suporta filtros avançados.

### Uploads
- `POST /api/upload`: upload multipart com validação de extensão e tamanho.
- Retorna payload com URL protegida; os arquivos ficam armazenados conforme configuração local/S3.

## Padrões de Resposta
- `200 OK`: requisição concluída.
- `201 Created`: recurso criado.
- `204 No Content`: remoção/atualização sem body.
- `400 Bad Request`: erro de validação (`errors` com detalhes).
- `401 Unauthorized`: token ausente ou inválido.
- `403 Forbidden`: falta de permissão (RBAC baseado em `role`).
- `404 Not Found`: recurso inexistente.
- `429 Too Many Requests`: rate limit excedido.
- `500 Internal Server Error`: log detalhado em `apps/backend/logs/error.log`.

## Paginação, Ordenação e Filtros
- Parâmetros padrão: `page`, `pageSize`, `orderBy`, `orderDirection`.
- Campos específicos em cada recurso (`status`, `dataInicio`, `projetoId`, etc.).
- Endpoints retornam objeto `pagination` com `page`, `pageSize`, `total`, `hasNextPage`.

## Autorização (RBAC)
Perfis disponíveis: `admin`, `coordenador`, `colaborador`, `visitante`.
- `admin`: acesso total, inclusive configurações e relatórios completos.
- `coordenador`: CRUD completo de beneficiárias, projetos, oficinas e formulários.
- `colaborador`: leitura ampla, criação de formulários e atualizações limitadas.
- `visitante`: leitura restrita (ex.: feed público).

As regras são avaliadas no middleware `ensureRole` e registradas em `apps/backend/src/middleware/auth.ts`.

## WebSocket
- Endpoint: `ws(s)://<domínio>/api` (Socket.IO v4).
- Eventos emitidos: `beneficiarias:updated`, `oficinas:updated`, `feed:new-post`, `notifications:unread`.
- Autenticação via token Bearer enviado na handshake query (`token=<jwt>`).

## Versionamento e Evolução
- A API atualmente não possui versões paralelas; mudanças incompatíveis devem ser coordenadas com o frontend.
- Cada rota expõe metadados no header `X-API-Version` (definido na resposta global).
- Feature flags: utilize `X-Feature-Flag` para habilitar recursos em beta (consultar `apps/backend/src/middleware/featureFlags.ts`).

## Erros Comuns
- **401**: verifique expiração do token e sincronize relógios (NTP) do servidor.
- **422**: validação `zod` falhou; inspecione campo `errors[].path`.
- **500 em /api/oficinas**: geralmente causado por filtros inválidos ou falha na conexão com PostgreSQL. Consulte logs do `OficinaService`.

## Suporte
- E-mail: `suporte@movemarias.org.br`
- GitHub Issues: `https://github.com/movemarias/assist-move-assist/issues`
- Logs: disponíveis em `/var/log/assist-backend/` (produção).
