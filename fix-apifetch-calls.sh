#!/bin/bash

echo "Corrigindo todas as chamadas apiFetch no sistema..."

# Função para processar um arquivo
process_file() {
  local file="$1"
  echo "Processando $file..."

  # Backup do arquivo
  cp "$file" "$file.bak"

  # Substituições básicas
  sed -i "s/await apiFetch(\`\/api\/beneficiarias\/\${id}\`)/await apiService.getBeneficiaria(id!)/g" "$file"
  sed -i "s/await apiFetch(\`\/api\/beneficiarias\/\${.*}\`)/await apiService.getBeneficiaria(id!)/g" "$file"
  
  # Substituições de GET específicas
  sed -i "s/await apiFetch(\`\/api\/formularios\/\([^\/]*\)\/\${id}\`)/await apiService.get(\`\/formularios\/\1\/\${id}\`)/g" "$file"
  sed -i "s/await apiFetch('\/api\/projetos')/await apiService.getProjetos()/g" "$file"
  sed -i "s/await apiFetch('\/api\/oficinas')/await apiService.getOficinas()/g" "$file"
  
  # Substituições de POST
  sed -i "s/await apiFetch('\/api\/formularios\/\([^']*\)', {\s*method: 'POST',\s*body: JSON.stringify(\([^)]*\))\s*})/await apiService.post('\/formularios\/\1', \2)/g" "$file"
  sed -i "s/await apiFetch('\/api\/\([^']*\)', {\s*method: 'POST',\s*body: JSON.stringify(\([^)]*\))\s*})/await apiService.post('\/\1', \2)/g" "$file"
  
  echo "✓ Processado $file"
}

# Lista de arquivos para processar
files=(
  "src/pages/formularios/FichaEvolucao.tsx"
  "src/pages/formularios/DeclaracoesRecibos.tsx"
  "src/pages/formularios/PlanoAcao.tsx"
  "src/pages/formularios/TermosConsentimento.tsx"
  "src/pages/formularios/RodaVida.tsx"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    process_file "$file"
  else
    echo "⚠ Arquivo não encontrado: $file"
  fi
done

echo "✅ Processamento concluído!"
echo "📋 Verifique os arquivos e teste as funcionalidades"
echo "💾 Backups salvos com extensão .bak"
