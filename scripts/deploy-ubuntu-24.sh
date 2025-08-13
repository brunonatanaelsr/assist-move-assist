#!/bin/bash

# Script de Deploy para Ubuntu 24.04 LTS
# Move Marias - Sistema de Produção

# Configurações
APP_NAME="movemarias"
APP_DIR="/var/www/movemarias"
BACKUP_DIR="/var/backups/movemarias"
NGINX_CONFIG="/etc/nginx/sites-available/movemarias"
SSL_CONFIG="/etc/nginx/sites-available/movemarias-ssl"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Função de log
log() {
    local level=$1
    local message=$2
    local timestamp=$(date +'%Y-%m-%d %H:%M:%S')
    echo -e "[$timestamp] $level: $message"
}

echo -e "${BLUE}==========================================="
echo -e "DEPLOY PARA UBUNTU 24.04 LTS"
echo -e "Move Marias - Sistema de Produção"
echo -e "===========================================${NC}"

# Verificar se está executando como root
if [ "$EUID" -ne 0 ]; then
    log "ERROR" "Este script deve ser executado como root (sudo)"
    exit 1
fi

# 1. Atualizar sistema
log "INFO" "Atualizando sistema..."
apt update && apt upgrade -y

# 2. Instalar dependências do sistema
log "INFO" "Instalando dependências do sistema..."
apt install -y curl wget gnupg2 software-properties-common apt-transport-https ca-certificates lsb-release

# 3. Instalar Node.js 20.x
log "INFO" "Instalando Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verificar versão
NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
log "SUCCESS" "Node.js $NODE_VERSION e npm $NPM_VERSION instalados"

# 4. Instalar PostgreSQL 16
log "INFO" "Instalando PostgreSQL 16..."
apt install -y postgresql postgresql-contrib postgresql-client

# Iniciar e habilitar PostgreSQL
systemctl start postgresql
systemctl enable postgresql

# 5. Instalar Nginx
log "INFO" "Instalando Nginx..."
apt install -y nginx

# 6. Instalar PM2 globalmente
log "INFO" "Instalando PM2..."
npm install -g pm2

# 7. Criar usuário para aplicação
log "INFO" "Configurando usuário da aplicação..."
if ! id "movemarias" &>/dev/null; then
    useradd -r -s /bin/false movemarias
    log "SUCCESS" "Usuário movemarias criado"
fi

# 8. Criar diretórios
log "INFO" "Criando estrutura de diretórios..."
mkdir -p $APP_DIR
mkdir -p $BACKUP_DIR
mkdir -p /var/log/movemarias

# 9. Configurar PostgreSQL
log "INFO" "Configurando banco de dados..."

# Criar usuário e banco
sudo -u postgres psql << EOF
CREATE USER movemarias_user WITH PASSWORD 'MoveMarias2024!Strong#Secure';
CREATE DATABASE movemarias OWNER movemarias_user;
GRANT ALL PRIVILEGES ON DATABASE movemarias TO movemarias_user;
\q
EOF

# 10. Configurar Nginx básico
log "INFO" "Configurando Nginx..."
cat > $NGINX_CONFIG << 'EOF'
server {
    listen 80;
    server_name _;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name _;
    
    # SSL configuration (placeholder for Let's Encrypt)
    # ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=login:10m rate=10r/m;
    limit_req_zone $binary_remote_addr zone=api:10m rate=30r/m;
    limit_req_zone $binary_remote_addr zone=global:10m rate=60r/m;
    
    # Frontend
    location / {
        root /var/www/movemarias/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # API routes
    location /api/ {
        limit_req zone=api burst=10 nodelay;
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Health check
    location /health {
        proxy_pass http://localhost:3001;
        access_log off;
    }
    
    # Login rate limiting
    location /api/auth/login {
        limit_req zone=login burst=5 nodelay;
        proxy_pass http://localhost:3001;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF

# Habilitar site
ln -sf $NGINX_CONFIG /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# 11. Configurar firewall básico
log "INFO" "Configurando firewall..."
ufw --force enable
ufw allow ssh
ufw allow 'Nginx Full'
ufw allow 3001  # Backend temporário

# 12. Instalar Let's Encrypt (Certbot)
log "INFO" "Instalando Certbot para SSL..."
apt install -y certbot python3-certbot-nginx

# 13. Configurar logrotate
log "INFO" "Configurando rotação de logs..."
cat > /etc/logrotate.d/movemarias << 'EOF'
/var/log/movemarias/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0644 movemarias movemarias
    postrotate
        systemctl reload nginx
    endscript
}
EOF

# 14. Criar serviço systemd para backup
log "INFO" "Configurando serviço de backup..."
cat > /etc/systemd/system/movemarias-backup.service << 'EOF'
[Unit]
Description=Move Marias Database Backup
After=postgresql.service

[Service]
Type=oneshot
User=root
ExecStart=/var/www/movemarias/scripts/backup-database.sh
Environment=POSTGRES_DB=movemarias
Environment=POSTGRES_USER=movemarias_user
Environment=POSTGRES_PASSWORD=MoveMarias2024!Strong#Secure
Environment=POSTGRES_HOST=localhost
Environment=POSTGRES_PORT=5432
EOF

cat > /etc/systemd/system/movemarias-backup.timer << 'EOF'
[Unit]
Description=Run Move Marias backup daily
Requires=movemarias-backup.service

[Timer]
OnCalendar=daily
RandomizedDelaySec=1800
Persistent=true

[Install]
WantedBy=timers.target
EOF

# Habilitar timer de backup
systemctl daemon-reload
systemctl enable movemarias-backup.timer
systemctl start movemarias-backup.timer

# 15. Configurar monitoramento básico
log "INFO" "Configurando monitoramento..."
cat > /usr/local/bin/movemarias-monitor.sh << 'EOF'
#!/bin/bash
# Monitor básico do Move Marias

TIMESTAMP=$(date +'%Y-%m-%d %H:%M:%S')
LOG_FILE="/var/log/movemarias/monitor.log"

# Verificar se o backend está rodando
if ! pgrep -f "node.*app-production.js" > /dev/null; then
    echo "[$TIMESTAMP] ERROR: Backend não está rodando" >> $LOG_FILE
    pm2 restart movemarias-backend || pm2 start /var/www/movemarias/backend/app-production.js --name movemarias-backend
fi

# Verificar se o Nginx está rodando
if ! systemctl is-active --quiet nginx; then
    echo "[$TIMESTAMP] ERROR: Nginx não está rodando" >> $LOG_FILE
    systemctl start nginx
fi

# Verificar espaço em disco
DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 90 ]; then
    echo "[$TIMESTAMP] CRITICAL: Espaço em disco acima de 90% ($DISK_USAGE%)" >> $LOG_FILE
fi

# Health check da API
if ! curl -f http://localhost:3001/health &> /dev/null; then
    echo "[$TIMESTAMP] ERROR: API health check falhou" >> $LOG_FILE
fi
EOF

chmod +x /usr/local/bin/movemarias-monitor.sh

# Adicionar ao cron
cat > /etc/cron.d/movemarias-monitor << 'EOF'
# Monitor do Move Marias - executa a cada 5 minutos
*/5 * * * * root /usr/local/bin/movemarias-monitor.sh
EOF

# 16. Configurar segurança adicional
log "INFO" "Aplicando configurações de segurança..."

# Fail2ban básico
apt install -y fail2ban
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10
findtime = 600
bantime = 7200
EOF

systemctl enable fail2ban
systemctl start fail2ban

# 17. Configurações finais
log "INFO" "Aplicando configurações finais..."

# Definir permissões
chown -R movemarias:movemarias $APP_DIR
chown -R movemarias:movemarias $BACKUP_DIR
chown -R movemarias:movemarias /var/log/movemarias

# Recarregar serviços
systemctl reload nginx
systemctl restart postgresql

# 18. Verificar instalação
log "INFO" "Verificando instalação..."

echo -e "\n${GREEN}✅ INSTALAÇÃO CONCLUÍDA!${NC}\n"

echo -e "${BLUE}Serviços instalados:${NC}"
echo "• Node.js $(node --version)"
echo "• npm $(npm --version)"
echo "• PostgreSQL $(sudo -u postgres psql -c 'SELECT version();' | head -3 | tail -1)"
echo "• Nginx $(nginx -v 2>&1 | cut -d' ' -f3)"
echo "• PM2 $(pm2 --version)"

echo -e "\n${BLUE}Próximos passos:${NC}"
echo "1. Copiar código da aplicação para $APP_DIR"
echo "2. Instalar dependências: cd $APP_DIR && npm install"
echo "3. Build do frontend: npm run build"
echo "4. Instalar dependências do backend: cd backend && npm install"
echo "5. Configurar SSL: certbot --nginx -d seu-dominio.com"
echo "6. Iniciar aplicação: pm2 start backend/app-production.js --name movemarias-backend"
echo "7. Salvar configuração PM2: pm2 save && pm2 startup"

echo -e "\n${YELLOW}Arquivos importantes:${NC}"
echo "• Configuração Nginx: $NGINX_CONFIG"
echo "• Logs da aplicação: /var/log/movemarias/"
echo "• Backups: $BACKUP_DIR"
echo "• Diretório da aplicação: $APP_DIR"

echo -e "\n${GREEN}Deploy base concluído com sucesso!${NC}"
