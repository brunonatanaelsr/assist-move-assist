#!/bin/bash

# ============================================================================
# Script de Deploy Automático VPS - Assist Move Assist
# Conecta na VPS e faz deploy completo automaticamente
# VPS: 145.79.6.36 | Senha: AGzzcso1@1500
# ============================================================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }

# Configurações da VPS
VPS_IP="145.79.6.36"
VPS_USER="root"
VPS_PASSWORD="AGzzcso1@1500"
DOMAIN="movemarias.squadsolucoes.com.br"
REPO_URL="https://github.com/brunonatanaelsr/assist-move-assist.git"

echo "🚀 Deploy Automático - Assist Move Assist"
echo "=================================="
echo "🖥️  VPS: $VPS_IP"
echo "🌐 Domínio: $DOMAIN"
echo "📦 Repositório: $REPO_URL"
echo ""

# Verificar se sshpass está instalado
if ! command -v sshpass &> /dev/null; then
    log_warning "Instalando sshpass..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            brew install hudochenkov/sshpass/sshpass
        else
            log_error "Homebrew não encontrado. Instale sshpass manualmente"
            exit 1
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        sudo apt-get update && sudo apt-get install -y sshpass
    else
        log_error "Sistema operacional não suportado para instalação automática do sshpass"
        exit 1
    fi
fi

log_success "sshpass disponível"

# Função para executar comando na VPS
execute_remote() {
    local cmd="$1"
    local desc="$2"
    
    log_info "$desc"
    
    if sshpass -p "$VPS_PASSWORD" ssh -o StrictHostKeyChecking=no "$VPS_USER@$VPS_IP" "$cmd"; then
        log_success "$desc - Concluído"
    else
        log_error "$desc - Falhou"
        exit 1
    fi
}

# Função para copiar arquivo para VPS
copy_to_vps() {
    local local_file="$1"
    local remote_path="$2"
    local desc="$3"
    
    log_info "$desc"
    
    if sshpass -p "$VPS_PASSWORD" scp -o StrictHostKeyChecking=no "$local_file" "$VPS_USER@$VPS_IP:$remote_path"; then
        log_success "$desc - Concluído"
    else
        log_error "$desc - Falhou"
        exit 1
    fi
}

# 1. Testar conectividade
log_info "Testando conectividade com a VPS..."
if sshpass -p "$VPS_PASSWORD" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 "$VPS_USER@$VPS_IP" "echo 'Conexão OK'"; then
    log_success "Conectividade OK"
else
    log_error "Não foi possível conectar na VPS"
    exit 1
fi

# 2. Atualizar sistema
execute_remote "apt update && apt upgrade -y" "Atualizando sistema"

# 3. Instalar dependências básicas
execute_remote "apt install -y curl wget git nginx postgresql postgresql-contrib software-properties-common certbot python3-certbot-nginx ufw fail2ban" "Instalando dependências"

# 4. Instalar Node.js 20
execute_remote "curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs" "Instalando Node.js 20"

# 5. Instalar PM2
execute_remote "npm install -g pm2" "Instalando PM2"

# 6. Configurar PostgreSQL
log_info "Configurando PostgreSQL..."
sshpass -p "$VPS_PASSWORD" ssh -o StrictHostKeyChecking=no "$VPS_USER@$VPS_IP" << 'EOF'
systemctl start postgresql
systemctl enable postgresql

# Configurar usuário e banco PostgreSQL
sudo -u postgres psql << 'PGEOF'
-- Criar usuário se não existir
DO $$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles
      WHERE  rolname = 'movemarias_user') THEN
      CREATE USER movemarias_user WITH PASSWORD 'movemarias_password_2025';
   END IF;
END
$$;

-- Criar banco se não existir
SELECT 'CREATE DATABASE movemarias OWNER movemarias_user'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'movemarias')\gexec

-- Conceder privilégios
GRANT ALL PRIVILEGES ON DATABASE movemarias TO movemarias_user;
ALTER USER movemarias_user CREATEDB;
\q
PGEOF
EOF

log_success "PostgreSQL configurado"

# 7. Clonar repositório
execute_remote "cd /tmp && rm -rf assist-move-assist && git clone $REPO_URL" "Clonando repositório"

# 8. Criar estrutura de diretórios
execute_remote "mkdir -p /var/www/movemarias/{backend,frontend,logs}" "Criando estrutura de diretórios"

# 9. Copiar arquivos do backend
log_info "Copiando arquivos do backend..."
sshpass -p "$VPS_PASSWORD" ssh -o StrictHostKeyChecking=no "$VPS_USER@$VPS_IP" << 'EOF'
cd /tmp/assist-move-assist
cp backend/app-production-complete.js /var/www/movemarias/backend/
cp backend/package.json /var/www/movemarias/backend/
cp backend/.env.production /var/www/movemarias/backend/.env
cp backend/scripts/create-initial-data.js /var/www/movemarias/backend/
cp migrations/postgresql_complete_schema.sql /var/www/movemarias/

# Definir permissões
chown -R www-data:www-data /var/www/movemarias
chmod 755 /var/www/movemarias/backend
EOF

log_success "Arquivos copiados"

# 10. Instalar dependências Node.js
execute_remote "cd /var/www/movemarias/backend && npm install" "Instalando dependências Node.js"

# 11. Aplicar schema do banco
execute_remote "sudo -u postgres psql -d movemarias -f /var/www/movemarias/postgresql_complete_schema.sql" "Aplicando schema do banco"

# 12. Criar usuários iniciais
log_info "Criando usuários iniciais..."
sshpass -p "$VPS_PASSWORD" ssh -o StrictHostKeyChecking=no "$VPS_USER@$VPS_IP" << 'EOF'
cd /var/www/movemarias/backend

# Script para criar usuários
cat > create_users_auto.js << 'JSEOF'
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'movemarias',
  user: 'movemarias_user',
  password: 'movemarias_password_2025',
});

async function createUsers() {
  try {
    console.log('Criando usuários...');
    
    const brunoHash = await bcrypt.hash('15002031', 12);
    const adminHash = await bcrypt.hash('movemarias123', 12);

    // Criar superadmin
    await pool.query(`
      INSERT INTO usuarios (nome, email, senha_hash, papel) 
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) 
      DO UPDATE SET senha_hash = $3, papel = $4, ativo = true
    `, ['Bruno Superadmin', 'bruno@move.com', brunoHash, 'superadmin']);

    // Criar admin
    await pool.query(`
      INSERT INTO usuarios (nome, email, senha_hash, papel) 
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) 
      DO UPDATE SET senha_hash = $3, papel = $4, ativo = true
    `, ['Admin Move Marias', 'admin@movemarias.com', adminHash, 'admin']);

    // Criar beneficiárias de exemplo
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
JSEOF

node create_users_auto.js
rm create_users_auto.js
EOF

log_success "Usuários criados"

# 13. Configurar PM2
execute_remote "cd /var/www/movemarias/backend && pm2 stop all || true && pm2 delete all || true && pm2 start app-production-complete.js --name movemarias-backend && pm2 save && pm2 startup" "Configurando PM2"

# 14. Configurar Nginx
log_info "Configurando Nginx..."
sshpass -p "$VPS_PASSWORD" ssh -o StrictHostKeyChecking=no "$VPS_USER@$VPS_IP" << 'EOF'
cat > /etc/nginx/sites-available/movemarias << 'NGINXEOF'
server {
    listen 80;
    server_name movemarias.squadsolucoes.com.br;
    
    # Redirecionar para HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name movemarias.squadsolucoes.com.br;
    
    # SSL será configurado pelo Certbot
    
    # Logs
    access_log /var/log/nginx/movemarias.access.log;
    error_log /var/log/nginx/movemarias.error.log;
    
    # Headers de segurança
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Proxy para backend
    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }
    
    # Health check
    location /health {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Frontend placeholder
    location / {
        return 200 "Assist Move Assist - Sistema em funcionamento!\nAPI disponível em /api\nHealth check em /health";
        add_header Content-Type text/plain;
    }
    
    # Cache para assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
NGINXEOF

# Ativar site
ln -sf /etc/nginx/sites-available/movemarias /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Testar configuração
nginx -t
EOF

log_success "Nginx configurado"

# 15. Configurar SSL
execute_remote "systemctl reload nginx && certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@squadsolucoes.com.br" "Configurando SSL"

# 16. Configurar firewall
execute_remote "ufw --force reset && ufw default deny incoming && ufw default allow outgoing && ufw allow ssh && ufw allow 'Nginx Full' && ufw --force enable" "Configurando firewall"

# 17. Reiniciar serviços
execute_remote "systemctl restart postgresql nginx && pm2 restart movemarias-backend" "Reiniciando serviços"

# 18. Teste final
log_info "Executando testes finais..."
sleep 10

# Teste backend
if sshpass -p "$VPS_PASSWORD" ssh -o StrictHostKeyChecking=no "$VPS_USER@$VPS_IP" "curl -sf http://localhost:3001/health > /dev/null"; then
    log_success "Backend funcionando na porta 3001"
else
    log_error "Backend não está respondendo"
fi

# Teste HTTPS
if curl -sf "https://$DOMAIN/health" > /dev/null 2>&1; then
    log_success "HTTPS funcionando"
else
    log_warning "HTTPS pode não estar funcionando ainda (aguarde propagação DNS)"
fi

# Teste login
log_info "Testando login do superadmin..."
LOGIN_RESPONSE=$(curl -s -X POST "https://$DOMAIN/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"bruno@move.com","password":"15002031"}' || echo "")

if echo "$LOGIN_RESPONSE" | grep -q '"success":true'; then
    log_success "Login do superadmin funcionando"
else
    log_warning "Login pode não estar funcionando ainda"
fi

# 19. Status final
log_info "Verificando status dos serviços..."
sshpass -p "$VPS_PASSWORD" ssh -o StrictHostKeyChecking=no "$VPS_USER@$VPS_IP" << 'EOF'
echo "=== STATUS DOS SERVIÇOS ==="
systemctl is-active postgresql && echo "✅ PostgreSQL: ativo" || echo "❌ PostgreSQL: inativo"
systemctl is-active nginx && echo "✅ Nginx: ativo" || echo "❌ Nginx: inativo"
pm2 status | grep movemarias-backend | grep online && echo "✅ Backend: ativo" || echo "❌ Backend: inativo"
EOF

# 20. Informações finais
echo ""
log_success "=== DEPLOY CONCLUÍDO COM SUCESSO ==="
echo ""
echo "🌐 URLs:"
echo "   • App: https://$DOMAIN"
echo "   • API: https://$DOMAIN/api"
echo "   • Health: https://$DOMAIN/health"
echo ""
echo "👥 Credenciais:"
echo "   • Superadmin: bruno@move.com / 15002031"
echo "   • Admin: admin@movemarias.com / movemarias123"
echo ""
echo "🔧 Comandos para VPS:"
echo "   • ssh root@$VPS_IP"
echo "   • pm2 status"
echo "   • pm2 logs movemarias-backend"
echo "   • systemctl status nginx postgresql"
echo ""
echo "📊 Teste rápido:"
echo "   curl https://$DOMAIN/health"
echo ""

log_success "Deploy automático finalizado! Sistema no ar! 🚀"
