#!/bin/bash

# Script para corrigir todas as occorrências de apiFetch

echo "Corrigindo imports de apiFetch para apiService..."

# Lista de arquivos para corrigir
files=(
  "src/pages/formularios/AnamneseSocial.tsx"
  "src/pages/formularios/FichaEvolucao.tsx"
  "src/pages/formularios/DeclaracoesRecibos.tsx"
  "src/pages/formularios/PlanoAcao.tsx"
  "src/pages/formularios/TermosConsentimento.tsx"
  "src/pages/formularios/RodaVida.tsx"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Processando $file..."
    # Substituir import
    sed -i "s/import { apiFetch } from '@\/lib\/api';/import { apiService } from '@\/services\/apiService';/g" "$file"
    echo "✓ Import corrigido em $file"
  else
    echo "⚠ Arquivo não encontrado: $file"
  fi
done

echo "✅ Imports corrigidos! Agora você precisa ajustar as chamadas manualmente."
