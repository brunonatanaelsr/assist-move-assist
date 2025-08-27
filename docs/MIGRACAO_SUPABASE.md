# Plano de Migração do Supabase para PostgreSQL Nativo

## Sumário Executivo

Este documento detalha o plano de migração do projeto Assist Move Assist do Supabase para uma arquitetura PostgreSQL nativa. A análise identificou diversos módulos que ainda dependem do Supabase, principalmente para autenticação, armazenamento e realtime.

### Status Geral
- **Módulos Identificados**: 8 principais
- **Arquivos Afetados**: ~25
- **Complexidade Geral**: Média
- **Tempo Estimado**: 6 semanas

## 1. Análise Detalhada por Módulo

### 1.1 Sistema de Autenticação
```typescript
{
  nome: "Autenticação",
  status: "Supabase",
  arquivos_afetados: [
    "src/components/UserManagement.tsx",
    "src/services/auth.service.ts",
    "src/hooks/useAuth.ts",
    "src/contexts/AuthContext.tsx"
  ],
  dependencies_supabase: [
    "@supabase/auth-helpers",
    "@supabase/supabase-js"
  ],
  refatoracao_necessaria: {
    backend_apis: [
      "POST /auth/login",
      "POST /auth/register",
      "POST /auth/refresh-token",
      "POST /auth/logout"
    ],
    database_changes: [
      "CREATE TABLE users",
      "CREATE TABLE refresh_tokens"
    ],
    frontend_changes: [
      "Implementar JWT handling",
      "Criar interceptors para refresh token",
      "Atualizar contexto de autenticação"
    ],
    new_services: [
      "JWTService",
      "AuthenticationService"
    ]
  },
  prioridade: "Crítica",
  estimativa_horas: 40,
  impacto: "Alto"
}
```

### 1.2 Sistema de Storage
```typescript
{
  nome: "Storage",
  status: "Supabase",
  arquivos_afetados: [
    "src/services/storage.service.ts",
    "src/hooks/useStorage.ts",
    "src/components/FileUpload.tsx"
  ],
  dependencies_supabase: [
    "@supabase/storage-js"
  ],
  refatoracao_necessaria: {
    backend_apis: [
      "POST /storage/upload",
      "GET /storage/file/:id",
      "DELETE /storage/file/:id"
    ],
    database_changes: [
      "CREATE TABLE files",
      "CREATE TABLE file_permissions"
    ],
    frontend_changes: [
      "Implementar upload direto para backend",
      "Criar componente de preview",
      "Atualizar lógica de permissões"
    ],
    new_services: [
      "StorageService",
      "FileUploadService"
    ]
  },
  prioridade: "Alta",
  estimativa_horas: 32,
  impacto: "Médio"
}
```

### 1.3 Real-time Feed
```typescript
{
  nome: "Feed Real-time",
  status: "Supabase",
  arquivos_afetados: [
    "src/pages/Feed.tsx",
    "src/hooks/useFeed.ts",
    "src/services/feed.service.ts"
  ],
  dependencies_supabase: [
    "@supabase/realtime-js"
  ],
  refatoracao_necessaria: {
    backend_apis: [
      "WebSocket /ws/feed",
      "GET /feed",
      "POST /feed"
    ],
    database_changes: [
      "CREATE TABLE feed_items",
      "CREATE TRIGGER notify_feed"
    ],
    frontend_changes: [
      "Implementar WebSocket client",
      "Atualizar lógica de subscription",
      "Implementar reconexão automática"
    ],
    new_services: [
      "WebSocketService",
      "FeedService"
    ]
  },
  prioridade: "Média",
  estimativa_horas: 24,
  impacto: "Médio"
}
```

### 1.4 Analytics
```typescript
{
  nome: "Analytics",
  status: "Híbrido",
  arquivos_afetados: [
    "src/pages/Analytics.tsx",
    "src/services/analytics.service.ts"
  ],
  dependencies_supabase: [
    "@supabase/supabase-js"
  ],
  refatoracao_necessaria: {
    backend_apis: [
      "GET /analytics/overview",
      "GET /analytics/beneficiarias",
      "GET /analytics/projetos"
    ],
    database_changes: [
      "CREATE VIEW analytics_overview",
      "CREATE MATERIALIZED VIEW beneficiarias_stats"
    ],
    frontend_changes: [
      "Migrar queries para API REST",
      "Implementar cache local",
      "Atualizar visualizações"
    ],
    new_services: [
      "AnalyticsService"
    ]
  },
  prioridade: "Baixa",
  estimativa_horas: 16,
  impacto: "Baixo"
}
```

## 2. Matriz de Priorização

### Prioridade Crítica (Semana 1-2)
1. Sistema de Autenticação
   - Implementar JWT
   - Migrar autenticação de usuários
   - Configurar refresh tokens

### Prioridade Alta (Semana 3-4)
1. Sistema de Storage
   - Configurar armazenamento local
   - Migrar arquivos existentes
   - Implementar upload/download

### Prioridade Média (Semana 5)
1. Real-time Feed
   - Implementar WebSocket
   - Migrar subscriptions
   - Configurar notificações

### Prioridade Baixa (Semana 6)
1. Analytics
   - Migrar queries
   - Implementar cache
   - Otimizar performance

## 3. Plano de Migração Step-by-Step

### Fase 1: Preparação (Semana 1)
1. Setup ambiente PostgreSQL nativo
   ```sql
   -- Criar extensões necessárias
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   CREATE EXTENSION IF NOT EXISTS "pgcrypto";
   
   -- Schema para autenticação
   CREATE SCHEMA auth;
   
   -- Tabelas principais
   CREATE TABLE auth.users (
     id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
     email TEXT UNIQUE NOT NULL,
     password_hash TEXT NOT NULL,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );
   
   CREATE TABLE auth.refresh_tokens (
     token TEXT PRIMARY KEY,
     user_id uuid REFERENCES auth.users(id),
     expires_at TIMESTAMPTZ NOT NULL,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

2. Configurar JWT backend
   ```typescript
   // src/services/jwt.service.ts
   import jwt from 'jsonwebtoken';
   
   export class JWTService {
     private secret: string;
     
     constructor(secret: string) {
       this.secret = secret;
     }
     
     generateToken(payload: any): string {
       return jwt.sign(payload, this.secret, { expiresIn: '1h' });
     }
     
     verifyToken(token: string): any {
       return jwt.verify(token, this.secret);
     }
   }
   ```

3. Implementar middlewares de autenticação
   ```typescript
   // src/middleware/auth.middleware.ts
   export const authMiddleware = async (req, res, next) => {
     const token = req.headers.authorization?.split(' ')[1];
     if (!token) {
       return res.status(401).json({ error: 'Token não fornecido' });
     }
     
     try {
       const decoded = jwtService.verifyToken(token);
       req.user = decoded;
       next();
     } catch (error) {
       res.status(401).json({ error: 'Token inválido' });
     }
   };
   ```

### Fase 2: Migração de Dados (Semana 2)
1. Scripts de migração de usuários
2. Scripts de migração de arquivos
3. Scripts de migração de dados real-time

### Fase 3: Frontend Updates (Semana 3-4)
1. Atualizar serviços de API
2. Implementar novo cliente de autenticação
3. Atualizar componentes afetados

### Fase 4: Real-time & Storage (Semana 5)
1. Implementar WebSocket server
2. Configurar storage local
3. Migrar notificações

### Fase 5: Testes e Validação (Semana 6)
1. Testes de integração
2. Testes de performance
3. Validação de segurança

## 4. Checklist de Validação

### Autenticação
- [ ] Sistema JWT implementado
- [ ] Refresh tokens funcionando
- [ ] Middleware de autenticação
- [ ] Testes de segurança

### Storage
- [ ] Upload funcionando
- [ ] Download funcionando
- [ ] Permissões corretas
- [ ] Backup configurado

### Real-time
- [ ] WebSocket conectando
- [ ] Notificações funcionando
- [ ] Reconexão automática
- [ ] Performance adequada

### Geral
- [ ] Sem dependências do Supabase
- [ ] Logs estruturados
- [ ] Error handling
- [ ] Testes passando

## 5. Considerações de Segurança

1. **Autenticação**
   - Implementar rate limiting
   - Usar hashing seguro (bcrypt)
   - Configurar CORS corretamente

2. **Storage**
   - Validar tipos de arquivo
   - Implementar scan de vírus
   - Configurar limites de upload

3. **WebSocket**
   - Autenticação por token
   - Validação de origem
   - Rate limiting por conexão

## 6. Monitoramento e Métricas

1. **Performance**
   - Latência de API
   - Uso de memória
   - Conexões WebSocket

2. **Segurança**
   - Tentativas de login
   - Uploads suspeitos
   - Erros de autenticação

3. **Disponibilidade**
   - Uptime de serviços
   - Tempo de resposta
   - Taxa de erro

## 7. Backups e Recuperação

1. **Banco de Dados**
   ```bash
   #!/bin/bash
   # backup.sh
   pg_dump -Fc > backup_$(date +%Y%m%d).dump
   ```

2. **Arquivos**
   ```bash
   #!/bin/bash
   # backup_files.sh
   tar -czf storage_$(date +%Y%m%d).tar.gz /path/to/storage
   ```

3. **Testes de Recuperação**
   - Validar restauração de backup
   - Testar failover
   - Documentar procedimentos

## Conclusão

A migração do Supabase para PostgreSQL nativo é um projeto substancial mas gerenciável. Com um plano estruturado e foco nas prioridades corretas, podemos completar a migração em 6 semanas mantendo a estabilidade do sistema.

### Próximos Passos

1. Validar plano com stakeholders
2. Criar ambiente de staging
3. Iniciar com módulo de autenticação
4. Monitorar métricas de performance

### Riscos e Mitigações

1. **Downtime**
   - Migração gradual
   - Testes em staging
   - Rollback plan

2. **Performance**
   - Monitoramento constante
   - Otimizações incrementais
   - Caching estratégico

3. **Segurança**
   - Auditorias regulares
   - Testes de penetração
   - Revisão de código
