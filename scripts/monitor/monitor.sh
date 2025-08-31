#!/usr/bin/env bash
set -euo pipefail

DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)
source "$DIR/config.env" || { echo "config.env não encontrado"; exit 1; }

DOMAIN=${DOMAIN:-}
API_URL=${API_URL:-}
BACKUP_DIR=${BACKUP_DIR:-/var/backups/assist-move-assist}
NGINX_ERROR_LOG=${NGINX_ERROR_LOG:-/var/log/nginx/error.log}
SSL_WARN_DAYS=${SSL_WARN_DAYS:-7}

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
alert() { "$DIR/slack-alert.sh" "$*"; }

# 1) Health backend e site
if [ -n "$API_URL" ]; then
  code=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health" || echo 000)
  if [ "$code" != "200" ]; then
    msg="[ALERTA] Health API falhou ($API_URL/health => $code)"
    log "$msg"; alert "$msg"
  else
    log "API health OK ($API_URL/health => $code)"
  fi
fi

if [ -n "$DOMAIN" ]; then
  code=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN" || echo 000)
  if [ "$code" != "200" ]; then
    msg="[ALERTA] Site falhou (https://$DOMAIN => $code)"
    log "$msg"; alert "$msg"
  else
    log "Site OK (https://$DOMAIN => $code)"
  fi
fi

# 2) 5xx recentes no Nginx (últimos 5 minutos)
if [ -f "$NGINX_ERROR_LOG" ]; then
  recent_errors=$(tail -n 2000 "$NGINX_ERROR_LOG" | grep -E "$(date -u +"%d/%b/%Y:%H:%M" -d "-5 min" 2>/dev/null || date +"%d/%b/%Y:%H:%M")" -A 999999 2>/dev/null | wc -l | tr -d ' ')
  if [ "${recent_errors:-0}" -gt 10 ]; then
    msg="[ALERTA] Muitos erros no Nginx (últimos 5 min): $recent_errors"
    log "$msg"; alert "$msg"
  else
    log "Erros Nginx últimos 5 min: $recent_errors"
  fi
fi

# 3) Backup recente (últimas 24h)
if [ -d "$BACKUP_DIR" ]; then
  backups=$(find "$BACKUP_DIR" -type f -mtime -1 | wc -l | tr -d ' ')
  if [ "${backups:-0}" -eq 0 ]; then
    msg="[ALERTA] Nenhum backup encontrado nas últimas 24h em $BACKUP_DIR"
    log "$msg"; alert "$msg"
  else
    log "Backups nas últimas 24h: $backups"
  fi
fi

# 4) SSL expiração
if [ -n "$DOMAIN" ]; then
  expiry=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null | openssl x509 -noout -dates | grep notAfter | cut -d= -f2 || true)
  if [ -n "$expiry" ]; then
    expiry_epoch=$(date -d "$expiry" +%s 2>/dev/null || date -jf "%b %d %T %Y %Z" "$expiry" +%s 2>/dev/null || echo 0)
    now_epoch=$(date +%s)
    days=$(( (expiry_epoch - now_epoch) / 86400 ))
    log "SSL expira em $days dias ($expiry)"
    if [ "$days" -le "$SSL_WARN_DAYS" ]; then
      msg="[ALERTA] Certificado SSL expira em $days dias para $DOMAIN"
      alert "$msg"
    fi
  else
    msg="[ALERTA] Não foi possível verificar expiração SSL para $DOMAIN"
    log "$msg"; alert "$msg"
  fi
fi

log "Monitor finalizado."

