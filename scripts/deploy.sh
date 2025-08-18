#!/bin/bash

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Função para log
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

# Verificar se as variáveis de ambiente estão definidas
if [ -z "$DB_HOST" ] || [ -z "$DB_USER" ] || [ -z "$DB_NAME" ]; then
    error "Variáveis de ambiente necessárias não definidas"
    exit 1
fi

# Criar diretório de backup se não existir
BACKUP_DIR="./backups"
mkdir -p "$BACKUP_DIR"

# Backup do banco de dados
log "📦 Iniciando backup do banco de dados..."
BACKUP_FILE="${BACKUP_DIR}/backup_$(date +%Y%m%d_%H%M%S).sql"
if pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" > "$BACKUP_FILE"; then
    log "✅ Backup criado com sucesso em $BACKUP_FILE"
else
    error "Falha ao criar backup"
    exit 1
fi

# Build do frontend
log "🏗️ Iniciando build do frontend..."
cd frontend
if npm ci && npm run build; then
    log "✅ Build do frontend concluído"
else
    error "Falha no build do frontend"
    exit 1
fi

# Build do backend
log "🏗️ Iniciando build do backend..."
cd ../backend
if npm ci --production && npm run build; then
    log "✅ Build do backend concluído"
else
    error "Falha no build do backend"
    exit 1
fi

# Aplicar migrations
log "🔄 Aplicando migrations..."
if npm run migrate; then
    log "✅ Migrations aplicadas com sucesso"
else
    error "Falha ao aplicar migrations"
    exit 1
fi

# Verificar conexão com o banco
log "🔍 Verificando conexão com o banco..."
if node scripts/check-database.js; then
    log "✅ Conexão com banco OK"
else
    error "Falha na conexão com o banco"
    exit 1
fi

# Reiniciar PM2
log "🔄 Reiniciando serviços..."
if pm2 reload ecosystem.config.js; then
    log "✅ Serviços reiniciados com sucesso"
else
    error "Falha ao reiniciar serviços"
    exit 1
fi

# Verificar health check
log "🏥 Verificando health check..."
sleep 5 # Aguardar serviço iniciar
if curl -f http://localhost:3000/health; then
    log "✅ Health check OK"
else
    warn "Health check falhou"
fi

log "✨ Deploy concluído com sucesso!"
