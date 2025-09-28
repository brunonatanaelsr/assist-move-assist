# Backlog de Endpoints Prioritários

> Atualizado em 28/09/2025.

- [ ] **Fluxo de recuperação de senha**
  - Endpoints sugeridos: `POST /auth/forgot-password`, `POST /auth/reset-password`.
  - Responsável sugerido: squad de identidade.
  - Ação: abrir tarefa no Jira (`MM-API`) descrevendo requisitos de segurança (tokens de uso único, expiração de 15 min, rate limit).
- [ ] **Endpoints de analytics unificados**
  - Substituir chamadas fragmentadas do dashboard por rotas dedicadas (`GET /analytics/dashboard`, etc.).
  - Dependência: definir contratos de dados com equipe de dados.
  - Ação: abrir tarefa para consolidar consultas SQL e cache em Redis.
- [ ] **Publicação do plano de ação**
  - Criar rotas para `/plano-acao` (listar, detalhar, criar, atualizar) alinhadas com o formulário existente.
  - Observação: já existe `apps/backend/src/routes/planoAcao.routes.ts`, porém não está registrado em `api.ts`.
  - Ação: avaliar escopo com squad de acompanhamento e só expor depois de cobrir regras de permissão.
