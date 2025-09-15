#!/bin/bash
set -euo pipefail

# Detect workspace path (Codespaces vs local)
if [ -d "/workspaces/assist-move-assist/backend" ]; then
  cd /workspaces/assist-move-assist/backend
elif [ -d "backend" ]; then
  cd backend
else
  echo "Backend directory not found" >&2
  exit 1
fi

echo "[*] Installing deps (if needed)"
npm ci --prefer-offline || npm install

echo "[*] Running migrations (best-effort)"
npm run migrate:node || echo "(warn) migration failed or DB unavailable, continuing"

echo "[*] Starting backend in dev mode"
npm run dev
