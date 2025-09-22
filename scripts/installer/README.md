Assist Move Assist — Instalador Automatizado (VPS Ubuntu 24.04)

O instalador guiado cria toda a stack (Node.js, PostgreSQL, Redis, Nginx, SSL), configura variáveis (.env), executa migrações/seeds e sobe o sistema como serviço (systemd), com um assistente interativo.

Requisitos
- VPS Ubuntu 24.04 (root/sudo)
- Domínio apontado (A/AAAA) para a VPS (para SSL)

Uso rápido
1) Copie o repositório para a VPS ou faça clone em /var/www:
   git clone https://github.com/brunonatanaelsr/assist-move-assist.git
   cd assist-move-assist

2) Execute o instalador (como root):
   sudo bash scripts/installer/install.sh

3) Siga o assistente para informar:
   - Domínio (opcional) e email do SSL (Let's Encrypt)
   - Banco (local ou externo): host/porta/usuário/senha
   - Redis
   - SMTP (host/porta/secure/usuário/senha/from)
   - Usuários iniciais (superadmin e admin)

4) Ao final, o sistema estará disponível:
   - Site: https://SEU_DOMINIO
   - API:  https://SEU_DOMINIO/api

Observações
- O instalador chama o script de deploy: scripts/deploy-ubuntu-24.sh
- Para banco EXTERNO, o instalador evita provisionar Postgres local e usa as credenciais fornecidas.
- Seeds iniciais são criados via apps/backend/scripts/create-initial-data.js (com os dados informados).
