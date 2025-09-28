# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project aims to follow semantic versioning when releasing tagged versions. Until then, entries below reflect the current main branch state.

## [Unreleased]

### Added

- Production Dockerfiles: `apps/backend/Dockerfile.production` and `Dockerfile.frontend.production`.
- Docker compose for production: `docker-compose.prod.yml` (Postgres, Redis, Backend, Frontend).
- Local E2E script: `scripts/run-e2e-local.sh` (levanta DB/Redis via Docker, migra/seed, inicia API, builda front e roda Playwright).
- DB migration with indexes to improve queries over `formularios`:
  - `apps/backend/src/database/migrations/032_add_formularios_indexes.sql` (beneficiaria_id, tipo, created_at).
- DELETE endpoint for generic forms: `DELETE /api/formularios/:id`.

### Changed

- Frontend API consumption consolidated to the central axios client (`src/services/apiService.ts`).
  - Updated: `src/pages/Analytics.tsx`, `src/pages/CadastroBeneficiaria.tsx`, `src/pages/formularios/VisaoHolistica.tsx`, `src/hooks/useApi.ts`.
- Backend authentication consolidated to `services/auth.service.ts`.
  - Middleware `authenticateToken` and WebSocket now use `authService.validateToken`.
- E2E pipeline is now blocking (no `continue-on-error`), and uploads Playwright report/trace on failures.
- Zod validations enforced on critical endpoints:
  - Beneficiárias (POST/PUT), Formulários genéricos (POST), Notificações (PATCH/PUT/POST).
- ProtectedRoute shows a login CTA (with H1) when unauthenticated; avoids auto-redirect loops and stabilizes E2E.
- Sidebar “Dashboard” now points to `/dashboard` and exposes reliable data-testids.
- Frontend API base is unified via `API_URL` (build-time through Vite env).
- README updated with: correct ports, env variables, E2E flow (including the local E2E script) and compose production.
- DB migrations renumbered to avoid duplicate prefixes and reapplications:
  - `032_normalizar_status_beneficiarias.sql` → `033_normalizar_status_beneficiarias.sql`.
  - `033_criar_organizacoes.sql` → `034_criar_organizacoes.sql`.
  - `034_permissions_organizacoes.sql` → `035_permissions_organizacoes.sql`.
  - `040_criar_oficina_presencas.sql` → `036_criar_oficina_presencas.sql`.
  - `041_alter_beneficiarias_dominios.sql` → `037_alter_beneficiarias_dominios.sql`.
  - `042_criar_planos_acao.sql` → `038_criar_planos_acao.sql`.
  - `043_alter_oficina_presencas.sql` → `039_alter_oficina_presencas.sql`.
  - `044_update_role_matrix.sql` → `040_update_role_matrix.sql`.
  - `045_alter_termos_consentimento_add_revogacao.sql` → `041_alter_termos_consentimento_add_revogacao.sql`.
  - `045_create_audit_logs.sql` → `042_create_audit_logs.sql`.
  - `046_add_mensagens_threads.sql` → `043_add_mensagens_threads.sql`.
  - `046_alter_termos_consentimento_add_metadata.sql` → `044_alter_termos_consentimento_add_metadata.sql`.
  - `047_criar_push_subscriptions.sql` → `045_criar_push_subscriptions.sql`.
  - `048_criar_job_queue.sql` → `046_criar_job_queue.sql`.
  - `048_criar_login_attempts_user_blocks.sql` → `047_criar_login_attempts_user_blocks.sql`.

### Fixed

- 404 caused by duplicated `/api/api/auth/login` in E2E by using the central axios instance and removing global axios defaults/`fetch` monkeypatch.
- E2E flakiness for login by adding a visible CTA and waiting for `networkidle` in setup.
- Beneficiária creation payload mapping (`telefone/endereco` etc.) aligned to backend expectations.

### Removed

- Legacy frontend fetch client: `src/lib/api.ts`.
- Legacy MUI Sidebar: `src/components/Sidebar.tsx`.

### CI/CD

- Seeds applied in CI (superadmin + initial data) before E2E run.
- Artifacts upload on E2E failure (Playwright HTML report + trace zip).

### Notes

- Some hooks (e.g., `useAtividades`) use dashboard activities as a placeholder because there is no dedicated backend endpoint by beneficiária yet. Consider adding `GET /beneficiarias/:id/atividades` to remove this workaround.
- Consider adding a tagged release and freezing current state as v0.1.0.
