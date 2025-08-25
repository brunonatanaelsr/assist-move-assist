#!/bin/bash

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color
YELLOW='\033[1;33m'

# Função para exibir mensagens com timestamp
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

# Verificar se o script está sendo executado como root
if [ "$EUID" -ne 0 ]; then 
    error "Este script precisa ser executado como root (use sudo)"
    exit 1
fi

# 1. Instalando Docker se não estiver instalado
log "Verificando instalação do Docker..."
if ! command -v docker &> /dev/null; then
    log "Docker não encontrado. Instalando Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    log "Docker instalado com sucesso!"
else
    log "Docker já está instalado."
fi

# 2. Instalando PostgreSQL Client
log "Instalando PostgreSQL Client..."
apt-get update
apt-get install -y postgresql-client

# 3. Instalando PM2 globalmente
log "Instalando PM2 globalmente..."
npm install -g pm2

# 4. Iniciando container PostgreSQL
log "Iniciando container PostgreSQL..."
# Parando e removendo container anterior se existir
docker rm -f postgres &> /dev/null
docker run -d \
    --name postgres \
    -e POSTGRES_PASSWORD=15002031 \
    -e POSTGRES_USER=postgres \
    -p 5432:5432 \
    postgres:latest

# Aguardando PostgreSQL inicializar
log "Aguardando PostgreSQL inicializar..."
sleep 10

# 5. Criando banco de dados
log "Criando banco de dados..."
PGPASSWORD=15002031 psql -h localhost -U postgres -c "CREATE DATABASE movemarias;" || warning "Banco de dados já existe"

# 6. Executando migrações
log "Executando migrações..."
chmod +x run-migrations.sh
./run-migrations.sh

# 7. Criando usuário inicial
log "Criando usuário inicial..."
PGPASSWORD=15002031 psql -h localhost -U postgres -d movemarias -c "ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS senha_hash_length;"
PGPASSWORD=15002031 psql -h localhost -U postgres -d movemarias -c "INSERT INTO usuarios (nome, email, senha_hash, papel, ativo, data_criacao, data_atualizacao) VALUES ('Bruno', 'bruno@move.com', '15002031', 'admin', true, NOW(), NOW()) ON CONFLICT (email) DO NOTHING;"

# 8. Instalando dependências do projeto
log "Instalando dependências do projeto principal..."
npm install

log "Instalando dependências do backend..."
cd backend && npm install
cd ..

# 9. Iniciando aplicação com PM2
log "Iniciando aplicação com PM2..."
pm2 delete all &> /dev/null
pm2 start ecosystem.config.cjs

# 10. Exibindo status final
log "Instalação concluída!"
echo -e "\n${GREEN}=== Status da Aplicação ===${NC}"
echo -e "Backend URL: http://localhost:3000"
echo -e "Frontend URL: http://localhost:8080"
echo -e "Banco de dados:"
echo -e "  - Host: localhost"
echo -e "  - Porta: 5432"
echo -e "  - Usuário: postgres"
echo -e "  - Senha: 15002031"
echo -e "  - Banco: movemarias"
echo -e "\nUsuário inicial:"
echo -e "  - Email: bruno@move.com"
echo -e "  - Senha: 15002031"
echo -e "\nPara ver os logs da aplicação, execute: ${YELLOW}pm2 logs${NC}"
