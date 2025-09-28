# Documentação da API - Move Marias

## Base URL

A API é exposta sob o prefixo `/api`. Em desenvolvimento local o endereço padrão é `http://localhost:3000/api`.

## Inventário automatizado de rotas

O inventário completo, extraído diretamente dos arquivos de rotas ativos, está disponível em [`ROUTES_INVENTORY.md`](./ROUTES_INVENTORY.md). Gere novamente após mudanças com:

```bash
node scripts/list-routes.js
```

## Autenticação e sessão

| Método | Endpoint | Descrição |
| --- | --- | --- |
| POST | `/auth/login` | Autentica o usuário e retorna token + cookie de sessão. |
| POST | `/auth/register` | Cadastro rápido de usuário com retorno de sessão ativa. |
| POST | `/auth/logout` | Limpa o cookie de sessão atual. |
| POST | `/auth/refresh` | Gera novo token (requer usuário autenticado). |
| POST | `/auth/refresh-token` | Alias para `/auth/refresh`. |
| GET | `/auth/me` | Retorna o perfil completo do usuário autenticado. |
| GET | `/auth/profile` | Alias para `/auth/me`. |
| PUT | `/auth/profile` | Atualiza dados básicos do perfil. |
| POST | `/auth/change-password` | Troca de senha mediante validação da senha atual. |

> **TODO:** Fluxos de recuperação de senha (solicitar e redefinir) ainda não existem na API atual. Consulte [`TODO.md`](./TODO.md) para os próximos passos.

## Beneficiárias e núcleo social

| Método | Endpoint | Descrição |
| --- | --- | --- |
| GET | `/beneficiarias` | Lista beneficiárias com filtros e paginação. |
| GET | `/beneficiarias/:id` | Recupera dados completos de uma beneficiária. |
| GET | `/beneficiarias/:id/resumo` | Painel resumido (indicadores, participação e status). |
| GET | `/beneficiarias/:id/atividades` | Linha do tempo de atividades e interações. |
| POST | `/beneficiarias` | Cria uma nova beneficiária. |
| PUT | `/beneficiarias/:id` | Atualiza dados cadastrais. |
| DELETE | `/beneficiarias/:id` | Arquiva/soft delete da beneficiária. |

Validações auxiliares: `/validation/cpf`, `/validation/email`, `/validation/telefone` e `/validation/beneficiarias` ajudam no pré-cadastro.

## Projetos, oficinas e matrículas

| Método | Endpoint | Descrição |
| --- | --- | --- |
| GET | `/projetos` | Lista projetos disponíveis conforme permissões. |
| GET | `/projetos/:id` | Detalhes de um projeto. |
| POST | `/projetos` | Cria um projeto. |
| PUT | `/projetos/:id` | Atualiza projeto. |
| DELETE | `/projetos/:id` | Arquiva projeto. |
| GET | `/oficinas` | Lista oficinas. |
| GET | `/oficinas/:id` | Detalhes completos da oficina. |
| POST | `/oficinas` | Cria oficina (com verificação de conflitos). |
| PUT | `/oficinas/:id` | Atualiza oficina. |
| DELETE | `/oficinas/:id` | Remove/arquiva oficina. |
| GET | `/oficinas/:id/participantes` | Participantes com papéis e status. |
| POST | `/oficinas/:id/participantes` | Adiciona participante à oficina. |
| DELETE | `/oficinas/:id/participantes/:beneficiariaId` | Remove participante. |
| POST | `/oficinas/:id/presencas` | Registro em lote de presenças. |
| GET | `/oficinas/:id/presencas` | Consulta de presenças. |
| GET | `/oficinas/:id/resumo` | Consolida indicadores da oficina. |
| GET | `/oficinas/:id/relatorio-presencas` | Exporta PDF/relatório de presença. |
| GET | `/oficinas/horarios-disponiveis` | Grelha de horários livres por recurso. |
| POST | `/oficinas/verificar-conflito` | Checagem rápida de conflitos antes de criar/editar. |
| POST | `/matriculas-projetos/verificar-elegibilidade` | Valida pré-requisitos para matrícula. |
| GET | `/matriculas-projetos` | Lista matrículas de projetos. |
| POST | `/matriculas-projetos` | Cria nova matrícula. |
| GET | `/matriculas-projetos/:id` | Consulta matrícula específica. |
| PATCH | `/matriculas-projetos/:id` | Atualiza status da matrícula. |

## Participações e presença

| Método | Endpoint | Descrição |
| --- | --- | --- |
| GET | `/participacoes` | Lista participações em oficinas/projetos. |
| POST | `/participacoes` | Cria participação individual. |
| PATCH | `/participacoes/:id` | Atualiza campos da participação. |
| DELETE | `/participacoes/:id` | Remove participação. |
| POST | `/participacoes/:id/presenca` | Registro individual de presença. |
| POST | `/participacoes/:id/certificado` | Emite certificado nominal. |

## Formulários e documentos

### Blocos estruturados

| Método | Endpoint | Descrição resumida |
| --- | --- | --- |
| POST | `/formularios/anamnese` | Cria anamnese social. |
| GET | `/formularios/anamnese/:id` | Exibe anamnese. |
| GET | `/formularios/anamnese/:id/pdf` | Exporta PDF. |
| PUT | `/formularios/anamnese/:id` | Atualiza dados. |
| POST | `/formularios/ficha-evolucao` | Cria ficha de evolução. |
| GET | `/formularios/ficha-evolucao/:id` | Detalhe da ficha. |
| GET | `/formularios/ficha-evolucao/:id/pdf` | Exporta PDF. |
| GET | `/formularios/ficha-evolucao/beneficiaria/:beneficiariaId` | Histórico por beneficiária. |
| GET | `/formularios/ficha-evolucao/beneficiaria/:beneficiariaId/series` | Séries de evolução para gráficos. |
| PUT | `/formularios/ficha-evolucao/:id` | Atualiza ficha. |
| POST | `/formularios/termos-consentimento` | Registra termo de consentimento. |
| GET | `/formularios/termos-consentimento/beneficiaria/:beneficiariaId` | Lista termos por beneficiária. |
| GET | `/formularios/termos-consentimento/:id` | Detalhe do termo. |
| GET | `/formularios/termos-consentimento/:id/pdf` | Exporta termo. |
| PATCH | `/formularios/termos-consentimento/:id/revogacao` | Marca revogação. |
| PUT | `/formularios/termos-consentimento/:id` | Atualiza campos do termo. |
| POST | `/formularios/visao-holistica` | Cria avaliação holística. |
| GET | `/formularios/visao-holistica/:id` | Consulta avaliação. |
| GET | `/formularios/visao-holistica/:id/pdf` | Exporta PDF. |
| GET | `/formularios/visao-holistica/beneficiaria/:beneficiariaId` | Histórico de avaliações. |
| PUT | `/formularios/visao-holistica/:id` | Atualiza avaliação. |
| POST | `/formularios/roda-vida` | Cadastra roda da vida. |
| GET | `/formularios/roda-vida/:id` | Consulta roda da vida. |
| PUT | `/formularios/roda-vida/:id` | Atualiza roda da vida. |
| GET | `/formularios` | Lista formulários em geral. |
| GET | `/formularios/beneficiaria/:beneficiariaId` | Filtros por beneficiária. |
| POST | `/formularios/:tipo` | Endpoint genérico para novos tipos. |
| GET | `/formularios/:tipo/:id` | Recupera formulário genérico. |
| PUT | `/formularios/:tipo/:id` | Atualiza formulário genérico. |
| GET | `/formularios/:tipo/:id/pdf` | Exporta PDF para qualquer tipo suportado. |
| DELETE | `/formularios/:id` | Remove formulário (soft delete). |

### Documentos e comprovantes

| Método | Endpoint | Descrição |
| --- | --- | --- |
| GET | `/documentos/:beneficiariaId` | Lista documentos associados à beneficiária. |
| POST | `/documentos/:beneficiariaId/upload` | Upload autenticado via multipart. |
| PUT | `/documentos/:documentoId` | Atualiza metadados e, opcionalmente, substitui arquivo. |
| GET | `/documentos/:documentoId/download` | Download autenticado. |
| DELETE | `/documentos/:documentoId` | Remove documento. |
| GET | `/documentos/:beneficiariaId/versoes` | Lista versões anteriores. |
| POST | `/recibos/gerar` | Gera recibo (PDF). |
| GET | `/recibos/beneficiaria/:id` | Lista recibos por beneficiária. |
| GET | `/recibos/:id` | Recupera recibo. |
| GET | `/recibos/:id/pdf` | Download PDF. |
| POST | `/declaracoes/gerar` | Gera declaração (PDF). |
| GET | `/declaracoes/beneficiaria/:id` | Lista declarações da beneficiária. |
| GET | `/declaracoes/:id` | Recupera declaração. |
| GET | `/declaracoes/:id/pdf` | Download PDF. |

## Comunicação e engajamento

### Feed

Principais endpoints: upload de imagens (`POST /feed/upload-image`), listagem paginada (`GET /feed`), detalhes (`GET /feed/:id`), criação (`POST /feed`), curtidas (`POST /feed/:id/curtir`), compartilhamentos, comentários (`/feed/:postId/comentarios`) e exclusão/edição de posts.

### Mensagens e grupos

- `/mensagens/usuarios`, `/mensagens/conversas`, `/mensagens/conversa/:usuarioId`
- Threads: `/mensagens/threads`, `/mensagens/threads/:threadId`, `/mensagens/threads/:threadId/mensagens`
- Envio: `/mensagens/threads/:threadId/mensagens` e `/mensagens/enviar`
- Controle: `/mensagens/:id/lida`, `/mensagens/:id` (delete), `/mensagens/stream`
- Alias público: `GET /messages` encaminha para as mesmas informações expostas em `/mensagens`.

### Grupos e notificações

- Grupos: CRUD completo em `/grupos` com gestão de membros (`POST /grupos/:id/membros`, `DELETE /grupos/:id/membros/:usuarioId`).
- Notificações in-app: `/notifications` com contagem de não lidas, marcação (`PATCH /notifications/:id`), exclusão e preferências (`/notifications/preferences`). Endpoint auxiliar para Web Push: `POST /notifications/push-subscription`.

### Calendário

Eventos com recorrência, participantes e estatísticas em `/calendar` (`/events`, `/events/:id`, `/events/recurring`, `/events/:eventId/participants/:participantId`, `/events/:eventId/attendance/:participantId`, `/stats`).

## Administração e relatórios

- **Dashboard**: `/dashboard/stats`, `/dashboard/recent-activities`, `/dashboard/activities`, `/dashboard/tasks`, `/dashboard/notifications`, `/dashboard/notifications/:id/read`, `/dashboard/notifications/mark-all-read`, `/dashboard/quick-access`.
- **Relatórios**: `/relatorios` com sub-rotas para beneficiárias, oficinas, projetos, participação, consolidado e gestão de templates (`/templates`, `/templates/:id`, `/export/:id`).
- **Auditoria**: `/auditoria` (lista paginada) e `/auditoria/export` (CSV).
- **Configurações globais e RBAC**: `/configuracoes` com rotas para preferências do sistema, usuários, redefinição de senha administrativa e gestão de permissões/papéis.
- **Organizações**: CRUD em `/organizacoes` para entidades parceiras.

## Utilidades

- **Healthcheck**: `/health`, `/health/db`, `/health/resources`.
- **Upload utilitário**: `/upload/test`, `/upload` (upload de arquivo genérico) e `/upload/files/:filename`.
- **Validações**: `/validation/cpf`, `/validation/email`, `/validation/telefone`, `/validation/beneficiarias`.

## Comunicação com a equipe

- Documentação revisada em 28/09/2025 com inventário automatizado e alinhamento de endpoints ativos.
- Novos TODOs registrados em [`docs/api/TODO.md`](./TODO.md) para implementar fluxos prioritários (ex.: recuperação de senha e endpoints de analytics).

Divulgue estas mudanças no canal interno #tech-move-marias para garantir que frontend, QA e dados atualizem seus consumidores da API.
