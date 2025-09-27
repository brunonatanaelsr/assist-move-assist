# Credenciais de Desenvolvimento e Testes

As rotinas de seed (`apps/backend/scripts/create-initial-data.js`) garantem três usuários padrão
que podem ser utilizados para desenvolvimento manual, testes automatizados e fluxos de
homologação local.

| Perfil      | E-mail                   | Senha          | Observações                                                                                                                    |
| ----------- | ------------------------ | -------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Superadmin  | `superadmin@example.com` | `ChangeMe!123` | Possui acesso total ao sistema. Valores podem ser sobrescritos via variáveis de ambiente `SUPERADMIN_*`.                       |
| Admin       | `admin@example.com`      | `ChangeMe!123` | Perfil administrativo padrão para testes manuais. Pode ser configurado via variáveis `ADMIN_*`.                                |
| Usuário E2E | `e2e@assist.local`       | `e2e_password` | Conta utilizada pelos testes E2E/Playwright. O perfil padrão é `admin` e pode ser ajustado através das variáveis `E2E_TEST_*`. |

## Como garantir as credenciais localmente

```bash
# Dentro do diretório apps/backend
cd apps/backend
npm install
node scripts/create-initial-data.js
```

O script utiliza as credenciais de banco configuradas em `apps/backend/.env` (ou variáveis de
ambiente exportadas no shell) para inserir/atualizar os usuários. Execute-o após aplicar as
migrações para garantir que os testes encontrem as contas necessárias.
