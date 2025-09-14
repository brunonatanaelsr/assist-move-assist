## Descrição

Descreva o que este PR faz, por que foi necessário e o impacto esperado.

## Mudanças

- [ ] (exemplo) Consolida cliente de API no front
- [ ] (exemplo) Ajusta RBAC para superadmin
- [ ] ...

## Como testar

Passos para validar localmente:

1. `npm ci && npm run build -- --mode e2e`
2. (opcional) `bash scripts/run-e2e-local.sh` para rodar E2E completo com Docker
3. Verifique:
   - Login e redirecionamento para `/dashboard`
   - Listagem/cadastro de beneficiárias
   - Formulários (criar/editar/excluir) e export (se aplicável)
   - Notificações (abrir painel, marcar como lidas, preferências)

## Screenshots/Registros (se aplicável)

Anexe imagens, GIFs ou logs relevantes.

## Checklist

- [ ] Atualizei a documentação (README/CHANGELOG) quando necessário
- [ ] Testes unitários atualizados/adicionados
- [ ] E2E atualizado (quando alterar fluxo) e passou localmente/CI
- [ ] Lint e TypeScript OK (`npm run lint` / `npm run type-check`)
- [ ] Migrations versionadas e idempotentes (se houver)
- [ ] Variáveis de ambiente documentadas/ajustadas (se houver)
- [ ] Não inclui segredos/credenciais no repositório

## Notas de deploy (se necessário)

- Variáveis novas: `...`
- Passos de migração: `...`

