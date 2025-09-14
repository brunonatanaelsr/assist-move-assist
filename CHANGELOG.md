# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project aims to follow semantic versioning when releasing tagged versions. Until then, entries below reflect the current main branch state.

## [Unreleased]

### Added
- Production Dockerfiles: `backend/Dockerfile.production` and `Dockerfile.frontend.production`.
- Docker compose for production: `docker-compose.prod.yml` (Postgres, Redis, Backend, Frontend).
- Local E2E script: `scripts/run-e2e-local.sh` (levanta DB/Redis via Docker, migra/seed, inicia API, builda front e roda Playwright).
- DB migration with indexes to improve queries over `formularios`:
  - `backend/src/database/migrations/032_add_formularios_indexes.sql` (beneficiaria_id, tipo, created_at).
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

