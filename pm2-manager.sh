#!/bin/bash

# Script de gerenciamento do PM2 para o MoveMarias

case "$1" in
    start)
        echo "🚀 Iniciando backend com PM2..."
        pm2 start backend/pm2.config.js
        echo "✅ Backend iniciado com sucesso!"
        ;;
    stop)
        echo "🛑 Parando backend..."
        pm2 stop movemarias-backend
        echo "✅ Backend parado!"
        ;;
    restart)
        echo "🔄 Reiniciando backend..."
        pm2 restart movemarias-backend
        echo "✅ Backend reiniciado!"
        ;;
    logs)
        echo "📋 Visualizando logs do backend..."
        pm2 logs movemarias-backend
        ;;
    status)
        echo "📊 Status do PM2..."
        pm2 status
        ;;
    reload)
        echo "🔄 Recarregando backend (zero downtime)..."
        pm2 reload movemarias-backend
        echo "✅ Backend recarregado!"
        ;;
    delete)
        echo "🗑️ Removendo processo do PM2..."
        pm2 delete movemarias-backend
        echo "✅ Processo removido!"
        ;;
    monit)
        echo "📈 Abrindo monitor do PM2..."
        pm2 monit
        ;;
    *)
        echo "🔧 Uso: $0 {start|stop|restart|logs|status|reload|delete|monit}"
        echo ""
        echo "Comandos disponíveis:"
        echo "  start   - Inicia o backend com PM2"
        echo "  stop    - Para o backend"
        echo "  restart - Reinicia o backend"
        echo "  logs    - Visualiza os logs em tempo real"
        echo "  status  - Mostra o status dos processos"
        echo "  reload  - Recarrega o backend sem downtime"
        echo "  delete  - Remove o processo do PM2"
        echo "  monit   - Abre o monitor do PM2"
        exit 1
        ;;
esac
