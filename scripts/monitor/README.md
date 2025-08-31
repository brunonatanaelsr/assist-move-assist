Monitoramento e Alertas - Assist Move Assist

Este diretório contém scripts para monitoramento contínuo da aplicação em produção (ou staging) com alertas via Slack.

Recursos:
- Health check do backend e do site
- Contagem de erros 5xx recentes no Nginx
- Verificação de backups recentes
- Validade do certificado SSL

Instalação (no servidor)
1. Copie os arquivos para o servidor (ex.: /opt/assist-monitor)
2. Crie o arquivo de configuração a partir do exemplo:
   cp config.env.example config.env
   edite os valores (DOMAIN, API_URL, SLACK_WEBHOOK, LOGS)
3. Torne scripts executáveis:
   chmod +x monitor.sh slack-alert.sh
4. Agende via systemd (recomendado) ou cron:
   - Systemd: crie serviços/timers conforme exemplos abaixo
   - Cron: */5 * * * * /opt/assist-monitor/monitor.sh >> /var/log/assist-monitor.log 2>&1

Variáveis (config.env)
- DOMAIN: domínio público (ex.: app.suaempresa.com)
- API_URL: base da API (ex.: https://app.suaempresa.com/api)
- BACKUP_DIR: diretório de backups (ex.: /var/backups/assist-move-assist)
- NGINX_ERROR_LOG: /var/log/nginx/movemarias_error.log
- SLACK_WEBHOOK: URL do webhook do Slack (opcional)
- SSL_WARN_DAYS: dias para aviso antes de expirar (padrão 7)

Systemd (exemplo)
Arquivo: /etc/systemd/system/assist-monitor.service
-----------------------------------------------
[Unit]
Description=Assist Monitor

[Service]
Type=simple
EnvironmentFile=/opt/assist-monitor/config.env
ExecStart=/opt/assist-monitor/monitor.sh

[Install]
WantedBy=multi-user.target
-----------------------------------------------

Arquivo: /etc/systemd/system/assist-monitor.timer
-----------------------------------------------
[Unit]
Description=Assist Monitor (a cada 5 minutos)

[Timer]
OnBootSec=2min
OnUnitActiveSec=5min
Unit=assist-monitor.service

[Install]
WantedBy=timers.target
-----------------------------------------------

Ativar:
sudo systemctl daemon-reload
sudo systemctl enable --now assist-monitor.timer

