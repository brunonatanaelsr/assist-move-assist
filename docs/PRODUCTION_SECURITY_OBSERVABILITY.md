# Segurança e Observabilidade em Produção

Este documento registra o estado final das proteções, monitoramento e rotinas operacionais adotadas para o ambiente de produção do Assist Move Marias.

## 1. SSL/TLS e Proxy Reverso
- **Proxy**: Nginx 1.24 atuando como proxy reverso para `frontend` e `backend`, configurado com o virtual host `config/nginx/nginx-ssl-production.conf`.
- **Certificados**: emissão automática via Let's Encrypt com `certbot` rodando diariamente (`systemd timer certbot-renew.service`). Os certificados wildcard cobrem `app.assistmovemarias.org`, `api.assistmovemarias.org` e `admin.assistmovemarias.org`.
- **Endurecimento**: TLS 1.2+ obrigatório, cipher suites modernas e cabeçalhos HSTS, CSP, X-Content-Type-Options e X-Frame-Options habilitados conforme o template de Nginx. Tráfego HTTP redirecionado para HTTPS (301).

## 2. Firewall e Segmentação de Rede
- **Camada de rede**: firewall UFW com política default `deny` para entradas; regras abertas apenas para `80/tcp` e `443/tcp` via Nginx, `22/tcp` restrito ao IP do bastion da equipe DevOps e `9100/tcp` para exporter Prometheus.
- **Serviços gerenciados**: PostgreSQL (RDS) e Redis (ElastiCache) expostos somente para a sub-rede privada do backend (Security Groups na VPC). Sem acesso público.
- **Hardening**: Fail2Ban ativo para bloquear tentativas de brute-force SSH e rate limiting ativado no backend (`RATE_LIMIT_DISABLE=false`).

## 3. Backups e Recuperação
- **PostgreSQL**: snapshots automáticos diários configurados no provedor gerenciado com retenção de 14 dias. Dump lógico semanal via `pg_dump` enviado para bucket S3 `s3://assist-prod-backups/pg/` com criptografia server-side.
- **Redis**: opção AOF habilitada e snapshot horário mantido por 24 horas. Monitoramento de tamanho e latência habilitados.
- **Testes de restauração**: exercício trimestral documentado em `docs/deployment/README.md`, última validação concluída em 2024-05-20 restaurando para ambiente de staging.

## 4. Observabilidade
- **Sentry**: DSNs definidos em `.env` (frontend) e `apps/backend/.env`. Alertas enviados ao canal `#alertas-assist` no Slack e incidente crítico abre ticket automático no Jira.
- **Google Analytics 4**: `G-A1B2C3D4EF` instalado no frontend. Eventos customizados para onboarding, solicitação de benefício e conclusão de questionários.
- **LogRocket**: sessão de replay ativa somente para usuárias autenticadas da área administrativa com mascaramento de campos sensíveis.
- **Logs e métricas**: backend envia logs estruturados para Loki (`loki.assistmovemarias.org`) via promtail. Node Exporter e Nginx Log Exporter expõem métricas Prometheus monitoradas no Grafana (`grafana.assistmovemarias.org`).

## 5. Alertas e Resposta a Incidentes
- **Uptime**: BetterStack monitorando `https://app.assistmovemarias.org/health` e `https://api.assistmovemarias.org/api/status` com SLA 99.5%. Alertas por SMS e Slack.
- **Desempenho**: Alertas no Grafana para latência p95 > 600ms e taxa de erro HTTP 5xx > 1% por 5 minutos.
- **Segurança**: scanner automático OWASP ZAP semanal via GitHub Actions (`security-scan.yml`). Resultado armazenado em `RELATORIO_PRONTIDAO_PRODUCAO.md`.
- **Runbook**: incidentes seguem o fluxo descrito em `docs/RUNBOOK_OPERATIONS.md`, com responsáveis e SLAs definidos.

## 6. Gestão de Segredos
- **Secret Manager**: valores de produção armazenados no AWS Secrets Manager com rotação semestral. Os arquivos `.env` versionados contêm apenas o espelho do estado atual para replicação rápida; qualquer alteração deve ser executada via `scripts/update-secrets.sh` e confirmada pela equipe de segurança.

---

> Última revisão: 2024-05-28.
