# 🚀 Deploy Automático VPS - Assist Move Assist

> Segurança: este documento foi sanitizado para remover IPs, senhas e credenciais reais. Substitua os placeholders abaixo pelas suas credenciais via variáveis de ambiente, vault ou `.env` no servidor. Evite versionar segredos.

## Scripts de Deploy

Este repositório inclui utilitários para suporte ao deploy, não um instalador automatizado completo. Use os scripts abaixo junto com o guia `docs/deployment/README.md`.

### 1. Pré-checagens e preparação
```bash
./scripts/pre-deploy-check.sh
```

### 2. Atualização de produção (pull/build/reload)
```bash
sudo ./scripts/update-production.sh
```

### 3. Health check pós-deploy
```bash
./scripts/health-check.sh
```

## Informações da VPS

- **IP:** <SEU_IP>
- **Usuário:** root
- **Senha:** <SENHA_ROOT>
- **Domínio:** <SEU_DOMINIO>

## Credenciais do Sistema

Defina via variáveis de ambiente no deploy (não versione):

### Superadmin
- **Email:** <SUPERADMIN_EMAIL>
- **Senha:** <SUPERADMIN_SENHA>

### Admin (opcional)
- **Email:** <ADMIN_EMAIL>
- **Senha:** <ADMIN_SENHA>

## URLs de Acesso

- **Sistema:** https://<SEU_DOMINIO>
- **API:** https://<SEU_DOMINIO>/api
- **Health Check:** https://<SEU_DOMINIO>/health

## Comandos Úteis na VPS

```bash
# Conectar na VPS
ssh root@<SEU_IP>

# Status dos serviços
systemctl status nginx postgresql
pm2 status

# Logs do backend
pm2 logs movemarias-backend

# Reiniciar serviços
systemctl restart nginx postgresql
pm2 restart movemarias-backend

# Verificar banco
sudo -u postgres psql -d movemarias -c "SELECT * FROM usuarios;"
```

## Pré-requisitos

O script instala automaticamente o `sshpass`:

- **Linux:** `sudo apt-get install sshpass`
- **macOS:** `brew install hudochenkov/sshpass/sshpass`

## Como Usar

1. Provisionar a VPS (Node.js, PostgreSQL, Nginx, firewall, SSL). Siga `docs/deployment/README.md`.
2. Rodar `./scripts/pre-deploy-check.sh` para validar dependências.
3. Configurar variáveis no servidor (`/var/www/assist-move-assist/backend/.env` e frontend `.env.production`).
4. Rodar `sudo ./scripts/update-production.sh` para copiar, buildar e reiniciar.
5. Validar com `./scripts/health-check.sh` e inspeção de logs.

## Resolução de Problemas

### Script não executa
```bash
chmod +x scripts/pre-deploy-check.sh scripts/update-production.sh scripts/health-check.sh
```

### sshpass não encontrado
```bash
# Linux
sudo apt-get install sshpass

# macOS
brew install hudochenkov/sshpass/sshpass
```

### Erro de conexão SSH
- Verificar se a VPS está online
- Confirmar IP e credenciais
- Testar conexão manual: `ssh root@<SEU_IP>`

### Sistema não carrega
```bash
# Conectar na VPS e verificar serviços
ssh root@<SEU_IP>
systemctl status nginx postgresql
pm2 status
```

## Arquitetura Implantada

- **Frontend:** Nginx (proxy reverso)
- **Backend:** Node.js Express (PM2)
- **Banco:** PostgreSQL
- **SSL:** Let's Encrypt
- **Firewall:** UFW
- **Domínio:** <SEU_DOMINIO>

## Segurança

- Rate limiting (5 tentativas/15min)
- Headers de segurança (Helmet)
- Firewall configurado
- SSL/HTTPS obrigatório
- Senhas com bcrypt
- Autenticação JWT

---

**🎯 Resultado:** Sistema completo funcionando em produção com um único comando!
