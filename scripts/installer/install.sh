#!/usr/bin/env bash
set -euo pipefail

# Install wizard for Assist Move Assist on Ubuntu 24.04 LTS

require_root() {
  if [ "$(id -u)" != "0" ]; then
    echo "Execute como root: sudo $0"; exit 1; fi
}

has() { command -v "$1" >/dev/null 2>&1; }

prompt() {
  local var="$1"; local title="$2"; local default_val="${3:-}"; local result="";
  if has whiptail; then
    result=$(whiptail --inputbox "$title" 10 70 "$default_val" 3>&1 1>&2 2>&3 || true)
  else
    read -rp "$title [${default_val}]: " result; result="${result:-$default_val}"
  fi
  eval "$var=""\$result"""
}

confirm() {
  local title="$1"; local default_yes="${2:-1}"; local rc=1;
  if has whiptail; then
    if whiptail --yesno "$title" 10 70; then rc=0; else rc=1; fi
  else
    local yn="n"; [ "$default_yes" = "1" ] && yn="y"
    read -rp "$title [y/N]: " ans; ans=${ans:-$yn}; [[ "$ans" =~ ^[Yy]$ ]] && rc=0 || rc=1
  fi
  return $rc
}

require_root
apt-get update -y
apt-get install -y whiptail jq curl git ca-certificates gnupg gettext-base

DOMAIN=""; EMAIL_LETSENCRYPT=""; API_PORT="3000";
DB_EXTERNAL=0; DB_HOST="localhost"; DB_PORT="5432"; DB_NAME="movemarias"; DB_USER="assist_user"; DB_PASS="";
REDIS_HOST="localhost"; REDIS_PORT="6379";
SMTP_HOST=""; SMTP_PORT="587"; SMTP_SECURE="false"; SMTP_USER=""; SMTP_PASS=""; SMTP_FROM_NAME="Assist Move Assist"; SMTP_FROM_EMAIL="";
SUPERADMIN_NAME="Super Administrador"; SUPERADMIN_EMAIL=""; SUPERADMIN_PASSWORD="";
ADMIN_NAME="Administrador"; ADMIN_EMAIL=""; ADMIN_PASSWORD="";

prompt DOMAIN "Informe o domínio público (ex: app.seudominio.com)" ""
if [ -n "$DOMAIN" ]; then
  if confirm "Emitir certificado SSL (Let's Encrypt) para $DOMAIN?" 1; then
    prompt EMAIL_LETSENCRYPT "Email para Let's Encrypt (notificações SSL)" "admin@$DOMAIN"
  fi
fi

prompt API_PORT "Porta da API (Node.js)" "$API_PORT"

if confirm "Usar banco de dados PostgreSQL EXTERNO? (se não, será instalado localmente)" 0; then
  DB_EXTERNAL=1
  prompt DB_HOST "Host do PostgreSQL" "$DB_HOST"
  prompt DB_PORT "Porta do PostgreSQL" "$DB_PORT"
  prompt DB_NAME "Nome do banco" "$DB_NAME"
  prompt DB_USER "Usuário do banco" "$DB_USER"
  prompt DB_PASS "Senha do banco" ""
else
  prompt DB_NAME "Nome do banco (local)" "$DB_NAME"
  prompt DB_USER "Usuário do banco (local)" "$DB_USER"
  prompt DB_PASS "Senha do banco (local)" ""
fi

prompt REDIS_HOST "Host do Redis" "$REDIS_HOST"
prompt REDIS_PORT "Porta do Redis" "$REDIS_PORT"

if confirm "Configurar SMTP para envio de emails?" 1; then
  prompt SMTP_HOST "SMTP host" "smtp.gmail.com"
  prompt SMTP_PORT "SMTP port (587 TLS / 465 SSL)" "587"
  if confirm "Conexão segura (SSL)? (escolha 'Sim' para 465)" 0; then SMTP_SECURE="true"; else SMTP_SECURE="false"; fi
  prompt SMTP_USER "SMTP usuário (email)" ""
  prompt SMTP_PASS "SMTP senha/app password" ""
  prompt SMTP_FROM_NAME "Nome do remetente" "$SMTP_FROM_NAME"
  prompt SMTP_FROM_EMAIL "Email do remetente" "${SMTP_USER}"
fi

if confirm "Criar usuário SUPERADMIN inicial?" 1; then
  prompt SUPERADMIN_NAME "Nome do superadmin" "$SUPERADMIN_NAME"
  prompt SUPERADMIN_EMAIL "Email do superadmin" "superadmin@$DOMAIN"
  prompt SUPERADMIN_PASSWORD "Senha do superadmin" ""
fi

if confirm "Criar usuário ADMIN inicial?" 1; then
  prompt ADMIN_NAME "Nome do admin" "$ADMIN_NAME"
  prompt ADMIN_EMAIL "Email do admin" "admin@$DOMAIN"
  prompt ADMIN_PASSWORD "Senha do admin" ""
fi

# Preparar variáveis para deploy
export DOMAIN API_PORT VITE_API_URL="${DOMAIN:+https://$DOMAIN/api}"
export DB_NAME DB_USER DB_PASS DB_HOST DB_PORT
export SMTP_HOST SMTP_PORT SMTP_SECURE SMTP_USER SMTP_PASS SMTP_FROM_NAME SMTP_FROM_EMAIL
export SUPERADMIN_NAME SUPERADMIN_EMAIL SUPERADMIN_PASSWORD ADMIN_NAME ADMIN_EMAIL ADMIN_PASSWORD
export LETSENCRYPT_EMAIL="$EMAIL_LETSENCRYPT"

if [ "$DB_EXTERNAL" = "1" ]; then
  export SKIP_DB_PROVISION=1
else
  unset DB_HOST DB_PORT # deploy script usa localhost para provisionar
fi

echo "Iniciando deploy automatizado..."
bash "$(dirname "$0")/../deploy-ubuntu-24.sh"

echo "\n===================================="
echo "✅ Instalação concluída!"
if [ -n "$DOMAIN" ]; then
  echo "🌐 Site: https://$DOMAIN"
  echo "🧩 API:  https://$DOMAIN/api"
else
  echo "🌐 Site: http://<IP>:8080 (preview)"
  echo "🧩 API:  http://<IP>:${API_PORT}/api"
fi
echo "⚠️  Guarde com segurança os logins criados."

