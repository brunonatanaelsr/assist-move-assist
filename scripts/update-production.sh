#!/bin/bash

# Script de atualização do sistema em produção
# Para usar quando houver updates no código

set -e

echo "🔄 Iniciando atualização do Assist Move Assist..."
echo "📅 $(date)"

# Variáveis
APP_DIR="/var/www/assist-move-assist"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"

echo "📥 Fazendo backup antes da atualização..."
sudo /usr/local/bin/assist-backup.sh

echo "📦 Baixando atualizações do repositório..."
cd /tmp
rm -rf assist-move-assist
git clone https://github.com/brunonatanaelsr/assist-move-assist.git
cd assist-move-assist

echo "⏸️ Parando serviços..."
sudo systemctl stop assist-move-assist

echo "🔧 Atualizando backend..."
# Backup do .env atual
cp $BACKEND_DIR/.env /tmp/env_backup

# Atualizar arquivos do backend
sudo rm -rf $BACKEND_DIR/src $BACKEND_DIR/dist
sudo cp -r backend/src $BACKEND_DIR/
sudo cp backend/package.json $BACKEND_DIR/
sudo cp backend/tsconfig.json $BACKEND_DIR/

# Restaurar .env
sudo cp /tmp/env_backup $BACKEND_DIR/.env

# Atualizar dependências e recompilar
cd $BACKEND_DIR
sudo -u www-data npm install --production
sudo -u www-data npm run build

echo "🎨 Atualizando frontend..."
# Backup das configurações
cp $FRONTEND_DIR/.env.production /tmp/frontend_env_backup

# Atualizar frontend
sudo rm -rf $FRONTEND_DIR/src $FRONTEND_DIR/dist
sudo cp -r /tmp/assist-move-assist/src $FRONTEND_DIR/
sudo cp -r /tmp/assist-move-assist/public $FRONTEND_DIR/
sudo cp /tmp/assist-move-assist/package.json $FRONTEND_DIR/
sudo cp /tmp/assist-move-assist/vite.config.ts $FRONTEND_DIR/
sudo cp /tmp/assist-move-assist/tsconfig.json $FRONTEND_DIR/
sudo cp /tmp/assist-move-assist/tailwind.config.ts $FRONTEND_DIR/
sudo cp /tmp/assist-move-assist/postcss.config.js $FRONTEND_DIR/
sudo cp /tmp/assist-move-assist/components.json $FRONTEND_DIR/
sudo cp /tmp/assist-move-assist/index.html $FRONTEND_DIR/

# Restaurar configurações
sudo cp /tmp/frontend_env_backup $FRONTEND_DIR/.env.production

# Recompilar frontend
cd $FRONTEND_DIR
sudo -u www-data npm install
sudo -u www-data npm run build

echo "🔄 Executando migrações (se houver)..."
cd $BACKEND_DIR
sudo -u www-data npm run migrate || true

echo "🚀 Reiniciando serviços..."
sudo systemctl start assist-move-assist
sudo systemctl reload nginx

echo "⏳ Aguardando serviços subirem..."
sleep 10

echo "🔍 Verificando status..."
if systemctl is-active --quiet assist-move-assist; then
    echo "✅ Backend ativo"
else
    echo "❌ Problema no backend"
    exit 1
fi

if systemctl is-active --quiet nginx; then
    echo "✅ Nginx ativo"
else
    echo "❌ Problema no Nginx"
    exit 1
fi

echo "🧹 Limpando arquivos temporários..."
rm -rf /tmp/assist-move-assist /tmp/env_backup /tmp/frontend_env_backup

echo ""
echo "✅ Atualização concluída com sucesso!"
echo "📅 $(date)"
echo "🌐 Sistema disponível em: https://<SEU_DOMINIO>"
