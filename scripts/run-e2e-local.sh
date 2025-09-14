#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." &> /dev/null && pwd)
BACKEND_DIR="$ROOT_DIR/backend"

API_HOST="127.0.0.1"
API_PORT="3000"
API_URL="http://${API_HOST}:${API_PORT}"

echo "[e2e-local] Checking Docker availability..."
if ! command -v docker >/dev/null 2>&1; then
  echo "[e2e-local] Docker is required to run local E2E with API. Please install Docker Desktop or run the CI pipeline."
  exit 1
fi

PG_CONT=assist_e2e_pg
REDIS_CONT=assist_e2e_redis

cleanup() {
  echo "[e2e-local] Cleaning up..."
  docker rm -f "$PG_CONT" >/dev/null 2>&1 || true
  docker rm -f "$REDIS_CONT" >/dev/null 2>&1 || true
  if [ -n "${BACKEND_PID:-}" ]; then
    kill "$BACKEND_PID" 2>/dev/null || true
    wait "$BACKEND_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

echo "[e2e-local] Starting Postgres + Redis..."
docker rm -f "$PG_CONT" >/dev/null 2>&1 || true
docker run -d --name "$PG_CONT" -e POSTGRES_DB=movemarias_test \
  -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16 >/dev/null

docker rm -f "$REDIS_CONT" >/dev/null 2>&1 || true
docker run -d --name "$REDIS_CONT" -p 6379:6379 redis:7 >/dev/null

echo "[e2e-local] Waiting for Postgres..."
for i in {1..60}; do
  if docker exec "$PG_CONT" pg_isready -h localhost -U postgres -d movemarias_test >/dev/null 2>&1; then
    break
  fi
  sleep 1
  if [ $i -eq 60 ]; then echo "[e2e-local] Postgres failed to start" >&2; exit 1; fi
done

echo "[e2e-local] Installing backend deps + building..."
(cd "$BACKEND_DIR" && npm ci && npm run -s build)

echo "[e2e-local] Running migrations + seeds..."
(cd "$BACKEND_DIR" && \
  POSTGRES_HOST=127.0.0.1 POSTGRES_DB=movemarias_test POSTGRES_USER=postgres POSTGRES_PASSWORD=postgres \
  node scripts/migrate-node.js && \
  node scripts/seed-superadmin.js && \
  node scripts/create-initial-data.js)

echo "[e2e-local] Starting backend (${API_URL})..."
(
  cd "$BACKEND_DIR"
  PORT=3000 POSTGRES_HOST=127.0.0.1 POSTGRES_DB=movemarias_test POSTGRES_USER=postgres POSTGRES_PASSWORD=postgres \
  JWT_SECRET=test_secret ENABLE_WS=true CORS_ORIGIN=http://127.0.0.1:4173 \
  npm start
) & BACKEND_PID=$!

echo "[e2e-local] Waiting for API health..."
for i in {1..60}; do
  if curl -sf "${API_URL}/api/health" >/dev/null; then
    echo "[e2e-local] API is up."
    break
  fi
  sleep 1
  if [ $i -eq 60 ]; then echo "[e2e-local] API failed to start." >&2; exit 1; fi
done

echo "[e2e-local] Building frontend in e2e mode..."
(cd "$ROOT_DIR" && \
  printf "VITE_API_BASE_URL=%s\nVITE_WS_URL=ws://127.0.0.1:3000\n" "$API_URL/api" > .env.e2e && \
  npm ci && npm run -s build -- --mode e2e)

echo "[e2e-local] Installing Playwright browsers (if needed)..."
(cd "$ROOT_DIR" && npx playwright install --with-deps)

echo "[e2e-local] Running Playwright E2E (Chromium)..."
(cd "$ROOT_DIR" && npx playwright test --project=chromium)

echo "[e2e-local] Done."
