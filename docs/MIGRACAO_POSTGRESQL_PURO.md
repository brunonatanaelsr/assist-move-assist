# Guia Definitivo: PostgreSQL Puro no Assist Move Assist

Este documento descreve o estado atual do backend 100% PostgreSQL, as convenções adotadas e os passos recomendados para manter a base de dados saudável durante evoluções futuras.

## 1. Arquitetura Geral
- **Banco Primário**: PostgreSQL 15+ com extensões `pgcrypto`, `uuid-ossp` e `pg_trgm`.
- **Conexão**: pool gerenciado pela camada Node.js (`pg` + pool customizado).
- **Autenticação**: tabelas próprias (`users`, `sessions`, `password_resets`) com JWT emitidos pelo backend Express.
- **Realtime**: Socket.IO publicando eventos a partir de triggers PostgreSQL (`NOTIFY/LISTEN`).

## 2. Estrutura de Pastas
- `apps/backend/src/database/migrations`: scripts versionados (`YYYYMMDDHHMM__descricao.sql`).
- `apps/backend/scripts/migrate.sh`: aplica migrações em ordem, registra histórico em `schema_migrations`.
- `apps/backend/src/modules/**/repositories`: consultas específicas usando SQL parametrizado.

## 3. Convenções de Migração
1. Cada feature deve conter `UP` e `DOWN` claros no arquivo SQL.
2. Utilize `CHECK`, `NOT NULL` e `DEFAULT` para garantir consistência sem depender apenas da aplicação.
3. Padronize colunas de auditoria: `created_at`, `updated_at`, `created_by`, `updated_by`.
4. Indexe campos usados em buscas (`ILIKE`, `GIN` para texto, `btree` para filtros por data/status).

## 4. Fluxo de Desenvolvimento
```bash
# 1. Criar uma nova migração
npm --prefix backend run premigrate:node -- name "adicionar_tabela_oficinas"

# 2. Escrever SQL em apps/backend/src/database/migrations/<timestamp>__adicionar_tabela_oficinas.sql

# 3. Executar migrações localmente
npm --prefix backend run migrate

# 4. Rodar smoke tests e integração
npm --prefix backend run test
npm --prefix backend run test:integration
```

## 5. Estratégia de Seed
- Script `apps/backend/scripts/create-initial-data.js` cria usuário administrador, permissões básicas, projetos padrão e oficinas de exemplo.
- Seeds são idempotentes: podem ser executados após cada migração sem duplicar dados.
- Para ambientes de staging utilize variáveis `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` no `.env`.

## 6. Integração com Redis
- Operações críticas (login, refresh token, locks) usam Redis como cache e armazenamento de sessões.
- As chaves seguem padrão `namespace:identificador` (ex.: `sessions:<userId>`, `permissions:<role>`).
- Expirações configuradas via `CACHE_TTL_SECONDS` e `SESSION_TTL_SECONDS`.

## 7. Observabilidade da Camada SQL
- Ative `log_min_duration_statement = 500` no PostgreSQL para identificar queries lentas.
- Envie métricas para Prometheus/Grafana usando `pg_stat_statements`.
- Scripts auxiliares: `apps/backend/scripts/smoke-reports.js` valida relatórios e visões materializadas.

## 8. Backup e Recuperação
- Utilize `pg_dump` diário com retenção mínima de 30 dias (ver `docs/database/BACKUP_STRATEGY.md`).
- Teste restore em ambiente isolado mensalmente.
- Replicação assíncrona recomendada para failover (hot standby).

## 9. Checklist Antes do Deploy
- [ ] `npm --prefix backend run migrate` executado com sucesso no ambiente alvo.
- [ ] `npm --prefix backend run test:integration` com 100% de sucesso.
- [ ] Índices novos analisados com `EXPLAIN ANALYZE` em dados reais.
- [ ] Migrações revisadas por outro desenvolvedor.
- [ ] Plano de rollback definido (arquivo `DOWN`).

> PostgreSQL é a fonte da verdade de toda a aplicação. Evite gambiarra na aplicação para compensar ausência de restrições no banco: modele corretamente as constraints e mantenha documentação sempre atualizada.
