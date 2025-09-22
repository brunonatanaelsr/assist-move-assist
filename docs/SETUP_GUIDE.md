# Guia de Configuração e Implantação - Move Marias

## Sumário
1. [Pré-requisitos](#pré-requisitos)
2. [Configuração do Ambiente](#configuração-do-ambiente)
3. [Banco de Dados](#banco-de-dados)
4. [Backend](#backend)
5. [Frontend](#frontend)
6. [Testes](#testes)
7. [Produção](#produção)

## Pré-requisitos

- Node.js 18+ LTS
- PostgreSQL 14+
- Redis 6+
- Git

## Configuração do Ambiente

### 1. Instalação de Dependências (macOS)

```bash
# Instalar PostgreSQL
brew install postgresql@14

# Instalar Redis
brew install redis

# Iniciar serviços
brew services start postgresql@14
brew services start redis
```

### 2. Clone do Repositório

```bash
git clone https://github.com/brunonatanaelsr/assist-move-assist.git
cd assist-move-assist
```

## Banco de Dados

### 1. Criar Banco de Dados

```bash
# Criar banco e usuário
createdb movemarias
createuser -s postgres

# Instalar extensões necessárias
psql -d movemarias -c "CREATE EXTENSION IF NOT EXISTS pgcrypto; CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"; CREATE EXTENSION IF NOT EXISTS pg_trgm;"
```

### 2. Executar Migrações

As migrações estão localizadas em `apps/backend/src/database/migrations`. Execute-as na ordem numérica:

```bash
cd apps/backend/src/database/migrations
for f in $(ls -v *.sql); do
    echo "Executando $f..."
    psql -d movemarias -f "$f"
done
```

### 3. Configurar Usuário Inicial

```bash
# Criar superadmin
psql -d movemarias -c "INSERT INTO usuarios (nome, email, senha_hash, papel, ativo) VALUES ('Superadmin', 'superadmin@example.com', crypt('123456', gen_salt('bf')), 'superadmin', true);"
```

## Backend

### 1. Configuração de Ambiente

Criar arquivo `.env` em `apps/backend/`:

```bash
# Ambiente
NODE_ENV=development

# Configurações do servidor
PORT=3000
JWT_SECRET=development_secret_key_123456
CORS_ORIGIN=http://localhost:5173

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# PostgreSQL
DATABASE_URL=postgresql://postgres@localhost:5432/movemarias?schema=public
```

### 2. Instalação e Execução

```bash
# Instalar dependências
cd backend
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

## Frontend

### 1. Instalação e Execução

```bash
# Na raiz do projeto
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

## Testes

### 1. Backend

```bash
cd backend
npm run test
```

### 2. Frontend

```bash
npm run test
```

## Produção

### 1. Variáveis de Ambiente

Em produção, certifique-se de configurar as seguintes variáveis com valores seguros:

- `JWT_SECRET`: Chave secreta forte para tokens JWT
- `CORS_ORIGIN`: URL do frontend em produção
- `DATABASE_URL`: URL do PostgreSQL com credenciais
- `NODE_ENV`: "production"

### 2. Build e Deploy

```bash
# Build do frontend
npm run build

# Build do backend
cd backend
npm run build

# Iniciar em produção
npm run start
```

### 3. Docker (Opcional)

O projeto inclui arquivos Docker para containerização:

```bash
# Build e execução com Docker Compose
docker-compose -f docker-compose.prod.yml up -d
```

## Credenciais Iniciais

- **Email**: superadmin@example.com
- **Senha**: 123456

**IMPORTANTE**: Altere a senha do superadmin imediatamente após o primeiro login em produção!

## Verificação do Sistema

1. Backend deve estar acessível em: http://localhost:3000
2. Frontend deve estar acessível em: http://localhost:5173
3. Teste o login com as credenciais acima
4. Verifique o health check em: http://localhost:3000/health

## Solução de Problemas

1. **Erro de Conexão PostgreSQL**:
   - Verifique se o serviço está rodando: `brew services list`
   - Confirme as credenciais no `.env`

2. **Erro de Conexão Redis**:
   - Verifique o status: `brew services list`
   - Confirme as configurações no `.env`

3. **Erro CORS**:
   - Verifique se `CORS_ORIGIN` está configurado corretamente
   - Em desenvolvimento, deve apontar para a URL do frontend

4. **Erro de Autenticação**:
   - Verifique se as migrações foram executadas
   - Confirme se o usuário existe no banco
   - Verifique se `JWT_SECRET` está configurado