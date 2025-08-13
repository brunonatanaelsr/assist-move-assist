#!/bin/bash

# ============================================================================
# Script de Deploy Completo - Assist Move Assist
# PostgreSQL Puro + Node.js + PM2
# ============================================================================

set -e

echo "🚀 Iniciando deploy completo do Assist Move Assist..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funções auxiliares
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verificar se está rodando como root
if [[ $EUID -ne 0 ]]; then
   log_error "Este script deve ser executado como root"
   exit 1
fi

# Configurações
DB_NAME="movemarias"
DB_USER="movemarias_user"
DB_PASSWORD="movemarias_password_2025"
APP_DIR="/var/www/movemarias"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"
DOMAIN="movemarias.squadsolucoes.com.br"

log_info "=== CONFIGURAÇÕES ==="
echo "📊 Banco: $DB_NAME"
echo "👤 Usuário DB: $DB_USER"
echo "📂 App Dir: $APP_DIR"
echo "🌐 Domínio: $DOMAIN"
echo ""

# 1. Atualizar sistema
log_info "Atualizando sistema..."
apt update && apt upgrade -y

# 2. Instalar dependências
log_info "Instalando dependências..."
apt install -y curl wget git nginx postgresql postgresql-contrib nodejs npm certbot python3-certbot-nginx

# 3. Configurar PostgreSQL
log_info "Configurando PostgreSQL..."
systemctl start postgresql
systemctl enable postgresql

# Criar usuário e banco
sudo -u postgres psql << EOF
-- Criar usuário se não existir
DO \$\$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles
      WHERE  rolname = '$DB_USER') THEN
      CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
   END IF;
END
\$\$;

-- Criar banco se não existir
SELECT 'CREATE DATABASE $DB_NAME OWNER $DB_USER'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\gexec

-- Conceder privilégios
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
ALTER USER $DB_USER CREATEDB;
\q
EOF

log_success "PostgreSQL configurado"

# 4. Instalar Node.js 20
log_info "Instalando Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Instalar PM2 globalmente
npm install -g pm2

log_success "Node.js e PM2 instalados"

# 5. Criar estrutura de diretórios
log_info "Criando estrutura de diretórios..."
mkdir -p $APP_DIR
mkdir -p $BACKEND_DIR
mkdir -p $FRONTEND_DIR
mkdir -p /var/log/movemarias

# 6. Copiar arquivos do backend
log_info "Copiando arquivos do backend..."
if [[ -f "backend/app-production-complete.js" ]]; then
    cp backend/app-production-complete.js $BACKEND_DIR/
    cp backend/package.json $BACKEND_DIR/
    cp backend/.env.production $BACKEND_DIR/.env
    
    # Atualizar permissões
    chown -R www-data:www-data $APP_DIR
    chmod 755 $BACKEND_DIR
else
    log_error "Arquivo backend/app-production-complete.js não encontrado"
    exit 1
fi

# 7. Instalar dependências do backend
log_info "Instalando dependências do backend..."
cd $BACKEND_DIR
npm install

# 8. Executar migração do banco
log_info "Executando migração do banco..."
if [[ -f "../migrations/postgresql_complete_schema.sql" ]]; then
    sudo -u postgres psql -d $DB_NAME -f ../migrations/postgresql_complete_schema.sql
    log_success "Schema aplicado"
else
    log_warning "Schema não encontrado, criando tabelas básicas..."
    
    # Criar schema mínimo
    sudo -u postgres psql -d $DB_NAME << 'EOF'
-- Schema mínimo
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    papel VARCHAR(50) DEFAULT 'admin',
    ativo BOOLEAN DEFAULT true,
    ultimo_login TIMESTAMPTZ,
    data_criacao TIMESTAMPTZ DEFAULT NOW(),
    data_atualizacao TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS beneficiarias (
    id SERIAL PRIMARY KEY,
    nome_completo VARCHAR(255) NOT NULL,
    cpf VARCHAR(14) UNIQUE,
    contato1 VARCHAR(20),
    endereco TEXT,
    programa_servico VARCHAR(255),
    ativo BOOLEAN DEFAULT true,
    data_criacao TIMESTAMPTZ DEFAULT NOW(),
    data_atualizacao TIMESTAMPTZ DEFAULT NOW()
);
EOF
fi

# 9. Criar dados iniciais
log_info "Criando dados iniciais..."
cd $BACKEND_DIR

# Script inline para criar usuários
cat > create_users.js << 'EOF'
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: process.env.POSTGRES_DB || 'movemarias',
  user: process.env.POSTGRES_USER || 'movemarias_user',
  password: process.env.POSTGRES_PASSWORD || 'movemarias_password_2025',
});

async function createUsers() {
  try {
    const brunoHash = await bcrypt.hash('15002031', 12);
    const adminHash = await bcrypt.hash('movemarias123', 12);

    await pool.query(`
      INSERT INTO usuarios (nome, email, senha_hash, papel) 
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) 
      DO UPDATE SET senha_hash = $3, papel = $4
    `, ['Bruno Superadmin', 'bruno@move.com', brunoHash, 'superadmin']);

    await pool.query(`
      INSERT INTO usuarios (nome, email, senha_hash, papel) 
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) 
      DO UPDATE SET senha_hash = $3, papel = $4
    `, ['Admin Move Marias', 'admin@movemarias.com', adminHash, 'admin']);

    // Beneficiárias de exemplo
    await pool.query(`
      INSERT INTO beneficiarias (nome_completo, cpf, contato1, endereco, programa_servico) 
      VALUES 
      ('Maria Silva Santos', '123.456.789-00', '(11) 99999-1111', 'Rua das Flores, 123 - São Paulo, SP', 'Capacitação Profissional'),
      ('Ana Paula Oliveira', '987.654.321-00', '(11) 99999-2222', 'Av. Principal, 456 - São Paulo, SP', 'Apoio Psicológico'),
      ('Joana Ferreira Lima', '456.789.123-00', '(11) 99999-3333', 'Rua da Esperança, 789 - São Paulo, SP', 'Oficinas Culturais')
      ON CONFLICT (cpf) DO NOTHING
    `);

    console.log('✅ Usuários criados com sucesso');
    await pool.end();
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

createUsers();
EOF

node create_users.js
rm create_users.js

log_success "Dados iniciais criados"

# 10. Configurar PM2
log_info "Configurando PM2..."
cd $BACKEND_DIR

# Parar processos existentes
pm2 stop all || true
pm2 delete all || true

# Iniciar aplicação
pm2 start app-production-complete.js --name movemarias-backend
pm2 save
pm2 startup

log_success "PM2 configurado"

# 11. Configurar Nginx
log_info "Configurando Nginx..."

cat > /etc/nginx/sites-available/movemarias << EOF
server {
    listen 80;
    server_name $DOMAIN;
    
    # Redirecionar para HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;
    
    # SSL será configurado pelo Certbot
    
    # Logs
    access_log /var/log/nginx/movemarias.access.log;
    error_log /var/log/nginx/movemarias.error.log;
    
    # Configurações de segurança
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Proxy para backend
    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }
    
    # Health check
    location /health {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
    
    # Frontend (quando disponível)
    location / {
        root $FRONTEND_DIR;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }
    
    # Configurações de cache
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Ativar site
ln -sf /etc/nginx/sites-available/movemarias /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Testar configuração
nginx -t

log_success "Nginx configurado"

# 12. Configurar SSL
log_info "Configurando SSL com Let's Encrypt..."
systemctl reload nginx

# Obter certificado SSL
certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@squadsolucoes.com.br

log_success "SSL configurado"

# 13. Configurar firewall
log_info "Configurando firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable

log_success "Firewall configurado"

# 14. Reiniciar serviços
log_info "Reiniciando serviços..."
systemctl restart postgresql
systemctl restart nginx
pm2 restart movemarias-backend

# 15. Verificar status
log_info "Verificando status dos serviços..."
echo ""
echo "=== STATUS DOS SERVIÇOS ==="
systemctl is-active postgresql && log_success "PostgreSQL: ativo" || log_error "PostgreSQL: inativo"
systemctl is-active nginx && log_success "Nginx: ativo" || log_error "Nginx: inativo"
pm2 status

# 16. Teste final
log_info "Executando teste final..."
sleep 5

# Teste de conectividade
if curl -sf http://localhost:3001/health > /dev/null; then
    log_success "Backend respondendo na porta 3001"
else
    log_error "Backend não está respondendo"
fi

if curl -sf https://$DOMAIN/health > /dev/null; then
    log_success "HTTPS funcionando"
else
    log_warning "HTTPS pode não estar funcionando ainda"
fi

# 17. Informações finais
echo ""
log_success "=== DEPLOY CONCLUÍDO ==="
echo ""
echo "🌐 URL: https://$DOMAIN"
echo "🔧 Backend: https://$DOMAIN/api"
echo "📊 Health: https://$DOMAIN/health"
echo ""
echo "👥 Credenciais:"
echo "   Superadmin: bruno@move.com / 15002031"
echo "   Admin: admin@movemarias.com / movemarias123"
echo ""
echo "📂 Diretórios:"
echo "   App: $APP_DIR"
echo "   Backend: $BACKEND_DIR"
echo "   Logs: /var/log/movemarias"
echo ""
echo "🔧 Comandos úteis:"
echo "   pm2 status"
echo "   pm2 logs movemarias-backend"
echo "   systemctl status nginx"
echo "   tail -f /var/log/nginx/movemarias.error.log"
echo ""

log_success "Deploy completo finalizado!"
