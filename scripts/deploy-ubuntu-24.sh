#!/usr/bin/env bash

# Deploy automatizado em Ubuntu 24.04 LTS
# - Provisiona Node.js, PostgreSQL, Nginx, Redis
# - Clona o repositório, builda frontend/backend, aplica migrações
# - Configura systemd e Nginx com SSL (Let's Encrypt opcional)

set -euo pipefail

# ======= Configuração =======
# Edite via variáveis de ambiente (recomendado) ou altere os defaults abaixo

: "${REPO_URL:=https://github.com/brunonatanaelsr/assist-move-assist.git}"
: "${BRANCH:=main}"

# Domínio e SSL
: "${DOMAIN:?Defina DOMAIN, ex: DOMAIN=seu-dominio.com}"
: "${LETSENCRYPT_EMAIL:=}"  # se vazio, SSL não será emitido agora

# Diretórios
: "${APP_DIR:=/var/www/assist-move-assist}"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"
LOG_DIR="/var/log/assist-move-assist"

# Banco de dados
: "${DB_NAME:=movemarias}"
: "${DB_USER:=assist_user}"
: "${DB_PASS:=change-me-please}"  # substitua em produção
: "${DB_HOST:=localhost}"
: "${DB_PORT:=5432}"

# Backend/API
: "${API_PORT:=3000}"
: "${JWT_SECRET:=}"

# Frontend
: "${VITE_API_URL:=https://$DOMAIN/api}"

# ======= Funções utilitárias =======
msg() { echo -e "\033[1;34m[deploy]\033[0m $*"; }
err() { echo -e "\033[0;31m[erro]\033[0m $*" 1>&2; }

require_root() {
  if [ "$(id -u)" != "0" ]; then
    err "Execute como root: sudo $0"; exit 1; fi
}

gen_secret() {
  openssl rand -hex 32
}

# ======= Pré-checagens =======
require_root
command -v git >/dev/null || (apt-get update -y && apt-get install -y git)

msg "Atualizando sistema e instalando pacotes base..."
apt-get update -y
apt-get install -y curl ca-certificates gnupg ufw nginx redis-server jq unzip tar gettext-base

msg "Instalando Node.js 20 LTS..."
if ! command -v node >/dev/null || [ "$(node -v | cut -c2- | cut -d. -f1)" -lt 18 ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs build-essential
fi

msg "Instalando PostgreSQL..."
apt-get install -y postgresql postgresql-contrib
systemctl enable --now postgresql

msg "Habilitando e iniciando Redis..."
systemctl enable --now redis-server

msg "Configurando firewall (UFW)"
ufw allow OpenSSH || true
ufw allow 80 || true
ufw allow 443 || true
ufw --force enable || true

# ======= Banco de dados =======
if [ "${SKIP_DB_PROVISION:-0}" != "1" ]; then
  msg "Configurando usuário e banco PostgreSQL (se necessário)..."
  sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';"

  sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"

  sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"
else
  msg "Pulando provisionamento do PostgreSQL local (usando banco externo)"
fi

# ======= Estrutura de diretórios =======
msg "Criando diretórios de aplicação..."
mkdir -p "$BACKEND_DIR" "$FRONTEND_DIR" "$LOG_DIR"
chown -R www-data:www-data "$APP_DIR" "$LOG_DIR"

# ======= Obter código =======
WORKDIR="/tmp/assist-move-assist-$(date +%s)"
msg "Clonando repositório ($BRANCH)..."
git clone --branch "$BRANCH" --depth 1 "$REPO_URL" "$WORKDIR"

# ======= Backend =======
msg "Montando backend..."
rsync -a --delete "$WORKDIR/backend/" "$BACKEND_DIR/"
cd "$BACKEND_DIR"

msg "Instalando dependências do backend..."
sudo -u www-data npm ci --silent
sudo -u www-data npm run build

msg "Escrevendo arquivo de ambiente do backend..."
JWT_SECRET_VAL="${JWT_SECRET:-$(gen_secret)}"
cat > "$BACKEND_DIR/.env" <<ENV
NODE_ENV=production
PORT=${API_PORT}
FRONTEND_URL=https://${DOMAIN}

# PostgreSQL
POSTGRES_HOST=${DB_HOST}
POSTGRES_PORT=${DB_PORT}
POSTGRES_DB=${DB_NAME}
POSTGRES_USER=${DB_USER}
POSTGRES_PASSWORD=${DB_PASS}

# JWT
JWT_SECRET=${JWT_SECRET_VAL}
JWT_EXPIRES_IN=24h

# Redis
REDIS_HOST=${REDIS_HOST:-localhost}
REDIS_PORT=${REDIS_PORT:-6379}
REDIS_PASSWORD=${REDIS_PASSWORD:-}

# Segurança
CORS_ORIGIN=https://${DOMAIN}
ENABLE_WS=true
 
# Email (SMTP)
SMTP_HOST=${SMTP_HOST:-}
SMTP_PORT=${SMTP_PORT:-587}
SMTP_SECURE=${SMTP_SECURE:-false}
SMTP_USER=${SMTP_USER:-}
SMTP_PASS=${SMTP_PASS:-}
SMTP_FROM_NAME=${SMTP_FROM_NAME:-Assist Move Assist}
SMTP_FROM_EMAIL=${SMTP_FROM_EMAIL:-${SMTP_USER:-no-reply@${DOMAIN}}}

# Seed inicial (opcional)
SUPERADMIN_NAME=${SUPERADMIN_NAME:-Super Administrador}
SUPERADMIN_EMAIL=${SUPERADMIN_EMAIL:-superadmin@${DOMAIN}}
SUPERADMIN_PASSWORD=${SUPERADMIN_PASSWORD:-ChangeMe!123}
ADMIN_NAME=${ADMIN_NAME:-Administrador}
ADMIN_EMAIL=${ADMIN_EMAIL:-admin@${DOMAIN}}
ADMIN_PASSWORD=${ADMIN_PASSWORD:-ChangeMe!123}
ENV
chown www-data:www-data "$BACKEND_DIR/.env"
chmod 600 "$BACKEND_DIR/.env"

msg "Aplicando migrações do banco..."
sudo -u www-data npm run migrate || true

# Garante superadmin com as credenciais fornecidas
msg "Garantindo superadmin padrão..."
sudo -u www-data env \
  POSTGRES_HOST=${DB_HOST:-localhost} \
  POSTGRES_PORT=${DB_PORT:-5432} \
  POSTGRES_DB=${DB_NAME} \
  POSTGRES_USER=${DB_USER} \
  POSTGRES_PASSWORD=${DB_PASS} \
  SUPERADMIN_EMAIL=${SUPERADMIN_EMAIL:-superadmin@${DOMAIN}} \
  SUPERADMIN_PASSWORD=${SUPERADMIN_PASSWORD:-ChangeMe!123} \
  node scripts/seed-superadmin.js || true

# ======= Frontend =======
msg "Montando frontend..."
rsync -a --delete "$WORKDIR/public/" "$FRONTEND_DIR/public/" || true
rsync -a --delete "$WORKDIR/src/" "$FRONTEND_DIR/src/"
install -m 0644 "$WORKDIR/package.json" "$FRONTEND_DIR/package.json"
install -m 0644 "$WORKDIR/vite.config.ts" "$FRONTEND_DIR/vite.config.ts"
install -m 0644 "$WORKDIR/tsconfig.json" "$FRONTEND_DIR/tsconfig.json"
install -m 0644 "$WORKDIR/tailwind.config.ts" "$FRONTEND_DIR/tailwind.config.ts" || true
install -m 0644 "$WORKDIR/postcss.config.js" "$FRONTEND_DIR/postcss.config.js" || true
install -m 0644 "$WORKDIR/index.html" "$FRONTEND_DIR/index.html"
cd "$FRONTEND_DIR"

msg "Instalando dependências do frontend e buildando..."
sudo -u www-data npm ci --silent || sudo -u www-data npm install --silent
sudo -u www-data VITE_API_URL="$VITE_API_URL" npm run build

# ======= Systemd (backend) =======
SERVICE_FILE="/etc/systemd/system/assist-move-assist.service"
msg "Configurando serviço systemd..."
cat > "$SERVICE_FILE" <<SERVICE
[Unit]
Description=Assist Move Assist - Backend API
After=network.target postgresql.service redis-server.service

[Service]
Type=simple
User=www-data
WorkingDirectory=$BACKEND_DIR
EnvironmentFile=$BACKEND_DIR/.env
ExecStart=/usr/bin/node $BACKEND_DIR/dist/app.js
Restart=always
RestartSec=5
StandardOutput=append:$LOG_DIR/backend-out.log
StandardError=append:$LOG_DIR/backend-error.log

[Install]
WantedBy=multi-user.target
SERVICE

systemctl daemon-reload
systemctl enable --now assist-move-assist

# ======= Nginx =======
SITE_FILE="/etc/nginx/sites-available/assist-move-assist"
msg "Configurando Nginx..."
if [ -f "$WORKDIR/config/nginx-ssl-production.tmpl" ] && command -v envsubst >/dev/null 2>&1; then
  FRONTEND_DIR_ESCAPED="$FRONTEND_DIR/dist"
  export DOMAIN API_PORT FRONTEND_DIR="$FRONTEND_DIR_ESCAPED"
  envsubst < "$WORKDIR/config/nginx-ssl-production.tmpl" > "$SITE_FILE"
else
cat > "$SITE_FILE" <<NGINX
server {
  listen 80;
  server_name ${DOMAIN};

  # Redirect HTTP->HTTPS se SSL estiver instalado depois
  location /.well-known/acme-challenge/ { root /var/www/letsencrypt; }
  location / {
    return 301 https://\$host\$request_uri;
  }
}

server {
  listen 443 ssl http2;
  server_name ${DOMAIN};

  ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
  ssl_protocols TLSv1.2 TLSv1.3;

  # Frontend (arquivos estáticos)
  root ${FRONTEND_DIR}/dist;
  index index.html;

  location / {
    try_files \$uri \$uri/ /index.html;
  }

  # API backend proxy
  location /api/ {
    proxy_pass http://127.0.0.1:${API_PORT}/api/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_cache_bypass \$http_upgrade;
  }

  # WebSockets (Socket.IO)
  location /socket.io/ {
    proxy_pass http://127.0.0.1:${API_PORT}/socket.io/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection "Upgrade";
    proxy_set_header Host \$host;
  }
}
NGINX
fi

ln -sf "$SITE_FILE" /etc/nginx/sites-enabled/assist-move-assist
nginx -t
systemctl reload nginx

# ======= SSL (Let's Encrypt) opcional =======
if [ -n "$LETSENCRYPT_EMAIL" ]; then
  msg "Emitindo certificado SSL com Let's Encrypt..."
  apt-get install -y certbot python3-certbot-nginx
  certbot --nginx -d "$DOMAIN" -m "$LETSENCRYPT_EMAIL" --agree-tos --no-eff-email --redirect || true
  systemctl reload nginx || true
fi

# ======= Backup diário opcional =======
if [ -f "$WORKDIR/scripts/setup-cron-backup.sh" ]; then
  msg "Instalando rotina de backup..."
  bash "$WORKDIR/scripts/setup-cron-backup.sh" || true
fi

# ======= Limpeza =======
rm -rf "$WORKDIR"

msg "Deploy concluído!"
echo "- Site: https://${DOMAIN}"
echo "- API:  https://${DOMAIN}/api"
echo "- Health: curl -s https://${DOMAIN}/health || curl -s http://localhost:${API_PORT}/health"
