# Admin Guide — Roles, Permissions and Smokes

This document explains how RBAC works in this project, the default role presets, how to grant permissions via the UI, how authorize() behaves (and caches), and how to run smoke tests locally and in CI.

## Overview

- RBAC consists of two tables in Postgres:
  - `role_permissions(role, permission)` — permissions assigned to a role (aka paper/papel)
  - `user_permissions(user_id, permission)` — extra permissions granted per user
- Effective permissions = union(role_permissions[role] ∪ user_permissions[user]).
- The middleware `authorize(required)` enforces permissions on backend routes.
- Superuser roles `superadmin` and `super_admin` bypass all checks.

## Default Presets (migrations)

Presets are applied by SQL migrations and can be re-applied on fresh databases.

- `admin`: all permissions in `permissions` table
- `gestor`: all of `beneficiarias.*`, `projetos.*`, `oficinas.*`
- `operador`: `beneficiarias.ler`, `oficinas.ler`, `oficinas.presencas.registrar`
- `profissional`: `beneficiarias.ler`, `projetos.ler`, `oficinas.ler`, `oficinas.presencas.registrar`
- `analista`: all of `relatorios.*`

Migrations that define presets and permissions:

- `018_roles_permissoes.sql` — base tables + base permissions
- `020_permissions_beneficiarias.sql` — beneficiárias domain
- `022_permissions_projetos_oficinas.sql` — projetos/oficinas domain
- `023_permissions_oficinas_subroutes.sql` — oficinas subroutes (participantes/presenças/relatório)
- `026_permissions_oficinas_extras.sql` — oficinas extras (conflito/horários)
- `027_permissions_projetos_relatorio.sql` — projetos reports
- `028_permissions_relatorios.sql` — relatorios domain
- `024_role_presets.sql`, `025_role_presets_update.sql`, `029_role_presets_adjust.sql` — presets

## Permission Domains (reference)

- Beneficiárias: `beneficiarias.ler`, `beneficiarias.criar`, `beneficiarias.editar`, `beneficiarias.excluir`
- Projetos: `projetos.ler`, `projetos.criar`, `projetos.editar`, `projetos.excluir`, `projetos.relatorio.gerar`
- Oficinas (CRUD): `oficinas.ler`, `oficinas.criar`, `oficinas.editar`, `oficinas.excluir`
- Oficinas (subrotas):
  - `oficinas.participantes.ver|adicionar|remover`
  - `oficinas.presencas.registrar|listar`
  - `oficinas.relatorio.exportar`
  - `oficinas.conflito.verificar`, `oficinas.horarios.listar`
- Relatórios: `relatorios.beneficiarias.gerar`, `relatorios.oficinas.gerar`, `relatorios.participacao.gerar`, `relatorios.consolidado.gerar`
- Configurações: `users.manage`, `roles.manage`, `profile.edit`

## How authorize() works

- Location: `backend/src/middleware/auth.ts`
- Reads the authenticated user `req.user.role` and `req.user.id`.
- If role is `superadmin` or `super_admin`, allows.
- Fetches permissions from Postgres and caches them in Redis for 300s:
  - Keys: `perms:role:<role>`, `perms:user:<id>`
  - Effective permissions = union(cached role perms, cached user perms)
- Invalidation (automatic):
  - PUT `/configuracoes/roles/:role/permissions` → deletes `perms:role:<role>`
  - PUT `/configuracoes/usuarios/:id/permissions` → deletes `perms:user:<id>`
  - PUT `/configuracoes/usuarios/:id` (if role changed) → deletes `perms:user:<id>`, `perms:role:<old>`, `perms:role:<new>`
  - POST `/configuracoes/permissions` (new permission) → deletes all `perms:role:*`

## Manage roles/permissions via the UI

- Page: `Configurações`
  - Tab `Usuários`:
    - List/search/paginate users; create user; toggle active; change paper; reset password.
    - Button “Permissões” per-user to manage `user_permissions` (checkboxes).
  - Tab `Papéis`:
    - Select paper (role) and search/paginate permissions, grouped by domain prefix.
    - Toggle permissions (checkboxes) and save — writes to `role_permissions`.
  - Tab `Permissões`:
    - Create new permission (`permissions` table) and list existing ones with pagination.

Superadmin login (seeded automatically after migration):

- Email: `bruno@move.com`
- Password: `15002031`

## Initial setup / Migration

- Ensure Postgres and Redis are up (docker compose or your infra)
- Run migrations (auto-seed superadmin and presets):
  - `npm --prefix backend run migrate` (or `migrate:node` if psql is unavailable)
- Start backend: `npm --prefix backend run dev`
- Start frontend: `npm run dev`

## Smoke tests (local)

- Config smoke (RBAC on config routes):
  - `npm --prefix backend run smoke:config`
- Reports smoke (authorizations on reports):
  - `npm --prefix backend run smoke:reports`
- Chat smokes (optional):
  - `npm --prefix backend run smoke:chat`
  - `npm --prefix backend run smoke:chat:offline`

Tip: Before smokes, make sure API is running on `http://localhost:3000/api`.

## CI — Permissions Smoke

- Workflow: `.github/workflows/permissions-smoke.yml`
  - Spins Postgres+Redis, migrates (node fallback), builds & starts API
  - Runs `smoke:config` and `smoke:reports`
- Triggers on push to `main` and can be triggered manually.

## Troubleshooting

- “403 Permission denied” after changing role/permissions:
  - Wait a few seconds (Redis TTL is 300s) or re-save role/permissions (triggers invalidation), or clear Redis keys `perms:role:*` / `perms:user:*`.
- Superadmin cannot log in:
  - Re-run migrations; ensure seed ran (`backend/scripts/create-initial-data.js`).
- UI doesn’t list new permissions:
  - Use the search box or increase limit; the list is paginated.
