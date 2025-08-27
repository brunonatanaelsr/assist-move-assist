# Assist Move Assist

Sistema de gestão para institutos sociais que auxilia no acompanhamento de beneficiárias, na organização de projetos e na comunicação interna.

## Visão Geral
- Cadastro e acompanhamento de beneficiárias
- Dashboard com métricas e exportação de relatórios (PDF/Excel)
- Feed de comunicação e sistema de mensagens
- Gestão de tarefas, projetos e oficinas

## Requisitos
- Node.js 18+
- npm
- PostgreSQL 15+
- Redis (opcional, para cache)

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
   VITE_API_URL=http://localhost:3001
   
   # Backend (.env)
   PORT=3001
   DATABASE_URL=postgres://user:pass@localhost:5432/assist_move
   REDIS_URL=redis://localhost:6379
   JWT_SECRET=seu_jwt_secret
   UPLOAD_PATH=./uploads
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
   # Terminal 1 (Frontend)
   npm run dev
   
   # Terminal 2 (Backend)
   cd backend
   npm run dev
   ```
   Frontend: [http://localhost:5173](http://localhost:5173)
   Backend: [http://localhost:3001](http://localhost:3001)

## Scripts Úteis
```bash
npm run dev          # Servidor de desenvolvimento
npm run build        # Build de produção
npm run preview      # Preview do build
npm run lint         # Linter ESLint
npm run type-check   # Verificação de tipos TypeScript
npm test             # Executar testes
npm run test:coverage # Testes com coverage
npm run test:e2e     # Testes E2E
```

## Testes

### Unitários
Execute todos os testes de unidade do frontend e backend:

```bash
npm test
```

Para testar apenas o frontend ou backend:

```bash
npm run test:frontend
npm run test:backend
```

### E2E
Os testes end-to-end usam Playwright e requerem build prévio do frontend:

```bash
npm run build
npm run test:e2e
```

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
- [Guia de Deploy](docs/DEPLOY_GUIDE.md)
- [Banco de Dados](docs/database/)

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
