# Guia de Desenvolvimento

## Primeiros Passos

### Pré-requisitos

- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- Git
- Docker & Docker Compose
- VS Code (recomendado)

### Configuração do Ambiente

1. Clone o repositório:
```bash
git clone https://github.com/movemarias/assist-move-assist.git
cd assist-move-assist
```

2. Instale as dependências:
```bash
# Frontend
npm install

# Backend
cd backend
npm install
```

3. Configure as variáveis de ambiente:
```bash
# Frontend
cp .env.example .env.local

# Backend
cp .env.example .env
```

4. Inicie os serviços:
```bash
docker-compose up -d
```

5. Execute as migrações:
```bash
cd backend
npx prisma migrate dev
```

6. Inicie o projeto:
```bash
# Frontend (terminal 1)
npm run dev

# Backend (terminal 2)
cd backend
npm run dev
```

## Estrutura do Código

### Frontend

#### Componentes

- Use componentes funcionais
- Mantenha componentes pequenos e focados
- Utilize TypeScript e Props typing
- Separe lógica de UI

```tsx
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export function Button({ label, onClick, disabled }: ButtonProps) {
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className="btn-primary"
    >
      {label}
    </button>
  );
}
```

#### Hooks

- Extraia lógica complexa para hooks
- Nomeie com prefixo 'use'
- Documente parâmetros e retorno

```tsx
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
```

#### Estado

- Use React Query para estado do servidor
- Context API para estado global
- Estado local para UI

```tsx
function useBeneficiarias() {
  return useQuery({
    queryKey: ['beneficiarias'],
    queryFn: () => api.get('/beneficiarias')
  });
}
```

### Backend

#### Controllers

- Use classes
- Métodos async/await
- Tratamento de erros
- Validação de input

```typescript
export class BeneficiariasController {
  async create(req: Request, res: Response) {
    try {
      const data = await validateCreateBeneficiaria(req.body);
      const beneficiaria = await beneficiariasService.create(data);
      res.status(201).json(beneficiaria);
    } catch (error) {
      handleError(error, res);
    }
  }
}
```

#### Services

- Lógica de negócio
- Transações
- Cache
- Eventos

```typescript
export class BeneficiariasService {
  async create(data: CreateBeneficiariaDTO) {
    const transaction = await prisma.$transaction(async (tx) => {
      const beneficiaria = await tx.beneficiaria.create({
        data
      });

      await this.cache.invalidate('beneficiarias');
      await this.events.emit('beneficiaria.created', beneficiaria);

      return beneficiaria;
    });

    return transaction;
  }
}
```

## Padrões e Boas Práticas

### Nomenclatura

- **Arquivos**: PascalCase para componentes, camelCase para outros
- **Variáveis**: camelCase
- **Interfaces/Types**: PascalCase com prefixo I para interfaces
- **Constantes**: UPPER_SNAKE_CASE

### Git

- Branches: feature/, bugfix/, hotfix/
- Commits: conventional commits
- PRs: template preenchido
- Code review obrigatório

### Testes

#### Frontend

```typescript
describe('Button', () => {
  it('should render with label', () => {
    render(<Button label="Test" onClick={() => {}} />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    const onClick = jest.fn();
    render(<Button label="Test" onClick={onClick} />);
    fireEvent.click(screen.getByText('Test'));
    expect(onClick).toHaveBeenCalled();
  });
});
```

#### Backend

```typescript
describe('BeneficiariasService', () => {
  it('should create beneficiaria', async () => {
    const data = {
      nome: 'Test',
      cpf: '123.456.789-00'
    };

    const beneficiaria = await service.create(data);
    expect(beneficiaria).toHaveProperty('id');
    expect(beneficiaria.nome).toBe(data.nome);
  });
});
```

### Documentação

- JSDoc para funções/componentes
- README atualizado
- Changelog mantido
- Documentação de API

```typescript
/**
 * Hook para gerenciar paginação
 * @param initialPage Página inicial
 * @param pageSize Tamanho da página
 * @returns Objeto com estado e métodos de paginação
 */
function usePagination(initialPage = 1, pageSize = 20) {
  // ...
}
```

## Fluxo de Desenvolvimento

1. **Planejamento**
   - Análise de requisitos
   - Design técnico
   - Criação de tasks

2. **Desenvolvimento**
   - Clone do repo
   - Nova branch
   - Implementação
   - Testes

3. **Review**
   - Self review
   - Push branch
   - Create PR
   - Code review

4. **QA**
   - Testes manuais
   - Testes automatizados
   - Performance
   - Segurança

5. **Deploy**
   - Merge PR
   - CI/CD pipeline
   - Monitoramento
   - Feedback

## Debug

### Frontend

- React DevTools
- Network tab
- Console logs
- Error boundaries

### Backend

- VS Code debugger
- Postman/Insomnia
- Winston logs
- APM tools

## Performance

### Frontend

- Memoization (useMemo, memo)
- Code splitting
- Image optimization
- Bundle analysis

### Backend

- Query optimization
- Caching
- Connection pooling
- Request profiling

## Segurança

- Input validation
- SQL injection prevention
- XSS protection
- CSRF tokens
- Rate limiting

## Troubleshooting

### Problemas Comuns

1. **Build falha**
   - Verificar dependências
   - Limpar cache
   - Verificar TypeScript

2. **Testes falham**
   - Verificar mocks
   - Limpar estado
   - Atualizar snapshots

3. **Performance**
   - Profiling
   - Memory leaks
   - Query optimization

## VS Code Setup

### Extensões Recomendadas

- ESLint
- Prettier
- GitLens
- REST Client
- Debug
- Docker

### Settings

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.updateImportsOnFileMove.enabled": "always"
}
```

## Resources

### Docs Oficiais

- [React](https://reactjs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Node.js](https://nodejs.org/)
- [Express](https://expressjs.com/)
- [Prisma](https://www.prisma.io/)

### Style Guides

- [Airbnb React](https://github.com/airbnb/javascript/tree/master/react)
- [Google TypeScript](https://google.github.io/styleguide/tsguide.html)

### Tools

- [Postman](https://www.postman.com/)
- [React DevTools](https://chrome.google.com/webstore/detail/react-developer-tools/)
- [Redux DevTools](https://chrome.google.com/webstore/detail/redux-devtools/)
