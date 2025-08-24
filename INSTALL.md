# Guia de Instalação

Este documento descreve o processo de instalação e configuração do sistema Move Marias.

## Pré-requisitos

- Linux (Ubuntu/Debian recomendado)
- Node.js versão 16 ou superior
- npm versão 8 ou superior
- Sudo/root access

## Instalação Automática

A forma mais simples de instalar é usando nosso script de instalação automática:

```bash
# Dar permissão de execução ao script
chmod +x install.sh

# Executar o script (requer sudo)
sudo ./install.sh
```

O script fará automaticamente:
1. Instalação do Docker (se necessário)
2. Instalação do cliente PostgreSQL
3. Instalação do PM2 globalmente
4. Configuração do container PostgreSQL
5. Criação do banco de dados e execução das migrações
6. Criação do usuário inicial
7. Instalação das dependências do projeto
8. Inicialização da aplicação com PM2

## Instalação Manual

Se preferir fazer a instalação manualmente, siga os passos abaixo:

### 1. PostgreSQL (via Docker)

```bash
# Iniciar container PostgreSQL
docker run -d --name postgres \
    -e POSTGRES_PASSWORD=15002031 \
    -e POSTGRES_USER=postgres \
    -p 5432:5432 \
    postgres:latest
```

### 2. Criar Banco de Dados

```bash
# Instalar cliente PostgreSQL
sudo apt-get update
sudo apt-get install -y postgresql-client

# Criar banco de dados
PGPASSWORD=15002031 psql -h localhost -U postgres -c "CREATE DATABASE movemarias;"
```

### 3. Executar Migrações

```bash
# Dar permissão ao script de migração
chmod +x run-migrations.sh

# Executar migrações
./run-migrations.sh
```

### 4. Criar Usuário Inicial

```bash
# Remover restrição de tamanho da senha (temporário)
PGPASSWORD=15002031 psql -h localhost -U postgres -d movemarias -c "ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS senha_hash_length;"

# Criar usuário admin
PGPASSWORD=15002031 psql -h localhost -U postgres -d movemarias -c "INSERT INTO usuarios (nome, email, senha_hash, papel, ativo, data_criacao, data_atualizacao) VALUES ('Bruno', 'bruno@move.com', '15002031', 'admin', true, NOW(), NOW());"
```

### 5. Instalar Dependências

```bash
# Instalar PM2 globalmente
npm install -g pm2

# Instalar dependências do projeto principal
npm install

# Instalar dependências do backend
cd backend && npm install
cd ..
```

### 6. Iniciar Aplicação

```bash
# Iniciar com PM2
pm2 start ecosystem.config.cjs
```

## Verificação da Instalação

Após a instalação, você pode acessar:

- Frontend: http://localhost:8080
- Backend: http://localhost:3000

### Credenciais Iniciais

- Email: bruno@move.com
- Senha: 15002031

### Comandos Úteis

```bash
# Ver logs da aplicação
pm2 logs

# Reiniciar aplicação
pm2 restart all

# Parar aplicação
pm2 stop all

# Ver status da aplicação
pm2 status
```

## Solução de Problemas

### CORS

Se encontrar problemas de CORS, verifique o arquivo `backend/middleware/cors.js` e adicione as origens necessárias.

### Portas em Uso

Se as portas 3000 ou 8080 estiverem em uso, você pode alterá-las no arquivo `ecosystem.config.cjs`.

### Logs

Os logs da aplicação são armazenados em:
- Backend: `logs/backend-*.log`
- Frontend: `logs/frontend-*.log`
