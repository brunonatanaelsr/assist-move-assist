#!/usr/bin/env bash
set -euo pipefail

MESSAGE=${1:-"(sem mensagem)"}
WEBHOOK=${SLACK_WEBHOOK:-}

if [ -z "$WEBHOOK" ]; then
  echo "[slack] SLACK_WEBHOOK não configurado; ignorando alerta: $MESSAGE"
  exit 0
fi

payload=$(jq -n --arg text "$MESSAGE" '{text: $text}')
curl -s -X POST -H 'Content-type: application/json' --data "$payload" "$WEBHOOK" >/dev/null || true

