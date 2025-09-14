# Assist Move Assist

Sistema de gestão para institutos sociais que auxilia no acompanhamento de beneficiárias, na organização de projetos e na comunicação interna.

## Visão Geral
- Cadastro e acompanhamento de beneficiárias
- Dashboard com métricas e exportação de relatórios (PDF/Excel)
- Feed de comunicação e sistema de mensagens
- Gestão de tarefas, projetos e oficinas

## Requisitos
- Node.js 20+
- npm
- Docker Desktop (recomendado para E2E local e ambiente dev completo)
- PostgreSQL 15+ (se não usar Docker)
- Redis 7 (se não usar Docker)

## Instalação
1. **Clone o repositório**
   ```bash
   git clone https://github.com/brunonatanaelsr/assist-move-assist.git
   cd assist-move-assist
   ```
2. **Instale as dependências**
   ```bash
   # Frontend
   npm install
   # Backend
   cd backend
   npm install
   ```
3. **Configure as variáveis de ambiente**
   ```bash
   # Frontend
   cp .env.example .env.local
   # Backend
   cp backend/.env.example backend/.env
   ```
   Edite os arquivos `.env` com suas configurações:
   ```env
   # Frontend (.env.local)
   # Em desenvolvimento puro (sem Docker), use base absoluta
   VITE_API_BASE_URL=http://127.0.0.1:3000/api
   VITE_WS_URL=ws://127.0.0.1:3000
   
   # Backend (.env)
   PORT=3000
   DATABASE_URL=postgres://user:pass@localhost:5432/assist_move
   REDIS_URL=redis://localhost:6379
   JWT_SECRET=seu_jwt_secret
   UPLOAD_PATH=./uploads
   ENABLE_WS=true
   FRONTEND_URL=http://localhost:8080
   ```
4. **Configure o banco de dados**
   ```bash
   # Criar banco
   createdb assist_move
   
   # Aplicar migrações
   cd backend
   npm run migrate
   ```
5. **Execute o projeto**
   ```bash
   # Terminal 1 (Infra: Postgres e Redis)
   docker-compose up -d
   
   # Terminal 2 (Backend)
   cd backend
   cp .env.example .env   # se ainda não existir
   npm run migrate        # aplica migrações (usa POSTGRES_* do .env)
   npm run dev            # inicia API em http://localhost:3000
   
  # Terminal 3 (Frontend)
  npm run dev            # inicia em http://localhost:5173 (Vite dev)
   ```
   Frontend: [http://localhost:5173](http://localhost:5173)
   Backend: [http://localhost:3000](http://localhost:3000)

## Scripts Úteis
```bash
npm run dev           # Dev (frontend:5173, backend:3000)
npm run build         # Build de produção
npm run preview       # Preview do build (frontend:4173)
npm run lint          # Linter ESLint
npm run type-check    # Verificação de tipos TypeScript
npm test              # Executar testes (frontend)
npm run test:backend  # Testes backend (rodar dentro de /backend)
npm run test:e2e      # Testes E2E (Playwright)
npm run test:e2e:local # E2E completo com Docker local (scripts/run-e2e-local.sh)
```

## Testes

### Unitários
- Frontend: `npm run test:frontend`
- Backend: `cd backend && npm test`

### E2E
Há duas formas de rodar os testes end-to-end (Playwright):

1) Completo com Docker (recomendado)

```bash
# Pré-requisito: Docker Desktop instalado
bash scripts/run-e2e-local.sh
```

O script sobe Postgres/Redis, roda migrações + seeds, inicia a API, builda o frontend (modo e2e), instala browsers e roda Chromium.

2) Somente camada de UI (sem API)

```bash
npm run build -- --mode e2e
npx playwright test --project=chromium -g "deve carregar página inicial"
```
Os testes de fluxo são pulados quando a API não está ativa.

## Arquitetura

### Frontend
- React 18 + TypeScript + Vite
- Tailwind CSS para estilos
- React Query para gerenciamento de estado
- Socket.IO Client para real-time
- Axios para chamadas HTTP
- Código principal em `src/`

### Backend
- Node.js + Express + TypeScript
- PostgreSQL com pg (node-postgres)
- JWT para autenticação
- Socket.IO para real-time
- Multer para uploads
- Winston para logs
- Código em `backend/`

### Banco de Dados
- PostgreSQL 15+
- Migrations SQL nativas
- Triggers para eventos em tempo real
- Full-text search nativo
- Backup automatizado

### Cache (opcional)
- Redis para cache de sessão
- Cache de consultas frequentes
- Armazenamento de notificações offline

Para documentação detalhada consulte:
- [Documentação Técnica](docs/TECHNICAL_DOCUMENTATION.md)
- [Documentação da API](docs/API_DOCUMENTATION.md)
- [Guia de Deploy](docs/deployment/README.md)
- [Banco de Dados](docs/database/)
 - [Guia de Admin (RBAC, permissões e smokes)](README-ADMIN.md)

## Principais Funcionalidades

### Autenticação
- JWT com refresh token
- Middleware de autenticação
- Rate limiting
- Logout em múltiplos dispositivos

### Feed em Tempo Real
- WebSocket via Socket.IO
- Notificações em tempo real
- Indicadores de digitação
- Entrega offline via Redis
  - Chat privado: fila `chat:unread:<userId>`
  - Notificações: fila `unread:<userId>`

### Endpoints do Feed
- `GET /api/feed` — listar posts
- `GET /api/feed/:id` — obter post por ID
- `POST /api/feed` — criar post
- `PUT /api/feed/:id` — atualizar post (autor ou superadmin)
- `DELETE /api/feed/:id` — remover post (soft delete; autor ou superadmin)
- `POST /api/feed/:id/curtir` — alternar curtida (por usuário) e retornar `{ curtidas, liked }`
- `POST /api/feed/:id/compartilhar` — compartilhar post
- `GET /api/feed/:postId/comentarios` — listar comentários do post
- `POST /api/feed/:postId/comentarios` — criar comentário
- `PUT /api/feed/comentarios/:id` — atualizar comentário (autor ou superadmin)
- `DELETE /api/feed/comentarios/:id` — remover comentário (autor ou superadmin)

### Upload de Arquivos
- Gerenciamento local via Multer
- Metadados no PostgreSQL
- Validação de tipos
- Rate limiting por usuário

### Monitoramento
- Logs estruturados (Winston)
- Métricas de performance
- Alertas de erro
- Audit trail de ações

## Docker (Produção)
Este repositório já inclui Dockerfiles de produção e um `docker-compose.prod.yml` para subir todo o stack (Postgres, Redis, Backend e Frontend):

```bash
docker compose -f docker-compose.prod.yml up --build
```

URLs padrões:
- API: http://localhost:3000/api
- Frontend (preview): http://localhost:4173

Variáveis úteis no compose:
- JWT_SECRET, POSTGRES_*, REDIS_*, CORS_ORIGIN, VITE_API_BASE_URL, VITE_WS_URL

## Realtime (WebSocket)
- Backend usa Socket.IO embutido em `backend/src/websocket/server.ts`.
- Para habilitar, defina no `backend/.env`:
- `ENABLE_WS=true`
  - `FRONTEND_URL=http://localhost:5173` (dev) ou a URL de produção do frontend
- Eventos principais de chat expostos:
  - Cliente → servidor: `join_groups`, `send_message`, `read_message`, `typing`.
  - Servidor → cliente: `new_message`, `message_sent`, `message_read`, `user_status`, `user_typing`.
 - Grupos: usuários entram automaticamente em `user:<id>` e podem entrar em `group:<id>` via `join_groups` (membros são detectados pelo backend).

### Endpoints de Grupos
- `GET /api/grupos` — lista grupos do usuário autenticado
- `GET /api/grupos/:id/mensagens` — lista mensagens do grupo (últimas 200)
 - `GET /api/grupos/:id` — detalhes do grupo (membros apenas)
 - `GET /api/grupos/:id/membros` — lista membros do grupo
 - `POST /api/grupos` — cria grupo (criador vira admin)
 - `PUT /api/grupos/:id` — atualiza nome/descrição/ativo (somente admin)
 - `DELETE /api/grupos/:id` — desativa o grupo (somente admin)
 - `POST /api/grupos/:id/membros` — adiciona/atualiza papel de um membro (somente admin)
 - `DELETE /api/grupos/:id/membros/:usuarioId` — remove membro (somente admin)

### Migrações relacionadas
- `014_criar_grupos.sql` — tabelas de grupos e membros
- `015_criar_mensagens_grupo.sql` — tabela de mensagens de grupo


```bash
# Build das imagens
docker-compose build

# Iniciar serviços
docker-compose up -d

# Logs
docker-compose logs -f
```

## CI/CD

GitHub Actions para:
- Build e testes
- Lint e type-check
- Auditoria de segurança
- Deploy automático

---
Projeto sob licença MIT.
