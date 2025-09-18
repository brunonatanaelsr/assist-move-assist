# Guia Completo para Rodar o Assist Move Assist

Este documento descreve, passo a passo, como preparar o ambiente, configurar as variáveis de ambiente e executar o Assist Move Assist tanto com Docker Compose (fluxo recomendado) quanto manualmente. Todas as instruções consideram um ambiente local de desenvolvimento.

## Visão Geral da Aplicação

O projeto é composto por quatro camadas principais:

- **Frontend**: Aplicação React 18 + Vite localizada na raiz do repositório (`src/`).
- **Backend**: API Express com TypeScript em `backend/`, utilizando PostgreSQL puro para persistência.
- **PostgreSQL**: Banco relacional que armazena dados de beneficiárias, projetos e auditoria.
- **Redis**: Cache e camada de sessão usada para filas, rate limiting e notificações em tempo real.

Os serviços se comunicam via HTTP (`/api`) e WebSocket (`/socket.io`).

## Pré-requisitos

Instale ou disponha dos seguintes componentes antes de iniciar:

- [Node.js 20+](https://nodejs.org/) (acompanha `npm`).
- [Docker Desktop](https://www.docker.com/products/docker-desktop) ou `docker`/`docker compose` em linha de comando.
- [PostgreSQL 15+](https://www.postgresql.org/) e [Redis 7+](https://redis.io/) se optar por executar sem Docker.
- Git para clonar o repositório.

> ⚠️ Todos os comandos a seguir assumem que você está na raiz do projeto (`assist-move-assist/`). Ajuste caminhos conforme necessário.

## Configuração de Variáveis de Ambiente

O repositório fornece arquivos de exemplo que devem ser copiados e ajustados para o ambiente local.

### Frontend (`.env.local`)

```bash
cp .env.example .env.local
```

Campos mais importantes:

```env
VITE_API_BASE_URL=http://localhost:4000 # URL da API em desenvolvimento
VITE_WS_URL=ws://localhost:4000        # Endpoint do WebSocket
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=ws://localhost:4000
```

Se estiver usando Docker Compose, o backend expõe a porta `3000`. Nesse caso, ajuste para `http://localhost:3000`.

### Backend (`backend/.env`)

```bash
cd backend
cp .env.example .env
```

Edite os seguintes valores para corresponder ao seu ambiente:

```env
# Porta padrão da API
PORT=4000

# Configuração do banco
DATABASE_URL=postgresql://usuario:senha@localhost:5432/assist_db
DB_HOST=localhost
DB_PORT=5432
DB_NAME=assist_db
DB_USER=usuario
DB_PASSWORD=senha

# Redis
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT (use valores fortes em produção)
JWT_SECRET=troque-por-um-segredo-seguro
JWT_REFRESH_SECRET=troque-outro-segredo
```

Quando executar via Docker Compose, os arquivos `.env` podem permanecer com os valores padrão porque o Compose exporta as variáveis necessárias para cada serviço.

## Execução com Docker Compose (Fluxo Recomendado)

1. **Copie os arquivos `.env`** (passo descrito acima). Volte para a raiz do repositório após configurar o backend.

2. **Construa (opcional) e suba os serviços**:
   ```bash
   docker compose up -d --build
   ```
   Este comando inicia PostgreSQL (`5432`), Redis (`6379`), backend (`3000`) e frontend (`5173`).

3. **Aplique migrações e seeds** (executado dentro do contêiner do backend):
   ```bash
   docker compose exec backend npm run migrate
   ```
   O script cria a tabela de controle de migrações, aplica os arquivos SQL em `backend/src/database/migrations` e chama `scripts/create-initial-data.js` para inserir usuários padrão.

4. **Acompanhe os logs (opcional)**:
   ```bash
   docker compose logs -f backend
   docker compose logs -f frontend
   ```

5. **Acesse a aplicação**:
   - Frontend: [http://localhost:5173](http://localhost:5173)
   - API REST: [http://localhost:3000/api](http://localhost:3000/api)
   - WebSocket: `ws://localhost:3000/socket.io`

6. **Encerrar o ambiente** quando terminar:
   ```bash
   docker compose down
   ```
   Use `docker compose down -v` se quiser remover volumes (banco/redis) e recomeçar do zero.

## Execução Manual (sem Docker)

1. **Prepare PostgreSQL e Redis**:
   - Utilize instalações locais ou contêineres individuais (ex.: `docker run --name assist-postgres -e POSTGRES_PASSWORD=assist -p 5432:5432 -d postgres:16`).
   - Garanta que ambos os serviços estejam acessíveis via `localhost`.

2. **Instale as dependências**:
   ```bash
   # Na raiz (frontend)
   npm install

   # Backend
   cd backend
   npm install
   ```

3. **Configure os arquivos `.env`** conforme descrito anteriormente e certifique-se de que `DB_HOST`, `DB_PORT`, `REDIS_HOST` e `REDIS_PORT` apontem para seus serviços.

4. **Crie o banco de dados (caso ainda não exista)**:
   ```bash
   createdb assist_db
   ```
   Ajuste o nome do banco se alterou `DB_NAME`.

5. **Execute migrações e seeds**:
   ```bash
   cd backend
   npm run migrate
   ```
   O script usa `psql` quando disponível; caso contrário, executa `scripts/migrate-node.js`. Ao final, `scripts/create-initial-data.js` insere dados básicos.

6. **Inicie o backend** (em um terminal):
   ```bash
   cd backend
   npm run dev
   ```
   A API sobe na porta definida por `PORT` (padrão `4000`).

7. **Inicie o frontend** (em outro terminal):
   ```bash
   npm run dev
   ```
   O Vite expõe a UI em [http://localhost:5173](http://localhost:5173). Certifique-se de que `VITE_API_BASE_URL` aponte para a API (`http://localhost:4000` ou porta configurada).

8. **Parar os serviços**:
   - Encerre os processos com `Ctrl+C` em cada terminal.
   - Opcional: pare Postgres/Redis (`docker stop assist-postgres assist-redis`).

## Usuários de Desenvolvimento

O seed padrão cria contas documentadas em [`docs/TEST_CREDENTIALS.md`](TEST_CREDENTIALS.md). Principais acessos:

| Perfil      | E-mail                     | Senha           |
| ----------- | -------------------------- | --------------- |
| Superadmin  | `superadmin@example.com`   | `ChangeMe!123`  |
| Admin       | `admin@example.com`        | `ChangeMe!123`  |
| Usuário E2E | `e2e@assist.local`         | `e2e_password`  |

As variáveis `SUPERADMIN_*`, `ADMIN_*` e `E2E_TEST_*` podem personalizar esses valores ao usar Docker Compose ou executar `scripts/create-initial-data.js` manualmente.

## Scripts e Testes Úteis

Execute os comandos abaixo na raiz do repositório, salvo indicação diferente:

```bash
npm run dev            # Frontend em modo desenvolvimento (porta 5173)
npm run build          # Build de produção do frontend
npm run preview        # Preview do build em http://localhost:4173
npm run lint           # ESLint
npm run type-check     # Verificação de tipos (TypeScript)
npm run test           # Testes unitários do frontend (Vitest)
npm run test:e2e       # Testes E2E (Playwright)

cd backend
npm run dev            # Backend com reload
npm run build          # Transpila para dist/
npm test               # Testes unitários do backend (Jest)
npm run test:integration # Testes de integração com Testcontainers
npm run migrate        # Executa migrações + seed inicial
npm run seed           # Reexecuta apenas o seed inicial
```

Para rodar o fluxo E2E completo (infraestrutura + testes), utilize o script automatizado:

```bash
npm run test:e2e:local
```

Ele sobe os contêineres necessários, roda migrações, builda o frontend em modo `e2e` e executa os testes Playwright.

## Solução de Problemas

- **Portas em uso**: ajuste `PORT` (backend) e/ou `VITE_PORT` (frontend) nos `.env` e reinicie os processos.
- **Migrações falhando**: confirme as variáveis do banco em `backend/.env` e verifique se o usuário informado tem permissão. Rode `backend/scripts/check-database.sh` para validar a conexão.
- **Seeds não criaram usuários**: reexecute `npm run seed` dentro de `backend/` após confirmar que o banco está migrado.
- **Ambiente Docker inconsistente**: encerre com `docker compose down -v` e rode novamente o passo de migrações.

Com essas etapas, o Assist Move Assist deve estar pronto para uso em qualquer máquina local.
