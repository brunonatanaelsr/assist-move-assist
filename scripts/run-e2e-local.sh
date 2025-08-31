#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." &> /dev/null && pwd)
BACKEND_DIR="$ROOT_DIR/backend"

API_HOST="127.0.0.1"
API_PORT="3000"
API_URL="http://${API_HOST}:${API_PORT}"

echo "[e2e-local] Building backend..."
pushd "$BACKEND_DIR" >/dev/null
npm run -s build

echo "[e2e-local] Starting backend (${API_URL})..."
node dist/app.js &
BACKEND_PID=$!

cleanup() {
  echo "[e2e-local] Stopping backend (pid=$BACKEND_PID)..."
  kill $BACKEND_PID 2>/dev/null || true
  wait $BACKEND_PID 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "[e2e-local] Waiting for API health..."
for i in {1..60}; do
  if curl -sf "${API_URL}/health" >/dev/null; then
    echo "[e2e-local] API is up."
    break
  fi
  sleep 1
  if [ $i -eq 60 ]; then
    echo "[e2e-local] API failed to start." >&2
    exit 1
  fi
done

popd >/dev/null

echo "[e2e-local] Running Playwright tests with API URL: ${API_URL}"
PLAYWRIGHT_API_URL="${API_URL}" npm run -s test:e2e

echo "[e2e-local] Done."

