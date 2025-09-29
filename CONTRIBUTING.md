# Guia de Contribuição

## Começando

1. Fork o repositório
2. Clone seu fork: `git clone git@github.com:seu-usuario/assist-move-assist.git`
3. Crie um branch para sua feature: `git checkout -b feature/nome-da-feature`

## Desenvolvimento

1. Instale as dependências:
   ```bash
   npm install
   npm --prefix apps/frontend install
   npm --prefix apps/backend install
   ```

2. Inicie em modo desenvolvimento:
   ```bash
   npm run dev
   ```

## Padrões de Código

- Use TypeScript
- Mantenha 100% de cobertura de tipos
- Siga o ESLint e Prettier configurados
- Escreva testes para novas funcionalidades
- Documente APIs usando OpenAPI/Swagger
- Valide entradas com Zod (vide `apps/backend/src/validation`) aplicando transforms para sanitizar dados
- Use commits semânticos (feat:, fix:, docs:, etc.)

## Pull Requests

1. Atualize seu branch:
   ```bash
   git fetch origin
   git rebase origin/main
   ```

2. Execute os testes:
   ```bash
   npm test
   ```

3. Execute o lint:
   ```bash
   npm run lint
   ```

4. Push suas mudanças:
   ```bash
   git push origin feature/nome-da-feature
   ```

5. Abra um Pull Request descrevendo:
   - O que foi alterado
   - Por que foi alterado
   - Como testar
   - Screenshots (se relevante)

## Commits

Use commits semânticos seguindo a convenção:

```
<tipo>(<escopo>): <descrição>

[corpo]

[rodapé]
```

Tipos:
- feat: Nova funcionalidade
- fix: Correção de bug
- docs: Documentação
- style: Formatação (sem mudança de código)
- refactor: Refatoração
- test: Testes
- chore: Tarefas de build, CI, etc

Exemplo:
```
feat(beneficiarias): adiciona campo de documento

- Adiciona campo CPF/RG
- Valida formato
- Testes incluídos

Closes #123
```

## Revisão de Código

- Um PR deve ser revisado por pelo menos 1 desenvolvedor
- Todos os testes e checks devem passar
- O código deve seguir os padrões do projeto
- A documentação deve estar atualizada

## Dúvidas?

- Abra uma issue
- Pergunte no canal #dev do Slack
- Consulte a [documentação de desenvolvimento](docs/development.md)