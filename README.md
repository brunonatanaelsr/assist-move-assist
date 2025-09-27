# Assist Move Assist

Sistema completo de gestão para institutos sociais com acompanhamento de beneficiárias, administração de oficinas/projetos, painel analítico e comunicação interna em tempo real. A stack é composta por **React 18 + Vite** no frontend e **Node.js/Express + PostgreSQL** no backend, com Redis para cache, filas e controle de permissões.

## Sumário

- [Visão Geral](#visão-geral)
- [Estrutura de Pastas](#estrutura-de-pastas)
- [Requisitos](#requisitos)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Fluxos de Execução](#fluxos-de-execução)
  - [1. Stack completa via Docker Compose](#1-stack-completa-via-docker-compose)
  - [2. Desenvolvimento local (Node + Docker para infraestrutura)](#2-desenvolvimento-local-node--docker-para-infraestrutura)
  - [3. GitHub Codespaces](#3-github-codespaces)
- [Portas e serviços](#portas-e-serviços)
- [Scripts úteis](#scripts-úteis)
- [Testes](#testes)
- [Solução de problemas](#solução-de-problemas)
- [Documentação complementar](#documentação-complementar)

## Visão Geral

- **Beneficiárias**: cadastro, histórico, exportação de relatórios.
- **Projetos e Oficinas**: planejamento, presença e dashboards.
- **Comunicação**: feed colaborativo, chat e notificações (WebSocket).
- **Segurança**: RBAC granular, auditoria, rotinas de smoke tests.

## Estrutura de Pastas

```
assist-move-assist/
├── apps/                  # Aplicações principais
│   ├── frontend/          # Frontend React + Vite + Tailwind
│   │   ├── src/          # Código-fonte do frontend
│   │   └── public/       # Assets estáticos
│   └── backend/          # API Express (TypeScript)
│       ├── src/          # Código-fonte do backend
│       ├── scripts/      # Migrações, seeds e utilitários
│       └── src/database/migrations/ # Migrações SQL versionadas
├── scripts/              # Automatizações (deploy, e2e, codespaces, etc.)
├── docs/                 # Guias complementares (deploy, API, testes)
└── docker-compose*.yml   # Orquestração Docker dev/prod
```

## Requisitos

| Ferramenta       | Versão recomendada     | Observações                                          |
| ---------------- | ---------------------- | ---------------------------------------------------- |
| Node.js          | 20.x                   | use `nvm install 20 && nvm use 20`                   |
| npm              | 10.x                   | acompanha o Node 20                                  |
| Docker + Compose | Docker 24+, Compose V2 | necessário para Postgres/Redis (local ou Codespaces) |
| Git              | 2.40+                  | versionamento                                        |
| `gh` (opcional)  | 2.0+                   | usado pelo script de Codespaces para liberar portas  |

> Instale também **psql** e **redis-cli** se desejar administrar bancos manualmente.

## Variáveis de Ambiente

1. Copie os templates para arquivos locais:
   ```bash
    cp .env.example .env.local
    cp apps/backend/.env.example apps/backend/.env
   ```
2. Ajuste credenciais conforme sua infraestrutura. Para desenvolvimento padrão, mantenha os valores sugeridos:

   **Frontend (`.env.local`)**

   ```env
   APP_URL=http://localhost:5173
   VITE_API_BASE_URL=http://localhost:3000/api
   VITE_WS_URL=ws://localhost:3000
   ```

    **Backend (`apps/backend/.env`)**

   ```env
   PORT=3000
   POSTGRES_HOST=localhost
   POSTGRES_USER=assistmove
   POSTGRES_PASSWORD=assistmove123
   POSTGRES_DB=assist_move_assist
   # DATABASE_URL=postgresql://assistmove:assistmove123@localhost:5432/assist_move_assist # opcional (scripts/e2e)
   REDIS_HOST=127.0.0.1
   REDIS_PORT=6379
  CORS_ORIGIN=http://localhost:5173
  ```

   > Para liberar múltiplos frontends informe uma lista separada por vírgulas, por exemplo:

   ```env
   CORS_ORIGIN=http://localhost:5173,http://localhost:4173
   ```

3. Para ambientes diferentes, mantenha arquivos separados e utilize `ENV_FILE` ao iniciar a API (`ENV_FILE=.env.staging npm --prefix apps/backend run start`).

## Fluxos de Execução

### 1. Stack completa via Docker Compose

Ideal para subir tudo (frontend, backend, Postgres e Redis) com um comando.

```bash
docker compose up -d
```

- O build inicial baixa imagens, aplica migrações e executa seeds padrão.
- Acesse:
  - Frontend: http://localhost:5173
  - API: http://localhost:3000/api
- Para desligar: `docker compose down` (use `--volumes` para limpar dados locais).

### 2. Desenvolvimento local (Node + Docker para infraestrutura)

1. **Infraestrutura** (Postgres + Redis):
   ```bash
   docker compose up -d postgres redis
   ```
2. **Instalar dependências**:
   ```bash
    npm install
    npm --prefix apps/backend install
   ```
3. **Aplicar migrações + seeds** (usa `apps/backend/src/database/migrations`):
   ```bash
    npm --prefix apps/backend run migrate:node
   ```
4. **Iniciar backend**:
   ```bash
    (cd apps/backend && npm run dev)
   ```
5. **Iniciar frontend** (em outro terminal):
   ```bash
   npm run dev
   ```
6. Abrir http://localhost:5173 e autenticar com as credenciais de `docs/TEST_CREDENTIALS.md`.

### 3. GitHub Codespaces

O script `scripts/codespace-dev.sh` automatiza toda a configuração:

```bash
bash scripts/codespace-dev.sh
```

Ele executa as etapas abaixo:

- cria `.env.local` e `apps/backend/.env` se não existirem;
- instala dependências front/back;
- inicia Postgres + Redis via Docker e aguarda o `pg_isready` responder;
- aplica migrações (com seed inicial);
- libera as portas 3000 e 5173 via `gh codespace ports visibility` (quando possível);
- sobe backend e frontend no mesmo terminal (Ctrl+C encerra ambos e realiza limpeza).

> Dica: a URL pública gerada pelo Codespaces segue o padrão `https://3000-${CODESPACE_NAME}.app.github.dev`.

## Portas e serviços

| Serviço    | Porta | Observação                         |
| ---------- | ----- | ---------------------------------- |
| Frontend   | 5173  | Vite Dev Server (`npm run dev`)    |
| API        | 3000  | Express + WebSocket                |
| PostgreSQL | 5432  | Base `assist_move_assist` (Docker) |
| Redis      | 6379  | Cache e permissões                 |

## Scripts úteis

```bash
npm run dev                 # Frontend em modo desenvolvimento
npm run build               # Build do frontend
npm run preview             # Servir build gerado
npm run lint                # ESLint + Prettier (check)
npm run type-check          # TypeScript sem emitir arquivos
npm run test                # Testes de frontend (Vitest)
npm --prefix apps/backend run dev        # API em watch mode
npm --prefix apps/backend run migrate:node # Migrações + seed automáticos
npm --prefix apps/backend run test       # Testes unitários backend
npm run test:e2e            # Playwright (necessita API ativa)
```

## Testes

- **Frontend**: `npm run test` (Vitest) ou `npm run test:watch`.
- **Backend**: `npm --prefix apps/backend run test` (Jest).
- **Integração**: `npm --prefix apps/backend run test:integration` (usa Testcontainers, requer Docker).
- **End-to-End**: `npm run test:e2e` (Playwright) — utilize `scripts/run-e2e-local.sh` para o fluxo completo com Docker.

Credenciais padrão para automação e QA estão documentadas em [`docs/TEST_CREDENTIALS.md`](docs/TEST_CREDENTIALS.md).

## Solução de problemas

| Sintoma                             | Causa provável                            | Como resolver                                                                                                               |
| ----------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `ECONNREFUSED` ao iniciar a API     | Postgres/Redis não estão em execução      | Rode `docker compose ps` e garanta que `postgres` e `redis` estão `Up`; reinicie com `docker compose up -d postgres redis`. |
| Frontend mostra erro 401 após login | Seeds não executaram ou JWT desatualizado | Reaplique `npm --prefix apps/backend run migrate:node` e limpe cookies/localStorage.                                             |
| Porta 5173 ou 3000 indisponível     | Outro processo usando as portas           | Ajuste `PORT` em `apps/backend/.env` ou execute `npm run dev -- --port 5174`.                                                    |
| Playwright falha no Codespaces      | Browsers não instalados                   | Execute `npx playwright install --with-deps chromium` antes dos testes.                                                     |

## Documentação complementar

- [Guia de Execução em Desenvolvimento](docs/GUIA_EXECUCAO_DESENVOLVIMENTO.md)
- [Guia de Deploy](docs/deployment/README.md)
- [Guia de RBAC/Administração](README-ADMIN.md)
- [Credenciais de Teste](docs/TEST_CREDENTIALS.md)
- Scripts e utilidades adicionais estão descritos na pasta [`scripts/`](scripts).

---

> Contribuições são bem-vindas! Certifique-se de executar linters e testes antes de abrir pull requests.
