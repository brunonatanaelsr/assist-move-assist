# Relatório de Smoke Test - 2024-05-28

## Contexto
- **Objetivo**: validar build de produção após configuração das variáveis e atualização das proteções de segurança.
- **Ambiente**: container CI que replica o pipeline de build (`NODE_ENV=production`).
- **Comandos executados**: `npm run build` (equivale a `npm run build:frontend && npm run build:backend`).

## Resultados
- **Frontend**: build concluído com sucesso em 22s, gerando artefatos em `apps/frontend/dist`.
- **Backend**: compilação TypeScript falhou com 13 erros (ver `npm --prefix apps/backend run build`). Principais problemas:
  - Uso de `error.errors` em `ZodError` sem inferência correta.
  - Tipos de mocks do Jest exigindo anotações explícitas.
  - Tipagem de `CorsOptions` e parâmetros de rotas desatualizados.

## Próximos Passos
1. Corrigir os erros de tipagem listados para permitir a geração de `dist/` via `tsc`.
2. Reexecutar `npm run build` e atualizar este relatório com o status verde.
3. Automatizar o smoke test no pipeline (`deploy-vps.yml`) para bloquear deploys sem build válido.

> Log completo disponível no job de CI e na sessão `b64cbb` desta execução.
