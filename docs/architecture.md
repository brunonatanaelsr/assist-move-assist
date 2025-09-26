# Arquitetura do Sistema

## Visão Geral

O Assist Move Assist é um sistema monorepo baseado em TypeScript, dividido em dois principais componentes:

### Frontend (React + Vite)
- Interface moderna e responsiva usando React 18
- Gerenciamento de estado com React Query
- Design system com Tailwind CSS
- Code-splitting e lazy loading para otimização
- WebSocket para comunicação em tempo real

### Backend (Node.js + Express)
- API RESTful com Express
- Banco de dados PostgreSQL com Prisma ORM
- Cache e filas com Redis
- WebSocket para notificações em tempo real
- JWT para autenticação

## Estrutura do Monorepo

```
assist-move-assist/
├── apps/                  # Aplicações principais
│   ├── frontend/         # Frontend React + Vite
│   │   ├── src/
│   │   │   ├── components/ # Componentes React
│   │   │   ├── hooks/     # React hooks
│   │   │   ├── pages/     # Páginas da aplicação
│   │   │   ├── services/  # Serviços e APIs
│   │   │   └── utils/     # Utilitários
│   │   └── public/       # Assets estáticos
│   └── backend/         # API Express
│       ├── src/
│       │   ├── controllers/
│       │   ├── services/
│       │   ├── models/
│       │   ├── repositories/
│       │   └── websocket/
│       └── prisma/      # Schema e migrações
├── docker/             # Configurações Docker
├── scripts/           # Scripts de automação
└── docs/             # Documentação
```

## Padrões e Decisões Arquiteturais

### Frontend

1. **Componentização**
   - Componentes pequenos e reutilizáveis
   - Separação clara entre UI e lógica
   - Props tipadas com TypeScript

2. **Gerenciamento de Estado**
   - React Query para cache e sincronização
   - Context API para estado global
   - Hooks customizados para lógica reutilizável

3. **Roteamento**
   - React Router com code-splitting
   - Proteção de rotas baseada em permissões
   - Lazy loading de componentes

4. **Performance**
   - Bundle splitting por rota
   - Prefetch de dados críticos
   - Otimização de assets e imagens

### Backend

1. **Arquitetura em Camadas**
   - Controllers: Validação e resposta HTTP
   - Services: Regras de negócio
   - Repositories: Acesso a dados
   - Models: Entidades e tipos

2. **Segurança**
   - CORS configurável
   - Rate limiting
   - JWT com refresh tokens
   - Validação de input com Zod

3. **Banco de Dados**
   - PostgreSQL para persistência
   - Prisma para ORM e migrações
   - Índices otimizados
   - Conexão com pool

4. **Cache e Performance**
   - Redis para cache
   - Compressão de resposta
   - Query optimization
   - Connection pooling

## Fluxo de Dados

1. **Request HTTP**
   ```
   Cliente -> Nginx -> Express -> Controller -> Service -> Repository -> DB
   ```

2. **WebSocket**
   ```
   Cliente <-> WS Server <-> Redis PubSub <-> Service
   ```

3. **Cache**
   ```
   Cliente -> Controller -> Cache -> Service -> Repository -> DB
   ```

## Segurança

1. **Autenticação**
   - JWT tokens
   - Refresh tokens
   - Cookie httpOnly
   - CSRF protection

2. **Autorização**
   - RBAC granular
   - Permissões por recurso
   - Cache de permissões no Redis

3. **Proteção**
   - Helmet middleware
   - Rate limiting
   - Sanitização de input
   - Logs de auditoria

## Monitoramento

1. **Logs**
   - Winston para logging estruturado
   - Níveis de log configuráveis
   - Rotação de arquivos
   - Logs de auditoria

2. **Métricas**
   - Prometheus metrics
   - Grafana dashboards
   - Alertas configuráveis

3. **Erros**
   - Error tracking com Sentry
   - Stacktraces detalhados
   - Ambiente de debug

## Deployment

1. **Containers**
   - Multi-stage builds
   - Imagens otimizadas
   - Docker Compose
   - Health checks

2. **CI/CD**
   - GitHub Actions
   - Testes automatizados
   - Build e deploy
   - Release automation

## Considerações Futuras

1. **Escalabilidade**
   - Microserviços
   - Queue workers
   - Sharding de banco
   - CDN para assets

2. **Features**
   - PWA
   - Push notifications
   - Offline support
   - Analytics

3. **Infraestrutura**
   - Kubernetes
   - Service mesh
   - Auto-scaling
   - Blue-green deploys