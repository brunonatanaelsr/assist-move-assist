#!/bin/bash
set -euo pipefail

# Caminho do script auxiliar (deploy-ubuntu-24.sh)
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
BASE_DEPLOY_SCRIPT="$SCRIPT_DIR/deploy-ubuntu-24.sh"
REMOTE_SCRIPT_PATH="/tmp/movemarias-deploy.sh"

if [[ ! -f "$BASE_DEPLOY_SCRIPT" ]]; then
  echo "❌ Script base não encontrado: $BASE_DEPLOY_SCRIPT" >&2
  exit 1
fi

# ============================
# Configurações (sobrescreva via variável de ambiente)
# ============================
SERVER=${SERVER:-"root@92.242.187.94"}
DOMAIN=${DOMAIN:-"movemarias.squadsolucoes.com.br"}
APP_DIR=${APP_DIR:-"/opt/movemarias"}
GITHUB_REPO=${GITHUB_REPO:-"https://github.com/brunonatanaelsr/assist-move-assist.git"}
BRANCH=${BRANCH:-"main"}
DB_NAME=${DB_NAME:-"movemarias"}
DB_USER=${DB_USER:-"movemarias"}
DB_PASS=${DB_PASS:-"movemarias"}
DB_HOST=${DB_HOST:-"localhost"}
DB_PORT=${DB_PORT:-"5432"}
API_PORT=${API_PORT:-"3000"}
VITE_API_URL=${VITE_API_URL:-"https://${DOMAIN}/api"}
LETSENCRYPT_EMAIL=${LETSENCRYPT_EMAIL:-""}
JWT_SECRET=${JWT_SECRET:-""}
SUPERADMIN_EMAIL=${SUPERADMIN_EMAIL:-"superadmin@${DOMAIN}"}
SUPERADMIN_PASSWORD=${SUPERADMIN_PASSWORD:-"ChangeMe!123"}
ADMIN_EMAIL=${ADMIN_EMAIL:-"admin@${DOMAIN}"}
ADMIN_PASSWORD=${ADMIN_PASSWORD:-"ChangeMe!123"}
SKIP_DB_PROVISION=${SKIP_DB_PROVISION:-""}
SSH_OPTIONS=${SSH_OPTIONS:-"-o StrictHostKeyChecking=accept-new"}

# Variáveis opcionais adicionais
REDIS_HOST=${REDIS_HOST:-""}
REDIS_PORT=${REDIS_PORT:-""}
REDIS_PASSWORD=${REDIS_PASSWORD:-""}
SMTP_HOST=${SMTP_HOST:-""}
SMTP_PORT=${SMTP_PORT:-""}
SMTP_SECURE=${SMTP_SECURE:-""}
SMTP_USER=${SMTP_USER:-""}
SMTP_PASS=${SMTP_PASS:-""}
SMTP_FROM_NAME=${SMTP_FROM_NAME:-""}
SMTP_FROM_EMAIL=${SMTP_FROM_EMAIL:-""}

printf '🚀 Iniciando deploy em produção para %s\n' "$DOMAIN"

# Envia o script base para a VPS
echo '📤 Enviando script de provisionamento...'
scp $SSH_OPTIONS "$BASE_DEPLOY_SCRIPT" "$SERVER:$REMOTE_SCRIPT_PATH"

cleanup() {
  ssh $SSH_OPTIONS "$SERVER" "rm -f $REMOTE_SCRIPT_PATH" >/dev/null 2>&1 || true
}
trap cleanup EXIT

# Garante permissão de execução
echo '🔧 Preparando script remoto...'
ssh $SSH_OPTIONS "$SERVER" "chmod +x $REMOTE_SCRIPT_PATH"

# Monta variáveis de ambiente a serem passadas para o script remoto
declare -a remote_env=(
  "DOMAIN=$DOMAIN"
  "APP_DIR=$APP_DIR"
  "REPO_URL=$GITHUB_REPO"
  "BRANCH=$BRANCH"
  "DB_NAME=$DB_NAME"
  "DB_USER=$DB_USER"
  "DB_PASS=$DB_PASS"
  "DB_HOST=$DB_HOST"
  "DB_PORT=$DB_PORT"
  "API_PORT=$API_PORT"
  "VITE_API_URL=$VITE_API_URL"
  "LETSENCRYPT_EMAIL=$LETSENCRYPT_EMAIL"
  "JWT_SECRET=$JWT_SECRET"
  "SUPERADMIN_EMAIL=$SUPERADMIN_EMAIL"
  "SUPERADMIN_PASSWORD=$SUPERADMIN_PASSWORD"
  "ADMIN_EMAIL=$ADMIN_EMAIL"
  "ADMIN_PASSWORD=$ADMIN_PASSWORD"
)

# Variáveis opcionais apenas se definidas
for var in REDIS_HOST REDIS_PORT REDIS_PASSWORD SMTP_HOST SMTP_PORT SMTP_SECURE SMTP_USER SMTP_PASS SMTP_FROM_NAME SMTP_FROM_EMAIL SKIP_DB_PROVISION; do
  value=${!var}
  if [[ -n "$value" ]]; then
    remote_env+=("$var=$value")
  fi
done

# Escapa valores para passagem segura via SSH
escaped_env=()
for entry in "${remote_env[@]}"; do
  var_name=${entry%%=*}
  var_value=${entry#*=}
  printf -v escaped_value '%q' "$var_value"
  escaped_env+=("$var_name=$escaped_value")
done

remote_command="${escaped_env[*]} $REMOTE_SCRIPT_PATH"

echo '🚚 Executando script na VPS...'
ssh $SSH_OPTIONS "$SERVER" "$remote_command"

echo '✅ Deploy finalizado com sucesso!'
