# Runbook de Operações - Assist Move Marias

Este runbook descreve o fluxo operacional do ambiente de produção, incluindo pipeline de CI/CD, procedimentos de suporte e smoke tests obrigatórios.

## 1. Pipeline CI/CD
- **Repositório**: GitHub (`assist-marias/assist-move-assist`). Branch principal protegida com revisão obrigatória.
- **Workflows principais**:
  - `quality-gate.yml`: executa `npm run lint`, `npm run test` e `npm --prefix apps/backend run migrate:check` a cada pull request.
  - `deploy-vps.yml`: builda imagens Docker, publica no registry privado e executa `scripts/deploy-vps.sh` via SSH após aprovação manual no ambiente "production".
  - `security-scan.yml`: agenda semanal executando OWASP ZAP e dependabot audit.
- **Segredos**: fornecidos via GitHub Environments (`PRODUCTION`, `STAGING`). Secrets sincronizados com AWS Secrets Manager.
- **Rollback**: `scripts/rollback.sh` permite reverter para a última imagem estável armazenada no registry (`registry.assistmovemarias.org/assist-move-assist/app:<tag>`).

## 2. Processo de Deploy
1. Merge na branch `main` dispara `deploy-vps.yml`.
2. Pipeline gera tag com timestamp (`prod-YYYYMMDD-HHMM`).
3. Após build e testes, o job `release` aguarda aprovação do squad de operações.
4. Deploy executa `docker compose -f docker-compose.prod.yml pull` seguido de `docker compose ... up -d --remove-orphans` no servidor `deploy01.assistmovemarias.org`.
5. Pipeline roda `npm --prefix apps/backend run migrate` e `npm --prefix apps/backend run smoke`.
6. Notificação de sucesso enviada ao Slack `#deploys-assist` com link para dashboards de monitoramento.

## 3. Smoke Test Pós-Deploy
- **Frontend**: `npm run build:frontend` (verifica build) + script automatizado Playwright `tests/smoke/production.spec.ts` via `npm run test -- --runInBand`. Deve validar login, criação de solicitação e acesso ao painel.
- **Backend**: `npm --prefix apps/backend run smoke` executa ping em `/health`, `/api/status`, criação/listagem de beneficiárias e verificação da fila Redis.
- **Critérios**: qualquer falha impede a conclusão do deploy. O runbook exige correção ou rollback imediato.

## 4. Suporte de Primeiro Nível
- **Horário**: 08h-18h BRT (dias úteis) com plantão rotativo em finais de semana.
- **Canais**: Zendesk para tickets de usuárias, Slack `#suporte-assist` para comunicação interna.
- **Checklist**:
  1. Consultar dashboards (Sentry, Grafana) para contexto.
  2. Validar status de incidentes abertos no Jira (`OPS-*`).
  3. Registrar atendimento no Zendesk com SLA padrão 4h.
- **Escalonamento**:
  - Nível 2: time de desenvolvimento (`@backend-oncall`, `@frontend-oncall`). SLA 2h.
  - Nível 3: equipe de infraestrutura (`@devops-oncall`). SLA 1h.

## 5. Runbooks Específicos
- **Indisponibilidade total**: seguir `scripts/emergency-restart.sh` (reinicio controlado de containers) e comunicar via StatusPage.
- **Erro 500 em massa**: ativar feature flag `MAINTENANCE_MODE` via Secrets Manager, analisar logs Sentry, acionar rollback se necessário.
- **Vazamento de dados**: congelar deploys, acionar plano de resposta a incidentes (documentado no Confluence interno) e notificar DPO.

## 6. Manutenção Preventiva
- Revisão de métricas e alertas semanalmente (toda segunda-feira às 10h BRT).
- Teste de restauração de backup trimestral (primeira semana do trimestre).
- Rotação de chaves SSH a cada 90 dias (`scripts/rotate-ssh-keys.sh`).
- Auditoria de permissões IAM semestral.

## 7. Contatos
- **On-call atual**: consultável via comando `/oncall assist` no Slack.
- **DevOps Lead**: devops@assistmovemarias.org
- **DPO**: dpo@assistmovemarias.org

---

> Documento mantido pela equipe de Operações. Última atualização: 2024-05-28.
