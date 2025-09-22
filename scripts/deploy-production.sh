#!/bin/bash
set -euo pipefail

# Configurações
SERVER="root@92.242.187.94"
DOMAIN="movemarias.squadsolucoes.com.br"
APP_DIR="/opt/movemarias"
GITHUB_REPO="https://github.com/brunonatanaelsr/assist-move-assist.git"
BRANCH="main"

echo "🚀 Iniciando deploy em produção..."

# Conectar na VPS e executar a instalação
ssh $SERVER "bash -s" << 'ENDSSH'
set -euo pipefail

# Instalar dependências do sistema
echo "📦 Instalando dependências do sistema..."
apt-get update
apt-get install -y curl git nginx postgresql postgresql-contrib redis-server certbot python3-certbot-nginx

# Instalar Node.js 20.x
echo "📦 Instalando Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Configurar diretório da aplicação
echo "📁 Configurando diretório da aplicação..."
mkdir -p /opt/movemarias
cd /opt/movemarias

# Clonar repositório
echo "📥 Clonando repositório..."
if [ -d ".git" ]; then
  git fetch origin
  git reset --hard origin/main
else
  git clone https://github.com/brunonatanaelsr/assist-move-assist.git .
  git checkout main
fi

# Instalar PM2 globalmente
echo "📦 Instalando PM2..."
npm install -g pm2

# Configurar banco de dados PostgreSQL
echo "🗄️ Configurando PostgreSQL..."
sudo -u postgres psql -c "CREATE DATABASE movemarias;" || true
sudo -u postgres psql -c "CREATE USER movemarias WITH PASSWORD 'movemarias';" || true
sudo -u postgres psql -c "ALTER USER movemarias WITH SUPERUSER;" || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE movemarias TO movemarias;" || true

# Configurar frontend
echo "🎨 Configurando frontend..."
npm install
npm run build

# Configurar backend
echo "⚙️ Configurando backend..."
cd backend
npm install
npm run build

# Criar arquivo .env para o backend
cat > .env << EOL
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://movemarias:movemarias@localhost:5432/movemarias
JWT_SECRET=your_production_secret_key_here
CORS_ORIGIN=https://movemarias.squadsolucoes.com.br
REDIS_HOST=localhost
REDIS_PORT=6379
EOL

# Executar migrações do banco de dados
echo "🔄 Executando migrações..."
npm run migrate

# Configurar PM2
echo "🔧 Configurando PM2..."
pm2 delete movemarias-api || true
pm2 start dist/main.js --name movemarias-api
pm2 save
pm2 startup

# Configurar Nginx
echo "🌐 Configurando Nginx..."
cat > /etc/nginx/sites-available/movemarias << 'EOL'
server {
    server_name movemarias.squadsolucoes.com.br;

    location / {
        root /opt/movemarias/dist;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOL

# Ativar configuração do Nginx
ln -sf /etc/nginx/sites-available/movemarias /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Testar configuração do Nginx
nginx -t

# Reiniciar Nginx
systemctl restart nginx

# Configurar SSL com Certbot
echo "🔒 Configurando SSL..."
certbot --nginx -d movemarias.squadsolucoes.com.br --non-interactive --agree-tos --email seu-email@exemplo.com

echo "✅ Deploy concluído com sucesso!"
ENDSSH