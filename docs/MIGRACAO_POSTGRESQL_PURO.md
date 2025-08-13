# Guia de Migração: Supabase → PostgreSQL Puro

## 🎯 Overview
Este guia detalha como migrar do Supabase para PostgreSQL puro mantendo todas as funcionalidades.

## 📋 COMPONENTES A SEREM SUBSTITUÍDOS

### 1. **Cliente de Banco de Dados**
```typescript
// ANTES (Supabase)
import { supabase } from '@/integrations/supabase/client';
const { data, error } = await supabase.from('table').select('*');

// DEPOIS (PostgreSQL + Node.js)
import { db } from '@/lib/database';
const data = await db.query('SELECT * FROM table');
```

### 2. **Sistema de Autenticação**
```typescript
// ANTES (Supabase Auth)
const { user } = await supabase.auth.signIn({email, password});

// DEPOIS (JWT + bcrypt)
const token = await authService.login(email, password);
```

### 3. **Real-time Features**
```typescript
// ANTES (Supabase Realtime)
supabase.from('table').on('INSERT', callback)

// DEPOIS (WebSockets/Server-Sent Events)
websocket.on('table_insert', callback)
```

## 🛠️ IMPLEMENTAÇÃO

### Backend Node.js/Express
```bash
# Dependências necessárias
npm install pg jsonwebtoken bcryptjs ws cors helmet
npm install -D @types/pg @types/jsonwebtoken @types/bcryptjs
```

### Estrutura de Arquivos
```
backend/
├── src/
│   ├── config/
│   │   ├── database.ts     # Configuração PostgreSQL
│   │   └── auth.ts         # Configuração JWT
│   ├── controllers/
│   │   ├── auth.ts         # Controladores de autenticação
│   │   ├── beneficiarias.ts # CRUD beneficiárias
│   │   └── feed.ts         # Sistema de feed
│   ├── middleware/
│   │   ├── auth.ts         # Middleware de autenticação
│   │   └── validation.ts   # Validação de dados
│   ├── models/
│   │   ├── User.ts         # Modelo de usuário
│   │   └── Beneficiaria.ts # Modelo de beneficiária
│   ├── routes/
│   │   ├── auth.ts         # Rotas de autenticação
│   │   ├── api.ts          # Rotas da API
│   │   └── websocket.ts    # WebSocket routes
│   ├── services/
│   │   ├── database.ts     # Serviço de banco
│   │   ├── auth.ts         # Serviço de autenticação
│   │   └── notification.ts # Serviço de notificações
│   └── app.ts              # Aplicação principal
├── migrations/             # Migrações SQL (já criadas)
└── package.json
```

## 🔄 ETAPAS DE MIGRAÇÃO

### Fase 1: Preparação do Backend
1. **Setup PostgreSQL** (local/cloud)
2. **Criar API Node.js/Express**
3. **Implementar autenticação JWT**
4. **Configurar WebSockets**

### Fase 2: Migração de Dados
1. **Executar migrations SQL**
2. **Migrar dados do Supabase**
3. **Configurar backup automático**

### Fase 3: Adaptação do Frontend
1. **Substituir cliente Supabase**
2. **Implementar cliente HTTP/WebSocket**
3. **Atualizar sistema de auth**
4. **Testar funcionalidades**

## 💻 CÓDIGO DE EXEMPLO

### Database Service (PostgreSQL)
```typescript
// src/lib/database.ts
import { Pool } from 'pg';

class DatabaseService {
  private pool: Pool;
  
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });
  }
  
  async query(text: string, params?: any[]) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(text, params);
      return result.rows;
    } finally {
      client.release();
    }
  }
  
  async getBeneficiarias() {
    return this.query('SELECT * FROM beneficiarias ORDER BY created_at DESC');
  }
  
  async createBeneficiaria(data: any) {
    const { nome_completo, cpf, telefone } = data;
    return this.query(
      'INSERT INTO beneficiarias (nome_completo, cpf, telefone) VALUES ($1, $2, $3) RETURNING *',
      [nome_completo, cpf, telefone]
    );
  }
}

export const db = new DatabaseService();
```

### Auth Service (JWT)
```typescript
// src/lib/authService.ts
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

class AuthService {
  async login(email: string, password: string) {
    const user = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (!user.length) throw new Error('Usuário não encontrado');
    
    const isValid = await bcrypt.compare(password, user[0].password_hash);
    if (!isValid) throw new Error('Senha inválida');
    
    const token = jwt.sign(
      { userId: user[0].id, email: user[0].email },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );
    
    return { token, user: user[0] };
  }
  
  async register(email: string, password: string, name: string) {
    const hashedPassword = await bcrypt.hash(password, 12);
    
    return db.query(
      'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name',
      [email, hashedPassword, name]
    );
  }
}

export const authService = new AuthService();
```

### Frontend HTTP Client
```typescript
// src/lib/apiClient.ts
class ApiClient {
  private baseURL: string;
  private token: string | null;
  
  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
    this.token = localStorage.getItem('auth_token');
  }
  
  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseURL}/api${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options.headers,
    };
    
    const response = await fetch(url, { ...options, headers });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  }
  
  async getBeneficiarias() {
    return this.request('/beneficiarias');
  }
  
  async createBeneficiaria(data: any) {
    return this.request('/beneficiarias', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
  
  async login(email: string, password: string) {
    const result = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    this.token = result.token;
    localStorage.setItem('auth_token', result.token);
    return result;
  }
}

export const apiClient = new ApiClient();
```

## 🔧 CONFIGURAÇÃO DO AMBIENTE

### Variables de Ambiente (.env)
```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=assist_move_assist
DB_USER=postgres
DB_PASSWORD=sua_senha

# Auth
JWT_SECRET=sua_chave_jwt_super_segura
JWT_EXPIRES_IN=7d

# SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu_email@gmail.com
SMTP_PASSWORD=sua_senha_app

# App
NODE_ENV=production
PORT=3001
CORS_ORIGIN=http://localhost:3001
```

## 📊 VANTAGENS DA MIGRAÇÃO

### ✅ Benefícios
- **Controle total** sobre a infraestrutura
- **Sem limitações** de vendor lock-in
- **Custos reduzidos** a longo prazo
- **Performance otimizada** para suas necessidades
- **Compliance total** com LGPD/GDPR

### ⚠️ Considerações
- **Maior complexidade** de setup inicial
- **Responsabilidade** por backups e manutenção
- **Necessidade** de expertise em DevOps
- **Tempo de desenvolvimento** adicional

## 📅 CRONOGRAMA ESTIMADO
- **Semana 1-2**: Setup backend + PostgreSQL
- **Semana 3**: Migração de dados
- **Semana 4**: Adaptação frontend
- **Semana 5**: Testes e otimização
- **Semana 6**: Deploy e monitoramento

## 🚀 PRÓXIMOS PASSOS
1. Configurar PostgreSQL (local/cloud)
2. Criar estrutura do backend Node.js
3. Implementar endpoints principais
4. Migrar sistema de autenticação
5. Adaptar frontend gradualmente
6. Configurar monitoramento e logs

---
**Nota**: Todas as migrações SQL e documentação já estão prontas no projeto!
