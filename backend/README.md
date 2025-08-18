# Backend PostgreSQL - Assist Move Assist

## Descrição

Backend Node.js/Express desenvolvido para substituir completamente o Supabase, oferecendo uma solução 100% PostgreSQL nativa para o sistema Assist Move Assist.

## Funcionalidades

### ✅ Implementadas
- **Autenticação JWT**: Sistema completo de login/registro/perfil
- **Gerenciamento de Beneficiárias**: CRUD completo com validações
- **WebSocket em Tempo Real**: Sistema de notificações e atualizações
- **Dashboard**: Estatísticas e métricas do sistema
- **Logs e Auditoria**: Sistema completo de logging
- **Middleware de Segurança**: Rate limiting, CORS, Helmet
- **Pool de Conexões**: Gerenciamento otimizado do PostgreSQL

### 🚧 Arquitetura

```
backend/
├── src/
│   ├── config/
│   │   └── database.ts          # Pool de conexões PostgreSQL
│   ├── middleware/
│   │   └── auth.ts              # Autenticação JWT e autorização
│   ├── routes/
│   │   ├── auth.ts              # Endpoints de autenticação
│   │   ├── beneficiarias.ts     # CRUD de beneficiárias
│   │   └── dashboard.ts         # Estatísticas e métricas
│   ├── services/
│   │   ├── logger.ts            # Sistema de logs
│   │   └── websocket.ts         # WebSocket para tempo real
│   ├── types/
│   │   └── express.d.ts         # Tipos customizados
│   └── app.ts                   # Aplicação principal
├── .env.example                 # Variáveis de ambiente
├── package.json                 # Dependências
└── tsconfig.json               # Configuração TypeScript
```

## Configuração

### Pré-requisitos
- Node.js >= 18.0.0
- PostgreSQL >= 12
- TypeScript

### Instalação

1. **Instalar dependências:**
```bash
cd backend
npm install
```

2. **Configurar variáveis de ambiente:**
```bash
cp .env.example .env
# Editar .env com suas configurações
```

3. **Configurar banco de dados:**
```bash
# Criar banco de dados
createdb assist_move_assist

# Executar migrações (usar os arquivos SQL existentes)
psql -d assist_move_assist -f ../migrations/001_initial_schema.sql
psql -d assist_move_assist -f ../migrations/002_audit_system.sql
```

4. **Executar em desenvolvimento:**
```bash
npm run dev
```

### Variáveis de Ambiente Principais

```env
# Banco de dados
DB_HOST=localhost
DB_PORT=5432
DB_NAME=assist_move_assist
DB_USER=postgres
DB_PASSWORD=sua_senha

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

# Servidor
PORT=3001
CORS_ORIGIN=http://localhost:5173
```

## API Endpoints

### Autenticação
- `POST /auth/login` - Login do usuário
- `POST /auth/register` - Registro de novo usuário
- `GET /auth/profile` - Obter perfil do usuário logado
- `PUT /auth/profile` - Atualizar perfil
- `POST /auth/change-password` - Alterar senha
- `POST /auth/refresh-token` - Renovar token
- `POST /auth/logout` - Logout (auditoria)

### Beneficiárias
- `GET /beneficiarias` - Listar beneficiárias (com filtros e paginação)
- `GET /beneficiarias/:id` - Buscar beneficiária por ID
- `POST /beneficiarias` - Criar nova beneficiária
- `PUT /beneficiarias/:id` - Atualizar beneficiária
- `DELETE /beneficiarias/:id` - Excluir beneficiária (soft delete)
- `GET /beneficiarias/:id/anamneses` - Buscar anamneses da beneficiária
- `GET /beneficiarias/:id/declaracoes` - Buscar declarações da beneficiária

### Dashboard
- `GET /dashboard/stats` - Estatísticas gerais
- `GET /dashboard/recent-activities` - Atividades recentes
- `GET /dashboard/notifications` - Notificações do usuário
- `PUT /dashboard/notifications/:id/read` - Marcar notificação como lida
- `POST /dashboard/notifications/mark-all-read` - Marcar todas como lidas
- `GET /dashboard/quick-access` - Links de acesso rápido

## WebSocket

### Conexão
```javascript
const ws = new WebSocket('ws://localhost:3001?token=seu_jwt_token');
```

### Eventos
- `connected` - Confirmação de conexão
- `new_beneficiaria` - Nova beneficiária cadastrada
- `feed_update` - Atualização no feed
- `status_change` - Mudança de status
- `new_message` - Nova mensagem
- `message_sent` - Confirmação de envio

## Migração do Frontend

### Substituir Cliente Supabase

1. **Criar cliente API:**
```typescript
// src/lib/api-client.ts
class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor() {
    this.baseURL = 'http://localhost:3001';
    this.token = localStorage.getItem('auth_token');
  }

  async request(endpoint: string, options: RequestInit = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options.headers,
    };

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  }

  // Métodos de autenticação
  async login(email: string, password: string) {
    const result = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    this.token = result.token;
    localStorage.setItem('auth_token', result.token);
    return result;
  }

  // Métodos de beneficiárias
  async getBeneficiarias(filters = {}) {
    const params = new URLSearchParams(filters);
    return this.request(`/beneficiarias?${params}`);
  }
}

export const apiClient = new ApiClient();
```

2. **Substituir hooks de autenticação:**
```typescript
// src/hooks/useAuth.tsx
import { apiClient } from '../lib/api-client';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const login = async (email: string, password: string) => {
    const result = await apiClient.login(email, password);
    setUser(result.user);
    return result;
  };

  // ... outros métodos
};
```

3. **Implementar WebSocket:**
```typescript
// src/services/websocket.ts
class WebSocketService {
  private ws: WebSocket | null = null;

  connect(token: string) {
    this.ws = new WebSocket(`ws://localhost:3001?token=${token}`);
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      // Processar mensagens
    };
  }
}
```

## Segurança

### Implementada
- ✅ Autenticação JWT
- ✅ Hashing de senhas com bcrypt
- ✅ Rate limiting
- ✅ CORS configurado
- ✅ Helmet para headers de segurança
- ✅ Validação de entrada
- ✅ Auditoria de ações

### Recomendações para Produção
- [ ] HTTPS obrigatório
- [ ] Validação de esquemas com Joi/Zod
- [ ] Monitoramento com Prometheus
- [ ] Backup automatizado
- [ ] Logs centralizados
- [ ] Firewall de aplicação

## Performance

### Otimizações Implementadas
- Pool de conexões PostgreSQL
- Compression middleware
- Logging otimizado
- WebSocket com heartbeat
- Queries otimizadas

### Métricas
- Conexões simultâneas: até 20
- Timeout de conexão: 2s
- Timeout de idle: 30s
- Rate limit: 100 req/15min

## Monitoramento

### Logs
```bash
# Logs em desenvolvimento
npm run dev

# Logs em produção
tail -f logs/combined.log
tail -f logs/error.log
```

### Health Check
```bash
curl http://localhost:3001/health
```

## Scripts Disponíveis

- `npm run dev` - Desenvolvimento com hot reload
- `npm run build` - Build para produção
- `npm run start` - Executar build de produção
- `npm run migrate` - Executar migrações
- `npm test` - Executar testes

## Status da Migração

### ✅ Completo
- [x] Estrutura do projeto
- [x] Sistema de autenticação
- [x] CRUD de beneficiárias
- [x] WebSocket em tempo real
- [x] Dashboard e estatísticas
- [x] Sistema de logs
- [x] Documentação

### 🚧 Próximos Passos
- [ ] Rotas para formulários (anamnese, declarações)
- [ ] Sistema de mensagens
- [ ] Upload de arquivos
- [ ] Relatórios em PDF
- [ ] Testes automatizados
- [ ] Deploy e CI/CD

### 📋 Migração do Frontend
- [ ] Substituir cliente Supabase
- [ ] Adaptar hooks de autenticação
- [ ] Implementar WebSocket client
- [ ] Testar todas as funcionalidades
- [ ] Migração de dados (se necessário)

---

**Status**: ✅ Backend pronto para uso. Frontend precisa ser adaptado para usar as novas APIs.
