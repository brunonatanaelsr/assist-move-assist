# API Documentation - Move Marias

## Base URL

A API pública é servida sob o caminho base `/api`. Em produção utilize `https://{domínio}/api` e concatene os endpoints listados abaixo.

> **Referência de validação**: todos os esquemas oficiais utilizados pelas rotas estão centralizados em `apps/backend/src/validation/schemas`. Consulte esses arquivos ao integrar novos campos ou revisar contratos.

## Autenticação

- Utilize `Authorization: Bearer <token>` para todos os endpoints marcados com **Bearer JWT**.
- Os perfis citados refletem os _middlewares_ de função (`requireProfissional`, `requireGestor`).
- Permissões adicionais representam as _claims_ verificadas pelo middleware `authorize()`.

## Sistema

- `GET /api` — Retorna metadados da API e a lista de recursos principais. _(Autenticação: nenhuma; Permissões: —)_
- `GET /api/health` — Verificação de saúde básica do serviço. _(Autenticação: nenhuma; Permissões: —)_
- `GET /api/health/db` — Testa a conexão com o banco de dados. _(Autenticação: nenhuma; Permissões: —)_
- `GET /api/health/resources` — Expõe uso de CPU/memória para diagnósticos. _(Autenticação: nenhuma; Permissões: —)_

## Autenticação

- `POST /api/auth/login` — Inicia sessão e retorna token JWT. _(Autenticação: nenhuma; Permissões: —)_
- `POST /api/auth/register` — Cria um usuário e inicia sessão. _(Autenticação: nenhuma; Permissões: —)_
- `POST /api/auth/logout` — Encerra a sessão atual limpando o cookie/token. _(Autenticação: Bearer JWT; Permissões: —)_
- `POST /api/auth/refresh` — Renova o token de acesso do usuário autenticado. _(Autenticação: Bearer JWT; Permissões: —)_
- `POST /api/auth/refresh-token` — Alias para renovar o token de acesso. _(Autenticação: Bearer JWT; Permissões: —)_
- `GET /api/auth/profile` — Retorna o perfil detalhado do usuário autenticado. _(Autenticação: Bearer JWT; Permissões: —)_
- `GET /api/auth/me` — Retorna um resumo do usuário autenticado. _(Autenticação: Bearer JWT; Permissões: —)_
- `PUT /api/auth/profile` — Atualiza os dados básicos de perfil. _(Autenticação: Bearer JWT; Permissões: —)_
- `POST /api/auth/change-password` — Atualiza a senha do usuário autenticado. _(Autenticação: Bearer JWT; Permissões: —)_

## Beneficiárias

- `GET /api/beneficiarias` — Lista beneficiárias ativas de forma paginada. _(Autenticação: Bearer JWT; Permissões: beneficiarias.ler)_
- `GET /api/beneficiarias/:id` — Recupera os detalhes de uma beneficiária. _(Autenticação: Bearer JWT; Permissões: beneficiarias.ler)_
- `GET /api/beneficiarias/:id/resumo` — Retorna resumo consolidado (dados, atendimentos, estatísticas). _(Autenticação: Bearer JWT; Permissões: —)_
- `GET /api/beneficiarias/:id/atividades` — Lista atividades recentes associadas à beneficiária. _(Autenticação: Bearer JWT; Permissões: —)_
- `POST /api/beneficiarias` — Cadastra nova beneficiária. _(Autenticação: Bearer JWT (perfil profissional); Permissões: beneficiarias.criar)_
- `PUT /api/beneficiarias/:id` — Atualiza cadastro de beneficiária. _(Autenticação: Bearer JWT (perfil profissional); Permissões: beneficiarias.editar)_
- `DELETE /api/beneficiarias/:id` — Arquiva uma beneficiária. _(Autenticação: Bearer JWT (perfil profissional); Permissões: beneficiarias.excluir)_

## Validações auxiliares

- `POST /api/validation/cpf` — Valida formato e unicidade de CPF. _(Autenticação: nenhuma; Permissões: —)_
- `POST /api/validation/email` — Valida e-mail de beneficiária. _(Autenticação: nenhuma; Permissões: —)_
- `POST /api/validation/telefone` — Valida telefone informado. _(Autenticação: nenhuma; Permissões: —)_
- `GET /api/validation/beneficiarias` — Busca beneficiárias por filtros básicos. _(Autenticação: nenhuma; Permissões: —)_

## Projetos

- `GET /api/projetos` — Lista projetos ativos. _(Autenticação: Bearer JWT; Permissões: projetos.ler)_
- `GET /api/projetos/:id` — Recupera um projeto específico. _(Autenticação: Bearer JWT; Permissões: projetos.ler)_
- `POST /api/projetos` — Cria novo projeto. _(Autenticação: Bearer JWT; Permissões: projetos.criar)_
- `PUT /api/projetos/:id` — Atualiza dados do projeto. _(Autenticação: Bearer JWT; Permissões: projetos.editar)_
- `DELETE /api/projetos/:id` — Desativa um projeto. _(Autenticação: Bearer JWT; Permissões: projetos.excluir)_

## Oficinas

- `GET /api/oficinas` — Lista oficinas cadastradas. _(Autenticação: Bearer JWT; Permissões: oficinas.ler)_
- `GET /api/oficinas/horarios-disponiveis` — Verifica disponibilidade de horários. _(Autenticação: Bearer JWT; Permissões: oficinas.horarios.listar)_
- `POST /api/oficinas/verificar-conflito` — Detecta conflitos de agenda. _(Autenticação: Bearer JWT; Permissões: oficinas.conflito.verificar)_
- `GET /api/oficinas/:id` — Recupera detalhes de uma oficina. _(Autenticação: Bearer JWT; Permissões: oficinas.ler)_
- `POST /api/oficinas` — Cria nova oficina. _(Autenticação: Bearer JWT; Permissões: oficinas.criar)_
- `PUT /api/oficinas/:id` — Atualiza uma oficina existente. _(Autenticação: Bearer JWT; Permissões: oficinas.editar)_
- `DELETE /api/oficinas/:id` — Remove/arquiva uma oficina. _(Autenticação: Bearer JWT; Permissões: oficinas.excluir)_
- `GET /api/oficinas/:id/participantes` — Lista participantes de uma oficina. _(Autenticação: Bearer JWT; Permissões: oficinas.participantes.ver)_
- `POST /api/oficinas/:id/participantes` — Adiciona participante. _(Autenticação: Bearer JWT (perfil gestor); Permissões: oficinas.participantes.adicionar)_
- `DELETE /api/oficinas/:id/participantes/:beneficiariaId` — Remove participante. _(Autenticação: Bearer JWT (perfil gestor); Permissões: oficinas.participantes.remover)_
- `POST /api/oficinas/:id/presencas` — Registra presença da oficina. _(Autenticação: Bearer JWT; Permissões: oficinas.presencas.registrar)_
- `GET /api/oficinas/:id/presencas` — Consulta presenças registradas. _(Autenticação: Bearer JWT; Permissões: oficinas.presencas.listar)_
- `GET /api/oficinas/:id/resumo` — Traz resumo consolidado da oficina. _(Autenticação: Bearer JWT; Permissões: —)_
- `GET /api/oficinas/:id/relatorio-presencas` — Gera relatório/export de presenças. _(Autenticação: Bearer JWT; Permissões: oficinas.relatorio.exportar)_

## Participações em oficinas

- `GET /api/participacoes` — Lista participações com filtros. _(Autenticação: Bearer JWT; Permissões: —)_
- `POST /api/participacoes` — Cria participação em oficina. _(Autenticação: Bearer JWT; Permissões: —)_
- `PATCH /api/participacoes/:id` — Atualiza status/dados da participação. _(Autenticação: Bearer JWT; Permissões: —)_
- `DELETE /api/participacoes/:id` — Remove participação. _(Autenticação: Bearer JWT; Permissões: —)_
- `POST /api/participacoes/:id/presenca` — Registra presença pontual. _(Autenticação: Bearer JWT; Permissões: —)_
- `POST /api/participacoes/:id/certificado` — Emite certificado da participação. _(Autenticação: Bearer JWT; Permissões: —)_

## Matrículas em projetos

- `POST /api/matriculas-projetos/verificar-elegibilidade` — Valida se beneficiária pode ser matriculada. _(Autenticação: Bearer JWT; Permissões: —)_
- `GET /api/matriculas-projetos` — Lista matrículas registradas. _(Autenticação: Bearer JWT; Permissões: —)_
- `POST /api/matriculas-projetos` — Cria nova matrícula. _(Autenticação: Bearer JWT; Permissões: —)_
- `GET /api/matriculas-projetos/:id` — Detalha matrícula específica. _(Autenticação: Bearer JWT; Permissões: —)_
- `PATCH /api/matriculas-projetos/:id` — Atualiza matrícula. _(Autenticação: Bearer JWT; Permissões: —)_

## Feed comunitário

- `POST /api/feed/upload-image` — Faz upload autenticado de imagem para o feed. _(Autenticação: Bearer JWT; Permissões: —)_
- `GET /api/feed/images/:filename` — Recupera imagem enviada ao feed. _(Autenticação: Bearer JWT; Permissões: —)_
- `GET /api/feed` — Lista posts com paginação e filtros. _(Autenticação: Bearer JWT; Permissões: —)_
- `GET /api/feed/:id` — Recupera um post específico. _(Autenticação: Bearer JWT; Permissões: —)_
- `POST /api/feed` — Cria novo post. _(Autenticação: Bearer JWT; Permissões: —)_
- `POST /api/feed/:id/curtir` — Alterna curtida do usuário no post. _(Autenticação: Bearer JWT; Permissões: —)_
- `POST /api/feed/:id/compartilhar` — Registra compartilhamento do post. _(Autenticação: Bearer JWT; Permissões: —)_
- `GET /api/feed/stats/summary` — Estatísticas resumidas do feed. _(Autenticação: Bearer JWT; Permissões: —)_
- `GET /api/feed/:postId/comentarios` — Lista comentários de um post. _(Autenticação: Bearer JWT; Permissões: —)_
- `POST /api/feed/:postId/comentarios` — Adiciona comentário ao post. _(Autenticação: Bearer JWT; Permissões: —)_
- `PUT /api/feed/comentarios/:id` — Atualiza comentário existente. _(Autenticação: Bearer JWT; Permissões: —)_
- `DELETE /api/feed/comentarios/:id` — Remove comentário. _(Autenticação: Bearer JWT; Permissões: —)_
- `DELETE /api/feed/:id` — Remove post (soft delete). _(Autenticação: Bearer JWT; Permissões: —)_
- `PUT /api/feed/:id` — Atualiza conteúdo do post. _(Autenticação: Bearer JWT; Permissões: —)_

## Mensageria

- `GET /api/mensagens/usuarios` — Lista usuários disponíveis para conversa. _(Autenticação: Bearer JWT; Permissões: —)_
- `GET /api/mensagens/conversas` — Lista conversas diretas recentes. _(Autenticação: Bearer JWT; Permissões: —)_
- `GET /api/mensagens/conversa/:usuarioId` — Recupera histórico com um usuário. _(Autenticação: Bearer JWT; Permissões: —)_
- `GET /api/mensagens/threads` — Lista threads (diretas, por beneficiária ou projeto). _(Autenticação: Bearer JWT; Permissões: —)_
- `POST /api/mensagens/threads` — Cria nova thread contextual. _(Autenticação: Bearer JWT; Permissões: —)_
- `GET /api/mensagens/threads/:threadId` — Detalha uma thread. _(Autenticação: Bearer JWT; Permissões: —)_
- `GET /api/mensagens/threads/:threadId/mensagens` — Lista mensagens da thread. _(Autenticação: Bearer JWT; Permissões: —)_
- `POST /api/mensagens/threads/:threadId/mensagens` — Envia mensagem em uma thread existente. _(Autenticação: Bearer JWT; Permissões: —)_
- `POST /api/mensagens/enviar` — Envia mensagem direta ou associa a thread existente. _(Autenticação: Bearer JWT; Permissões: —)_
- `PATCH /api/mensagens/:id/lida` — Marca mensagem como lida. _(Autenticação: Bearer JWT; Permissões: —)_
- `DELETE /api/mensagens/:id` — Remove mensagem. _(Autenticação: Bearer JWT; Permissões: —)_
- `GET /api/mensagens/stream` — Assina stream SSE de mensagens. _(Autenticação: Bearer JWT; Permissões: —)_

### Alias de compatibilidade

- `GET /api/messages` — Retorna as mesmas conversas de `GET /api/mensagens/conversas`. _(Autenticação: Bearer JWT; Permissões: —)_

## Grupos de conversa

- `GET /api/grupos` — Lista grupos de mensagens. _(Autenticação: Bearer JWT; Permissões: —)_
- `GET /api/grupos/:id` — Detalha um grupo específico. _(Autenticação: Bearer JWT; Permissões: —)_
- `GET /api/grupos/:id/mensagens` — Lista mensagens do grupo. _(Autenticação: Bearer JWT; Permissões: —)_
- `GET /api/grupos/:id/membros` — Lista membros do grupo. _(Autenticação: Bearer JWT; Permissões: —)_
- `POST /api/grupos` — Cria grupo de mensagens. _(Autenticação: Bearer JWT; Permissões: —)_
- `PUT /api/grupos/:id` — Atualiza dados do grupo. _(Autenticação: Bearer JWT; Permissões: —)_
- `DELETE /api/grupos/:id` — Remove grupo. _(Autenticação: Bearer JWT; Permissões: —)_
- `POST /api/grupos/:id/membros` — Adiciona membro ao grupo. _(Autenticação: Bearer JWT; Permissões: —)_
- `DELETE /api/grupos/:id/membros/:usuarioId` — Remove membro do grupo. _(Autenticação: Bearer JWT; Permissões: —)_

## Notificações

- `POST /api/notifications/push-subscription` — Salva inscrição para push notifications. _(Autenticação: Bearer JWT; Permissões: —)_
- `GET /api/notifications` — Lista notificações do usuário. _(Autenticação: Bearer JWT; Permissões: —)_
- `GET /api/notifications/unread/count` — Conta notificações não lidas. _(Autenticação: Bearer JWT; Permissões: —)_
- `PATCH /api/notifications/:id` — Atualiza status (lida) de uma notificação. _(Autenticação: Bearer JWT; Permissões: —)_
- `DELETE /api/notifications/:id` — Remove uma notificação. _(Autenticação: Bearer JWT; Permissões: —)_
- `POST /api/notifications/mark-all-read` — Marca todas as notificações como lidas. _(Autenticação: Bearer JWT; Permissões: —)_
- `GET /api/notifications/preferences` — Consulta preferências de notificação. _(Autenticação: Bearer JWT; Permissões: —)_
- `PUT /api/notifications/preferences` — Atualiza preferências de notificação. _(Autenticação: Bearer JWT; Permissões: —)_
- `POST /api/notifications` — Cria notificação manual direcionada. _(Autenticação: Bearer JWT; Permissões: —)_

## Calendário

- `GET /api/calendar/events` — Lista eventos do calendário. _(Autenticação: Bearer JWT; Permissões: —)_
- `GET /api/calendar/events/:id` — Detalha evento específico. _(Autenticação: Bearer JWT; Permissões: —)_
- `POST /api/calendar/events` — Cria evento único. _(Autenticação: Bearer JWT; Permissões: —)_
- `PUT /api/calendar/events/:id` — Atualiza evento existente. _(Autenticação: Bearer JWT; Permissões: —)_
- `DELETE /api/calendar/events/:id` — Remove evento. _(Autenticação: Bearer JWT; Permissões: —)_
- `POST /api/calendar/events/recurring` — Cria série recorrente de eventos. _(Autenticação: Bearer JWT; Permissões: —)_
- `PUT /api/calendar/events/:eventId/participants/:participantId` — Atualiza participação em evento. _(Autenticação: Bearer JWT; Permissões: —)_
- `PUT /api/calendar/events/:eventId/attendance/:participantId` — Registra presença em evento. _(Autenticação: Bearer JWT; Permissões: —)_
- `GET /api/calendar/stats` — Estatísticas gerais do calendário. _(Autenticação: Bearer JWT; Permissões: —)_

## Formulários

### Formulários específicos

- `POST /api/formularios/anamnese` — Registra nova anamnese social. _(Autenticação: Bearer JWT; Permissões: —)_
- `GET /api/formularios/anamnese/:id` — Consulta anamnese. _(Autenticação: Bearer JWT; Permissões: —)_
- `GET /api/formularios/anamnese/:id/pdf` — Gera PDF da anamnese. _(Autenticação: Bearer JWT; Permissões: —)_
- `PUT /api/formularios/anamnese/:id` — Atualiza anamnese existente. _(Autenticação: Bearer JWT; Permissões: —)_
- `POST /api/formularios/ficha-evolucao` — Cria ficha de evolução. _(Autenticação: Bearer JWT; Permissões: —)_
- `GET /api/formularios/ficha-evolucao/:id` — Consulta ficha de evolução. _(Autenticação: Bearer JWT; Permissões: —)_
- `GET /api/formularios/ficha-evolucao/:id/pdf` — Gera PDF da ficha de evolução. _(Autenticação: Bearer JWT; Permissões: —)_
- `GET /api/formularios/ficha-evolucao/beneficiaria/:beneficiariaId` — Lista fichas de uma beneficiária. _(Autenticação: Bearer JWT; Permissões: —)_
- `PUT /api/formularios/ficha-evolucao/:id` — Atualiza ficha de evolução. _(Autenticação: Bearer JWT; Permissões: —)_
- `POST /api/formularios/termos-consentimento` — Registra termo de consentimento. _(Autenticação: Bearer JWT; Permissões: —)_
- `GET /api/formularios/termos-consentimento/beneficiaria/:beneficiariaId` — Lista termos de uma beneficiária. _(Autenticação: Bearer JWT; Permissões: —)_
- `GET /api/formularios/termos-consentimento/:id` — Consulta termo específico. _(Autenticação: Bearer JWT; Permissões: —)_
- `GET /api/formularios/termos-consentimento/:id/pdf` — Gera PDF do termo. _(Autenticação: Bearer JWT; Permissões: —)_
- `PATCH /api/formularios/termos-consentimento/:id/revogacao` — Registra revogação do termo. _(Autenticação: Bearer JWT; Permissões: —)_
- `PUT /api/formularios/termos-consentimento/:id` — Atualiza termo de consentimento. _(Autenticação: Bearer JWT; Permissões: —)_
- `POST /api/formularios/visao-holistica` — Cria avaliação de visão holística. _(Autenticação: Bearer JWT; Permissões: —)_
- `POST /api/formularios/roda-vida` — Cria avaliação da roda da vida. _(Autenticação: Bearer JWT; Permissões: —)_
- `GET /api/formularios/roda-vida/:id` — Consulta avaliação da roda da vida. _(Autenticação: Bearer JWT; Permissões: —)_
- `PUT /api/formularios/roda-vida/:id` — Atualiza avaliação da roda da vida. _(Autenticação: Bearer JWT; Permissões: —)_
- `GET /api/formularios/visao-holistica/:id` — Consulta visão holística. _(Autenticação: Bearer JWT; Permissões: —)_
- `GET /api/formularios/visao-holistica/:id/pdf` — Gera PDF da visão holística. _(Autenticação: Bearer JWT; Permissões: —)_
- `GET /api/formularios/ficha-evolucao/beneficiaria/:beneficiariaId/series` — Dados históricos da ficha de evolução. _(Autenticação: Bearer JWT; Permissões: —)_
- `GET /api/formularios/visao-holistica/beneficiaria/:beneficiariaId` — Lista visões holísticas de uma beneficiária. _(Autenticação: Bearer JWT; Permissões: —)_
- `PUT /api/formularios/visao-holistica/:id` — Atualiza visão holística. _(Autenticação: Bearer JWT; Permissões: —)_

### Operações genéricas

- `GET /api/formularios` — Lista formulários registrados (visão geral). _(Autenticação: Bearer JWT; Permissões: —)_
- `GET /api/formularios/beneficiaria/:beneficiariaId` — Consulta todos os formulários de uma beneficiária. _(Autenticação: Bearer JWT; Permissões: —)_
- `POST /api/formularios/:tipo` — Cria formulário genérico por tipo. _(Autenticação: Bearer JWT; Permissões: —)_
- `GET /api/formularios/:tipo/:id` — Consulta formulário genérico. _(Autenticação: Bearer JWT; Permissões: —)_
- `PUT /api/formularios/:tipo/:id` — Atualiza formulário genérico. _(Autenticação: Bearer JWT; Permissões: —)_
- `GET /api/formularios/:tipo/:id/pdf` — Exporta formulário genérico em PDF. _(Autenticação: Bearer JWT; Permissões: —)_
- `DELETE /api/formularios/:id` — Remove formulário genérico. _(Autenticação: Bearer JWT; Permissões: —)_

## Declarações

- `POST /api/declaracoes/gerar` — Gera declaração personalizada. _(Autenticação: Bearer JWT; Permissões: —)_
- `GET /api/declaracoes/beneficiaria/:id` — Lista declarações de uma beneficiária. _(Autenticação: Bearer JWT; Permissões: —)_
- `GET /api/declaracoes/:id` — Consulta declaração emitida. _(Autenticação: Bearer JWT; Permissões: —)_
- `GET /api/declaracoes/:id/pdf` — Exporta declaração em PDF. _(Autenticação: Bearer JWT; Permissões: —)_

## Recibos

- `POST /api/recibos/gerar` — Gera recibo financeiro. _(Autenticação: Bearer JWT; Permissões: —)_
- `GET /api/recibos/beneficiaria/:id` — Lista recibos de uma beneficiária. _(Autenticação: Bearer JWT; Permissões: —)_
- `GET /api/recibos/:id` — Consulta recibo específico. _(Autenticação: Bearer JWT; Permissões: —)_
- `GET /api/recibos/:id/pdf` — Exporta recibo em PDF. _(Autenticação: Bearer JWT; Permissões: —)_

## Documentos

- `GET /api/documentos/:beneficiariaId` — Lista documentos de uma beneficiária. _(Autenticação: Bearer JWT; Permissões: —)_
- `POST /api/documentos/:beneficiariaId/upload` — Faz upload de documento vinculado. _(Autenticação: Bearer JWT; Permissões: —)_
- `PUT /api/documentos/:documentoId` — Atualiza metadados/arquivo de documento. _(Autenticação: Bearer JWT; Permissões: —)_
- `GET /api/documentos/:documentoId/download` — Baixa documento armazenado. _(Autenticação: Bearer JWT; Permissões: —)_
- `DELETE /api/documentos/:documentoId` — Remove documento. _(Autenticação: Bearer JWT; Permissões: —)_
- `GET /api/documentos/:beneficiariaId/versoes` — Consulta histórico de versões de um documento. _(Autenticação: Bearer JWT; Permissões: —)_

## Uploads utilitários

- `GET /api/upload/test` — Endpoint de diagnóstico do serviço de upload. _(Autenticação: nenhuma; Permissões: —)_
- `POST /api/upload` — Upload genérico de arquivos (imagens/PDF). _(Autenticação: Bearer JWT; Permissões: —)_
- `GET /api/upload/files/:filename` — Recupera arquivo enviado (autenticado). _(Autenticação: Bearer JWT; Permissões: —)_

## Organizações

- `GET /api/organizacoes` — Lista organizações cadastradas. _(Autenticação: Bearer JWT; Permissões: organizacoes.ler)_
- `GET /api/organizacoes/:id` — Detalha organização específica. _(Autenticação: Bearer JWT; Permissões: organizacoes.ler)_
- `POST /api/organizacoes` — Cria nova organização. _(Autenticação: Bearer JWT; Permissões: organizacoes.criar)_
- `PUT /api/organizacoes/:id` — Atualiza organização existente. _(Autenticação: Bearer JWT; Permissões: organizacoes.editar)_
- `DELETE /api/organizacoes/:id` — Remove organização. _(Autenticação: Bearer JWT; Permissões: organizacoes.excluir)_

## Dashboard operacional

- `GET /api/dashboard/stats` — Estatísticas principais para o dashboard. _(Autenticação: Bearer JWT; Permissões: —)_
- `GET /api/dashboard/recent-activities` — Últimas atividades consolidadas. _(Autenticação: Bearer JWT; Permissões: —)_
- `GET /api/dashboard/activities` — Feed detalhado de atividades. _(Autenticação: Bearer JWT; Permissões: —)_
- `GET /api/dashboard/tasks` — Lista de tarefas atribuídas. _(Autenticação: Bearer JWT; Permissões: —)_
- `GET /api/dashboard/notifications` — Notificações voltadas ao dashboard. _(Autenticação: Bearer JWT; Permissões: —)_
- `PUT /api/dashboard/notifications/:id/read` — Marca notificação do dashboard como lida. _(Autenticação: Bearer JWT; Permissões: —)_
- `POST /api/dashboard/notifications/mark-all-read` — Marca todas como lidas. _(Autenticação: Bearer JWT; Permissões: —)_
- `GET /api/dashboard/quick-access` — Retorna atalhos rápidos configurados. _(Autenticação: Bearer JWT; Permissões: —)_

## Relatórios

- `GET /api/relatorios` — Índice de endpoints de relatórios. _(Autenticação: Bearer JWT; Permissões: —)_
- `GET /api/relatorios/beneficiarias` — Relatório consolidado de beneficiárias. _(Autenticação: Bearer JWT; Permissões: relatorios.beneficiarias.gerar)_
- `GET /api/relatorios/oficinas` — Relatório de oficinas. _(Autenticação: Bearer JWT; Permissões: relatorios.oficinas.gerar)_
- `GET /api/relatorios/projetos` — Relatório de projetos. _(Autenticação: Bearer JWT; Permissões: projetos.relatorio.gerar)_
- `GET /api/relatorios/participacao` — Relatório de participações. _(Autenticação: Bearer JWT; Permissões: relatorios.participacao.gerar)_
- `GET /api/relatorios/consolidado` — Relatório consolidado multi-métrica. _(Autenticação: Bearer JWT; Permissões: relatorios.consolidado.gerar)_
- `GET /api/relatorios/templates` — Lista templates customizados. _(Autenticação: Bearer JWT (perfil gestor); Permissões: —)_
- `POST /api/relatorios/templates` — Cria template customizado. _(Autenticação: Bearer JWT (perfil gestor); Permissões: —)_
- `PUT /api/relatorios/templates/:id` — Atualiza template. _(Autenticação: Bearer JWT (perfil gestor); Permissões: —)_
- `DELETE /api/relatorios/templates/:id` — Remove template. _(Autenticação: Bearer JWT (perfil gestor); Permissões: —)_
- `POST /api/relatorios/export/:id` — Exporta template customizado. _(Autenticação: Bearer JWT (perfil gestor); Permissões: —)_

## Auditoria

- `GET /api/auditoria` — Lista eventos de auditoria com filtros. _(Autenticação: Bearer JWT; Permissões: auditoria.ler)_
- `GET /api/auditoria/export` — Exporta registros de auditoria em CSV. _(Autenticação: Bearer JWT; Permissões: auditoria.ler)_

## Configurações e administração

- `GET /api/configuracoes` — Recupera configurações globais. _(Autenticação: Bearer JWT; Permissões: users.manage)_
- `PUT /api/configuracoes` — Atualiza configurações globais. _(Autenticação: Bearer JWT; Permissões: users.manage)_
- `GET /api/configuracoes/usuarios` — Lista usuários administráveis. _(Autenticação: Bearer JWT; Permissões: users.manage)_
- `POST /api/configuracoes/usuarios` — Cria usuário administrativo. _(Autenticação: Bearer JWT; Permissões: users.manage)_
- `PUT /api/configuracoes/usuarios/:id` — Atualiza usuário administrativo. _(Autenticação: Bearer JWT; Permissões: users.manage)_
- `POST /api/configuracoes/usuarios/:id/reset-password` — Reinicia senha de usuário. _(Autenticação: Bearer JWT; Permissões: users.manage)_
- `GET /api/configuracoes/permissions` — Lista permissões disponíveis. _(Autenticação: Bearer JWT; Permissões: roles.manage)_
- `POST /api/configuracoes/permissions` — Registra/atualiza permissões. _(Autenticação: Bearer JWT; Permissões: roles.manage)_
- `GET /api/configuracoes/roles` — Lista papéis (roles) disponíveis. _(Autenticação: Bearer JWT; Permissões: roles.manage)_
- `GET /api/configuracoes/roles/:role/permissions` — Lista permissões atribuídas a um papel. _(Autenticação: Bearer JWT; Permissões: roles.manage)_
- `PUT /api/configuracoes/roles/:role/permissions` — Atualiza permissões de um papel. _(Autenticação: Bearer JWT; Permissões: roles.manage)_
- `GET /api/configuracoes/usuarios/:id/permissions` — Consulta permissões de um usuário. _(Autenticação: Bearer JWT; Permissões: users.manage)_
- `PUT /api/configuracoes/usuarios/:id/permissions` — Atualiza permissões de um usuário. _(Autenticação: Bearer JWT; Permissões: users.manage)_

