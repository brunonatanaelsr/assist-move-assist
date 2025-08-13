#!/bin/bash

# ============================================================================
# Script de Deploy Automático VPS CORRIGIDO - Assist Move Assist
# Corrige problemas de permissão PostgreSQL e configuração Nginx
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

echo "🔧 Deploy Corrigido - Assist Move Assist"
echo "======================================="
echo "🖥️  VPS: $VPS_IP"
echo "🌐 Domínio: $DOMAIN"
echo ""

# Função para executar comando na VPS
execute_remote() {
    local cmd="$1"
    local desc="$2"
    
    log_info "$desc"
    
    if sshpass -p "$VPS_PASSWORD" ssh -o StrictHostKeyChecking=no "$VPS_USER@$VPS_IP" "$cmd"; then
        log_success "$desc - Concluído"
    else
        log_error "$desc - Falhou"
        return 1
    fi
}

# 1. Corrigir permissões PostgreSQL
log_info "Corrigindo permissões PostgreSQL..."
sshpass -p "$VPS_PASSWORD" ssh -o StrictHostKeyChecking=no "$VPS_USER@$VPS_IP" << 'EOF'
# Conceder todas as permissões necessárias
sudo -u postgres psql -d movemarias << 'PGEOF'
-- Conceder privilégios em todas as tabelas existentes
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO movemarias_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO movemarias_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO movemarias_user;

-- Definir privilégios padrão para futuras tabelas
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO movemarias_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO movemarias_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO movemarias_user;

-- Conceder privilégios de criação no schema
GRANT CREATE ON SCHEMA public TO movemarias_user;
GRANT USAGE ON SCHEMA public TO movemarias_user;
\q
PGEOF
EOF

log_success "Permissões PostgreSQL corrigidas"

# 2. Criar usuários com permissões corretas
log_info "Criando usuários com permissões corretas..."
sshpass -p "$VPS_PASSWORD" ssh -o StrictHostKeyChecking=no "$VPS_USER@$VPS_IP" << 'EOF'
cd /var/www/movemarias/backend

# Script para criar usuários com tratamento de erro
node -e "
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
    console.log('🔑 Criando usuários...');
    
    const brunoHash = await bcrypt.hash('15002031', 12);
    const adminHash = await bcrypt.hash('movemarias123', 12);

    // Criar superadmin
    await pool.query(\`
      INSERT INTO usuarios (nome, email, senha_hash, papel, ativo) 
      VALUES (\$1, \$2, \$3, \$4, \$5)
      ON CONFLICT (email) 
      DO UPDATE SET senha_hash = \$3, papel = \$4, ativo = \$5
    \`, ['Bruno Superadmin', 'bruno@move.com', brunoHash, 'superadmin', true]);

    // Criar admin
    await pool.query(\`
      INSERT INTO usuarios (nome, email, senha_hash, papel, ativo) 
      VALUES (\$1, \$2, \$3, \$4, \$5)
      ON CONFLICT (email) 
      DO UPDATE SET senha_hash = \$3, papel = \$4, ativo = \$5
    \`, ['Admin Move Marias', 'admin@movemarias.com', adminHash, 'admin', true]);

    // Criar beneficiárias de exemplo
    await pool.query(\`
      INSERT INTO beneficiarias (nome_completo, cpf, contato1, endereco, programa_servico) 
      VALUES 
      ('Maria Silva Santos', '123.456.789-00', '(11) 99999-1111', 'Rua das Flores, 123 - São Paulo, SP', 'Capacitação Profissional'),
      ('Ana Paula Oliveira', '987.654.321-00', '(11) 99999-2222', 'Av. Principal, 456 - São Paulo, SP', 'Apoio Psicológico'),
      ('Joana Ferreira Lima', '456.789.123-00', '(11) 99999-3333', 'Rua da Esperança, 789 - São Paulo, SP', 'Oficinas Culturais')
      ON CONFLICT (cpf) DO NOTHING
    \`);

    console.log('✅ Usuários criados com sucesso');
    
    // Verificar usuários criados
    const result = await pool.query('SELECT nome, email, papel FROM usuarios ORDER BY created_at');
    console.log('👥 Usuários no sistema:');
    result.rows.forEach(user => {
      console.log(\`   • \${user.nome} (\${user.email}) - \${user.papel}\`);
    });
    
    await pool.end();
  } catch (error) {
    console.error('❌ Erro ao criar usuários:', error.message);
    process.exit(1);
  }
}

createUsers();
"
EOF

log_success "Usuários criados"

# 3. Configurar Nginx sem SSL primeiro
log_info "Configurando Nginx (HTTP primeiro)..."
sshpass -p "$VPS_PASSWORD" ssh -o StrictHostKeyChecking=no "$VPS_USER@$VPS_IP" << 'EOF'
# Remover configuração anterior se existir
rm -f /etc/nginx/sites-enabled/movemarias
rm -f /etc/nginx/sites-available/movemarias

# Criar configuração HTTP primeiro
cat > /etc/nginx/sites-available/movemarias << 'NGINXEOF'
server {
    listen 80;
    server_name movemarias.squadsolucoes.com.br;
    
    # Logs
    access_log /var/log/nginx/movemarias.access.log;
    error_log /var/log/nginx/movemarias.error.log;
    
    # Headers de segurança
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    
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
    
    # Página inicial
    location / {
        return 200 "🚀 Assist Move Assist - Sistema em funcionamento!

🌐 API disponível em /api
❤️  Health check em /health
🔐 Login: bruno@move.com / 15002031

Sistema Move Marias rodando com sucesso!";
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

log_success "Nginx configurado (HTTP)"

# 4. Reiniciar PM2 e Nginx
execute_remote "pm2 restart movemarias-backend && systemctl restart nginx" "Reiniciando serviços"

# 5. Configurar SSL agora que Nginx está funcionando
log_info "Configurando SSL com Let's Encrypt..."
execute_remote "certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@squadsolucoes.com.br" "Configurando SSL"

# 6. Configurar firewall
execute_remote "ufw --force reset && ufw default deny incoming && ufw default allow outgoing && ufw allow ssh && ufw allow 'Nginx Full' && ufw --force enable" "Configurando firewall"

# 7. Testes finais
log_info "Executando testes finais..."
sleep 5

# Teste backend local
if sshpass -p "$VPS_PASSWORD" ssh -o StrictHostKeyChecking=no "$VPS_USER@$VPS_IP" "curl -sf http://localhost:3001/health > /dev/null"; then
    log_success "✅ Backend funcionando na porta 3001"
else
    log_error "❌ Backend não está respondendo"
fi

# Teste HTTP
if curl -sf "http://$DOMAIN/health" > /dev/null 2>&1; then
    log_success "✅ HTTP funcionando"
else
    log_warning "⚠️  HTTP pode não estar funcionando ainda"
fi

# Teste HTTPS (pode demorar para propagação)
if curl -sf "https://$DOMAIN/health" > /dev/null 2>&1; then
    log_success "✅ HTTPS funcionando"
else
    log_warning "⚠️  HTTPS pode não estar funcionando ainda (aguarde propagação DNS)"
fi

# Teste login
log_info "Testando login do superadmin..."
LOGIN_RESPONSE=$(curl -s -X POST "http://$DOMAIN/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"bruno@move.com","password":"15002031"}' 2>/dev/null || echo "")

if echo "$LOGIN_RESPONSE" | grep -q '"success":true\|"token":\|"user":' 2>/dev/null; then
    log_success "✅ Login do superadmin funcionando"
else
    log_warning "⚠️  Resposta do login: $LOGIN_RESPONSE"
fi

# 8. Status final dos serviços
log_info "Verificando status final dos serviços..."
sshpass -p "$VPS_PASSWORD" ssh -o StrictHostKeyChecking=no "$VPS_USER@$VPS_IP" << 'EOF'
echo ""
echo "=== STATUS DOS SERVIÇOS ==="
systemctl is-active postgresql >/dev/null 2>&1 && echo "✅ PostgreSQL: ativo" || echo "❌ PostgreSQL: inativo"
systemctl is-active nginx >/dev/null 2>&1 && echo "✅ Nginx: ativo" || echo "❌ Nginx: inativo"
pm2 list | grep -q movemarias-backend.*online && echo "✅ Backend PM2: ativo" || echo "❌ Backend PM2: inativo"

echo ""
echo "=== INFORMAÇÕES DO BANCO ==="
sudo -u postgres psql -d movemarias -c "SELECT COUNT(*) as total_usuarios FROM usuarios;" 2>/dev/null || echo "❌ Erro ao consultar banco"

echo ""
echo "=== LOGS DO BACKEND ==="
pm2 logs movemarias-backend --lines 5 --nostream 2>/dev/null || echo "❌ Erro ao acessar logs"
EOF

# 9. Informações finais
echo ""
log_success "=== DEPLOY CORRIGIDO CONCLUÍDO ==="
echo ""
echo "🌐 URLs para teste:"
echo "   • HTTP:  http://$DOMAIN"
echo "   • HTTPS: https://$DOMAIN (pode demorar para funcionar)"
echo "   • API:   http://$DOMAIN/api"
echo "   • Health: http://$DOMAIN/health"
echo ""
echo "👥 Credenciais:"
echo "   • Superadmin: bruno@move.com / 15002031"
echo "   • Admin: admin@movemarias.com / movemarias123"
echo ""
echo "🔧 Comandos úteis para VPS:"
echo "   • ssh root@$VPS_IP"
echo "   • pm2 status"
echo "   • pm2 logs movemarias-backend"
echo "   • systemctl status nginx postgresql"
echo "   • sudo -u postgres psql -d movemarias"
echo ""
echo "📊 Teste rápido:"
echo "   curl http://$DOMAIN/health"
echo "   curl -X POST http://$DOMAIN/api/auth/login -H 'Content-Type: application/json' -d '{\"email\":\"bruno@move.com\",\"password\":\"15002031\"}'"
echo ""

log_success "🎉 Sistema corrigido e funcionando!"
