#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
FRONTEND_DIR="$ROOT_DIR"
BACKEND_DIR="$ROOT_DIR/backend"

function log() {
  printf '\n[assist-move-assist] %s\n' "$1"
}

function ensure_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Erro: comando '$1' não encontrado. Instale-o antes de continuar." >&2
    exit 1
  fi
}

ensure_command npm
ensure_command node
ensure_command docker

if command -v docker compose >/dev/null 2>&1; then
  COMPOSE=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE=(docker-compose)
else
  echo "Erro: docker compose ou docker-compose não encontrados." >&2
  exit 1
fi

cd "$ROOT_DIR"

if [ ! -f "$ROOT_DIR/.env.local" ]; then
  log "Criando .env.local a partir de .env.example"
  cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env.local"
fi

if [ ! -f "$BACKEND_DIR/.env" ]; then
  log "Criando backend/.env a partir de backend/.env.example"
  cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
fi

log "Instalando dependências do frontend"
npm install --silent

log "Instalando dependências do backend"
npm --prefix "$BACKEND_DIR" install --silent

log "Iniciando Postgres e Redis via Docker"
"${COMPOSE[@]}" up -d postgres redis

POSTGRES_USER=${POSTGRES_USER:-assistmove}

log "Aguardando Postgres aceitar conexões"
until "${COMPOSE[@]}" exec -T postgres pg_isready -U "$POSTGRES_USER" >/dev/null 2>&1; do
  sleep 2
  echo "."
done

echo
log "Aplicando migrações do backend"
( cd "$BACKEND_DIR" && npm run migrate:node )

if [[ -n "${CODESPACE_NAME:-}" || -n "${CODESPACES:-}" ]]; then
  if command -v gh >/dev/null 2>&1; then
    GH_CODESPACE="${CODESPACE_NAME:-${CODESPACES:-}}"
    log "Ajustando visibilidade das portas do Codespace"
    gh codespace ports visibility 3000:public -c "$GH_CODESPACE" >/dev/null 2>&1 || true
    gh codespace ports visibility 5173:public -c "$GH_CODESPACE" >/dev/null 2>&1 || true
  else
    log "gh não encontrado; ajuste a visibilidade das portas manualmente se necessário"
  fi
fi

log "Inicializando servidores de desenvolvimento (Ctrl+C para encerrar)"
PIDS=()

(
  cd "$BACKEND_DIR"
  ENV_FILE=.env npm run dev
) &
PIDS+=($!)

(
  cd "$FRONTEND_DIR"
  npm run dev -- --host 0.0.0.0 --port 5173 --strictPort
) &
PIDS+=($!)

cleanup() {
  echo
  log "Encerrando processos e limpando recursos"
  for pid in "${PIDS[@]}"; do
    if kill -0 "$pid" >/dev/null 2>&1; then
      kill "$pid" >/dev/null 2>&1 || true
      wait "$pid" >/dev/null 2>&1 || true
    fi
  done
}

trap cleanup EXIT INT TERM

wait "${PIDS[@]}"
