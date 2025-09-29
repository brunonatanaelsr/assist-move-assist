# 🚀 Relatório de Prontidão para Produção

_Gerado em 2025-09-29T01:04:11.198Z_

## ✅ Resumo Executivo
- **Status Geral:** ⚠️ ATENÇÃO - AJUSTES NECESSÁRIOS
- **Branch Analisada:** `work`
- **Commit:** `5bf8c52`
- **Workspace Limpo:** Não
- **Node.js / npm:** v20.19.4 / 11.4.2

## 🧪 Checks Automáticos
| Check | Status | Duração | Última saída |
| ----- | ------ | ------- | ------------ |
| Build Frontend | ✅ Sucesso | 16.34 s | ✓ built in 14.49s |
| Build Backend | ❌ Falha | 6.31 s | npm error command sh -c tsc -p tsconfig.build.json |
| Lint Backend | ✅ Sucesso | 4.18 s | 0 errors and 94 warnings potentially fixable with the `--fix` option. |
| Teste Backend (security.setup) | ✅ Sucesso | 4.03 s | > node --require ./tests/mocks/registerAnsi.js ../../node_modules/jest/bin/jest.js apps/backend/src/__tests__/security.setup.test.ts |
| Teste Frontend (ErrorBoundary) | ✅ Sucesso | 2.88 s | Duration  1.82s (transform 134ms, setup 65ms, collect 432ms, tests 54ms, environment 562ms, prepare 92ms) |

## 📦 Métricas de Código
### Backend
- Rotas (arquivos .ts): **40**
- Controladores: **8**
- Serviços: **29**
- Arquivos de teste (.test/.spec.ts): **42**

### Frontend
- Páginas (.tsx): **46**
- Componentes (.tsx): **79**
- Hooks (.ts): **31**
- Arquivos de teste: **59**

### Base do Repositório
- Total de arquivos TypeScript/TSX: **487**
- TODOs/FIXMEs identificados: **0**

## 🗄️ Migrações e Seeds
- Migrações disponíveis: **53**
  - 044_alter_termos_consentimento_add_metadata.sql
  - 045_criar_push_subscriptions.sql
  - 046_criar_job_queue.sql
  - 047_criar_login_attempts_user_blocks.sql
  - 048_criar_user_refresh_tokens.sql
- Seeds disponíveis: **1**
  - 001_seed_beneficiarias.sql

## 📌 Observações
- Há falhas nas checagens; revisar os logs acima antes do deploy.
- Relatório gerado automaticamente pelo script `scripts/generate-readiness-report.js`.

