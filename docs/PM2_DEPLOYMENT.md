# Guia de Implantação com PM2

Este guia explica como configurar e executar o sistema Assist Move usando PM2 para gerenciamento de processos.

## Pré-requisitos

1. Node.js (v18 ou superior)
2. npm (v9 ou superior)
3. PostgreSQL (v15 ou superior)
4. PM2 instalado globalmente:
```bash
npm install -g pm2
```

## Estrutura do Projeto

O sistema consiste em dois componentes principais:
- Backend (API Node.js/Express)
- Frontend (Vite/React)

## Configuração do Ambiente

1. Clone o repositório:
```bash
git clone https://github.com/brunonatanaelsr/assist-move-assist.git
cd assist-move-assist
```

2. Instale as dependências:
```bash
# Instalar dependências do projeto principal
npm install

# Instalar dependências do backend
cd backend && npm install
cd ..
```

3. Configure as variáveis de ambiente:

No arquivo `.env` do backend:
```env
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=seu_password
DB_NAME=movemarias
JWT_SECRET=seu_jwt_secret
FRONTEND_URL=http://localhost:8080
```

## Configuração do PM2

O sistema utiliza um arquivo `ecosystem.config.cjs` para configuração do PM2. Principais configurações:

```javascript
module.exports = {
  apps: [
    {
      name: 'assist-move-backend',
      script: './backend/server.js',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        CORS_ORIGIN: 'http://localhost:8080'
      }
    },
    {
      name: 'assist-move-frontend',
      script: 'npm',
      args: 'run dev',
      env: {
        PORT: 8080,
        VITE_API_URL: 'http://localhost:3000'
      }
    }
  ]
}
```

## Comandos PM2

### Iniciar a Aplicação

```bash
# Iniciar todos os serviços
pm2 start ecosystem.config.cjs

# Iniciar serviços específicos
pm2 start ecosystem.config.cjs --only assist-move-backend
pm2 start ecosystem.config.cjs --only assist-move-frontend
```

### Monitoramento

```bash
# Ver status dos processos
pm2 status

# Monitorar logs em tempo real
pm2 logs

# Monitorar logs específicos
pm2 logs assist-move-backend
pm2 logs assist-move-frontend

# Monitorar recursos
pm2 monit
```

### Gestão de Processos

```bash
# Reiniciar todos os processos
pm2 restart all

# Reiniciar processo específico
pm2 restart assist-move-backend
pm2 restart assist-move-frontend

# Parar processos
pm2 stop all
pm2 stop assist-move-backend

# Remover processos
pm2 delete all
pm2 delete assist-move-backend
```

### Configuração de Inicialização Automática

Para garantir que os serviços iniciem automaticamente após reinicialização do servidor:

```bash
# Gerar script de inicialização
pm2 startup

# Salvar configuração atual
pm2 save
```

## Arquivos de Log

Os logs são armazenados em:

- Backend:
  - Error: `./logs/backend-error.log`
  - Output: `./logs/backend-out.log`
  - Combined: `./logs/backend-combined.log`

- Frontend:
  - Error: `./logs/frontend-error.log`
  - Output: `./logs/frontend-out.log`
  - Combined: `./logs/frontend-combined.log`

## Portas e URLs

- Backend: http://localhost:3000
- Frontend: http://localhost:8080

## Troubleshooting

### Problemas Comuns e Soluções

1. **Erro de Conexão com o Banco:**
   - Verifique as configurações no `ecosystem.config.cjs`
   - Confirme se o PostgreSQL está rodando
   - Verifique as credenciais no arquivo `.env`

2. **Erro EADDRINUSE:**
   ```bash
   # Verificar processo usando a porta
   lsof -i :3000
   lsof -i :8080
   
   # Matar processo se necessário
   kill -9 <PID>
   ```

3. **Logs com Erros:**
   ```bash
   # Limpar logs
   pm2 flush
   
   # Reiniciar com logs limpos
   pm2 reload all
   ```

### Verificação de Saúde

Para verificar se os serviços estão funcionando corretamente:

1. Backend: http://localhost:3000/health
2. Frontend: http://localhost:8080

## Ambiente de Produção

Para ambiente de produção, utilize as configurações de produção:

```bash
# Iniciar em modo produção
NODE_ENV=production pm2 start ecosystem.config.cjs

# Ou usar configurações específicas de produção
pm2 start ecosystem.config.cjs --env production
```

## Monitoramento Avançado

O PM2 oferece recursos avançados de monitoramento:

```bash
# Instalar módulo de métricas
pm2 install pm2-metrics

# Visualizar dashboard
pm2 plus
```

## Backup de Configurações

Recomenda-se manter backup das configurações PM2:

```bash
# Exportar configurações
pm2 dump

# Restaurar configurações
pm2 resurrect
```

## Suporte

Para mais informações ou suporte:
- Documentação PM2: https://pm2.keymetrics.io/
- Repositório do Projeto: https://github.com/brunonatanaelsr/assist-move-assist
