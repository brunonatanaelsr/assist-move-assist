# ✅ Próximos Passos para Conclusão da Produção

Este documento consolida os itens restantes para que o Assist Move Marias opere com 100% dos recursos previstos em um ambiente de produção real.

## 1. Variáveis de Ambiente de Produção
- Definir `NODE_ENV=production` para habilitar otimizações específicas do build.
- Gerar um `JWT_SECRET` com pelo menos 32 caracteres e alta entropia.
- Apontar `DATABASE_URL` para a instância definitiva de PostgreSQL.
- Atualizar `FRONTEND_URL` para o domínio oficial publicado.

> **Checklist:** Validar que os serviços backend e frontend reiniciam sem erros após a atualização das variáveis e que as migrações executam com sucesso na base de produção.

## 2. Endurecimento de Segurança
- Provisionar e instalar certificados SSL/TLS válidos (Let’s Encrypt ou provedor comercial).
- Configurar regras de firewall restringindo acessos aos serviços internos.
- Habilitar rotinas automáticas de backup e testes periódicos de restauração.
- Revisar políticas de armazenamento seguro de segredos (por exemplo, Vault ou secret manager da cloud).

> **Checklist:** Executar um smoke test completo via HTTPS e validar alertas de segurança (ex.: scanners de porta, varredura OWASP ZAP).

## 3. Observabilidade e Monitoramento Externos
- Ativar Sentry para rastreamento de exceções críticas no frontend e backend.
- Configurar Google Analytics para acompanhar o engajamento do portal público.
- Integrar LogRocket (ou equivalente) para reprodução de sessões, se desejado.
- Criar alertas de uptime/performance (StatusCake, UptimeRobot ou monitor nativo da cloud).

> **Checklist:** Injetar as credenciais via variáveis de ambiente seguras, validar dashboards e configurar notificações para o time responsável.

## 4. Governança e Operações Contínuas
- Documentar o fluxo de deploy (CI/CD) incluindo rollback rápido.
- Definir responsáveis pelos turnos de monitoramento e suporte de primeiro nível.
- Agendar revisões trimestrais de segurança e testes de recuperação de desastre.
- Incluir na rotina de release a execução de `npx tsx scripts/validate-api-docs.ts` para garantir que a documentação reflete as rotas ativas.

> **Checklist:** Garantir que o runbook de produção esteja acessível e atualizado para toda a equipe de operação.

---

Concluindo os itens acima, o sistema terá seus recursos operando com credenciais, monitoramento e proteções equivalentes a um cenário de produção completo.
