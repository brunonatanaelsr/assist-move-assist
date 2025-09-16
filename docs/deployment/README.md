# Deploy em Produção - Assist Move Assist

## Visão Geral
Este guia resume o processo de implantação em produção do Assist Move Assist utilizando Ubuntu 24.04 LTS, Docker Compose e a stack Node.js/React comunicando-se com PostgreSQL e Redis gerenciados. Todas as instruções assumem um pipeline GitHub Actions realizando build e deploy automático para um VPS com Nginx atuando como proxy reverso TLS.

## Pré-requisitos
- Servidor Ubuntu 24.04 LTS com acesso root e ao menos 2 vCPUs, 4 GB de RAM e 40 GB de armazenamento.
- Domínio público apontando os registros A/AAAA para o VPS.
- Instâncias gerenciadas de PostgreSQL 15+ e Redis 7+ (pode ser um serviço como RDS, Cloud SQL, Render ou instâncias Docker dedicadas).
- Conta de e-mail transacional (SMTP) para envio de notificações.
- Repositório GitHub com secrets/variables configurados para deploy automatizado (`VPS_HOST`, `VPS_USER`, `VPS_PORT`, `VPS_SSH_KEY`, `DOCKER_IMAGE`).
- Certificados TLS emitidos automaticamente via Let's Encrypt (o arquivo `config/nginx/nginx-ssl-production.conf` já contém os headers e regras necessárias).

## Passo a Passo Resumido
1. Clone o repositório no servidor destino e execute `scripts/pre-deploy-check.sh` para validar pacotes base.
2. Copie `backend/.env.example` para `backend/.env` e `.env.example` para `.env.production`, preenchendo credenciais reais (URLs do domínio, `NODE_ENV=production`, `JWT_SECRET`, SMTP, chaves de monitoramento etc.).
3. Ajuste o arquivo `docker-compose.prod.yml` para apontar para os serviços gerenciados de banco/Redis via variáveis de ambiente.
4. Rode `npm install` na raiz e em `backend/`, depois `npm run build` (frontend) e `npm --prefix backend run build`.
5. Execute `npm --prefix backend run migrate` para aplicar as migrações SQL e `npm --prefix backend run seed` para criar dados iniciais.
6. Configure o serviço systemd/PM2 ou utilize Docker Compose para iniciar `frontend`, `backend`, `db` (se autogerenciado) e `redis` (se local) em modo produção.
7. Habilite o Nginx com o virtual host seguro (`config/nginx/nginx-ssl-production.conf`) e renove certificados com `certbot renew --quiet`.
8. Configure monitoramento (Sentry, Google Analytics, LogRocket) e alertas de uptime com as variáveis presentes nos templates `.env`.

## Banco de Dados PostgreSQL
- Crie usuário e base:
  ```bash
  sudo -u postgres psql <<'SQL'
  CREATE ROLE assist_user WITH LOGIN PASSWORD 'senha-super-segura';
  CREATE DATABASE assist_db OWNER assist_user;
  GRANT ALL PRIVILEGES ON DATABASE assist_db TO assist_user;
  SQL
  ```
- Habilite extensões necessárias (`uuid-ossp`, `pgcrypto`) e aplique migrações com `npm --prefix backend run migrate`.
- Após o deploy inicial rode `npm --prefix backend run seed` para criar o usuário administrador e dados de referência.
- Configure rotinas de backup conforme `docs/database/BACKUP_STRATEGY.md`.

## Redis
- Utilize uma instância gerenciada com TLS habilitado ou configure `redis.conf` local com `requirepass` e `appendonly yes`.
- Atualize `backend/.env` com `REDIS_URL` e `REDIS_PASSWORD` coerentes. O backend aplica cache TTL e filas em canais `notifications:*` e `sessions:*`.

## Backend Node.js
- Scripts principais:
  ```bash
  npm --prefix backend install
  npm --prefix backend run build
  npm --prefix backend run migrate
  npm --prefix backend run seed   # opcional
  npm --prefix backend run start
  ```
- O serviço expõe `PORT=4000` (configurável). Utilize `pm2`, `systemd` ou Docker Compose para mantê-lo ativo.
- Middleware de segurança habilitados: Helmet, Rate Limiter, HPP, CORS com whitelists (`CORS_ALLOWED_ORIGINS`).
- Configure logging (`LOG_LEVEL`, rotação diária em `/var/log/assist-backend/*.log`).

## Frontend React + Vite
- Crie `.env.production` baseado em `.env.example`:
  ```env
  NODE_ENV=production
  APP_NAME=assist-move-assist
  APP_URL=https://seu-dominio
  NEXT_PUBLIC_API_BASE_URL=https://seu-dominio/api
  NEXT_PUBLIC_WS_URL=wss://seu-dominio/api
  VITE_API_BASE_URL=https://seu-dominio/api
  VITE_API_URL=https://seu-dominio/api
  VITE_WS_URL=wss://seu-dominio/api
  VITE_SENTRY_DSN=https://chave@sentry.io/projeto
  VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
  ```
- Build de produção: `npm install && npm run build`.
- Os artefatos ficam em `dist/` e podem ser servidos via Nginx (`root /var/www/assist-move-assist/dist;`).

## Automação com Docker Compose
- O arquivo `docker-compose.prod.yml` utiliza `env_file` apontando para `backend/.env` e `.env.production` (renomeado para `.env` na raiz ao subir o stack).
- Para atualizar imagens:
  ```bash
  docker compose -f docker-compose.prod.yml pull
  docker compose -f docker-compose.prod.yml up -d --remove-orphans
  ```
- Ajuste volumes para apontar para diretórios persistentes de banco/redis ou utilize serviços externos removendo os containers locais.

## CI/CD (GitHub Actions)
- Workflow `deploy-vps.yml` executa build, testes e, após aprovação manual (`workflow_dispatch`), dispara deploy via SSH usando `appleboy/ssh-action`.
- Garanta que os jobs de build/test (`npm run lint`, `npm run test`, `npm --prefix backend run test`) façam parte do pipeline antes da etapa de deploy.
- Utilize environments no GitHub para proteger secrets e aprovações obrigatórias.

## Monitoramento e Observabilidade
- Ative Sentry (frontend/backend) e LogRocket usando as variáveis de ambiente correspondentes.
- Configure Google Analytics 4 e expanda dashboards internos em `/admin/analytics`.
- Para logs de servidor, integre o `backend` com serviços como Grafana Loki ou ELK (via `winston` transport HTTP) se necessário.
- Crie checks externos (UptimeRobot, BetterStack) monitorando `/health` e `/api/status`.

## Manutenção Preventiva
- Automatize backups diários do PostgreSQL e Redis e guarde em armazenamento externo (S3, GCS) seguindo `docs/database/BACKUP_STRATEGY.md`.
- Teste o processo de restauração trimestralmente.
- Revise certificados TLS e regras de firewall mensalmente.
- Execute `npm --prefix backend run smoke` e `npm run test:e2e` a cada release para garantir regressão mínima.

## Troubleshooting Rápido
- **Backend não inicia**: verificar `backend/logs/app.log`, conexão com PostgreSQL/Redis e variáveis `DATABASE_URL`/`REDIS_URL`.
- **Frontend exibe erro de API**: confirmar CORS (`CORS_ALLOWED_ORIGINS`) e proxies Nginx apontando para `http://backend:4000` ou serviço equivalente.
- **WebSocket não conecta**: validar que `NEXT_PUBLIC_WS_URL` usa `wss://` atrás de TLS e que o Nginx encaminha `upgrade`/`connection` corretamente.
- **Deploy via Actions falha**: confira logs do job e permissões SSH. Rode `scripts/update-production.sh` manualmente para validar.

> Todas as credenciais reais devem permanecer fora do controle de versão. Gere chaves fortes com `openssl rand -hex 32` e armazene-as em cofre apropriado.
