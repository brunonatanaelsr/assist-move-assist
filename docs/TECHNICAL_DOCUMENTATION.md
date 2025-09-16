# Documentação Técnica - Componentes Customizados
## Sistema Assist Move Assist

### Índice
1. [Hooks Customizados](#hooks-customizados)
2. [Serviços de Produção](#serviços-de-produção)
3. [Componentes UI](#componentes-ui)
4. [Utilitários](#utilitários)
5. [Tipos e Interfaces](#tipos-e-interfaces)

---

## Hooks Customizados

### useAuth
**Localização**: `src/hooks/useAuth.tsx`

```typescript
interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
}

// Uso
const { user, profile, signIn, signOut } = useAuth();
```

**Funcionalidades**:
- Gerenciamento de estado de autenticação
- Carregamento automático do perfil do usuário
- Métodos de login/logout
- Atualização de perfil
- Proteção contra renderização sem contexto

### useFormValidation
**Localização**: `src/hooks/useFormValidation.ts`

```typescript
interface UseFormValidationReturn {
  errors: ValidationErrors;
  isValid: boolean;
  validateField: (fieldName: string, value: any) => string | null;
  validateForm: (formData: Record<string, any>) => boolean;
  clearErrors: () => void;
  clearFieldError: (fieldName: string) => void;
}

// Uso específico para beneficiárias
const { errors, validateForm, validateField } = useBeneficiariaValidation();
```

**Funcionalidades**:
- Validação em tempo real de campos
- Regras customizáveis por campo
- Validação de documentos brasileiros
- Limpeza inteligente de erros
- Hook específico para beneficiárias

### useMobile
**Localização**: `src/hooks/use-mobile.tsx`

```typescript
const isMobile = useMobile();

// Uso condicional
{isMobile ? <MobileComponent /> : <DesktopComponent />}
```

**Funcionalidades**:
- Detecção responsiva de dispositivos
- Hook otimizado com debounce
- Compatibilidade com SSR

---

## Serviços de Produção

### Logger Service
**Localização**: `src/lib/logger.ts`

```typescript
interface LogContext {
  userId?: string;
  page?: string;
  action?: string;
  timestamp?: string;
  userAgent?: string;
  url?: string;
}

// Uso
import { logger } from '@/lib/logger';

logger.info('Ação realizada', {
  page: '/beneficiarias',
  action: 'create_beneficiaria'
});

logger.error('Erro crítico', error, {
  page: '/dashboard',
  action: 'data_fetch_error'
});
```

**Funcionalidades**:
- Níveis de log configuráveis
- Contexto automático (página, usuário, timestamp)
- Preparado para integração com Sentry/LogRocket
- Modo desenvolvimento vs produção
- Rate limiting para evitar spam

### Document Validator
**Localização**: `src/lib/validators.ts`

```typescript
// Validação de CPF
const result = DocumentValidator.validateCPF('123.456.789-01');
// { isValid: boolean, error?: string, formatted: string }

// Formatação automática
const formatted = DocumentValidator.formatCPF('12345678901');
// "123.456.789-01"

// Validação de telefone
const phoneResult = DocumentValidator.validatePhone('(11) 99999-9999');
```

**Funcionalidades**:
- Validação matemática de CPF e CNPJ
- Formatação automática de documentos
- Validação de telefones brasileiros
- Validação de CEP e email
- Funções utilitárias de formatação

### Session Manager
**Localização**: `src/lib/sessionManager.ts`

```typescript
class SessionManager {
  static refreshToken(): Promise<void>;
  static clearSession(): void;
  static getExpirationTime(): Date | null;
  static isSessionValid(): boolean;
}

// Uso automático - não requer interação manual
// Refresh automático configurado para 50 minutos
```

**Funcionalidades**:
- Auto-refresh de tokens antes da expiração
- Armazenamento seguro em cookies httpOnly
- Limpeza automática de sessões expiradas
- Integração com o serviço de autenticação do backend
- Tratamento de erros de rede

### App Initializer
**Localização**: `src/lib/appInitializer.ts`

```typescript
// Inicialização automática no App.tsx
await AppInitializer.initialize();

// Verificar status
const isInitialized = AppInitializer.getInitializationStatus();
```

**Funcionalidades**:
- Configuração global de error handlers
- Monitoramento de performance
- Inicialização ordenada de serviços
- Tracking de visibilidade da página
- Logs de tempo de carregamento

---

## Componentes UI

### ErrorBoundary
**Localização**: `src/components/ErrorBoundary.tsx`

```typescript
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

// Uso
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

**Funcionalidades**:
- Captura de erros React com graceful degradation
- Interface amigável para falhas
- Logging automático de erros
- Botão de reload para recuperação
- Preservação de contexto do usuário

### ProtectedRoute
**Localização**: `src/components/auth/ProtectedRoute.tsx`

```typescript
// Uso
<ProtectedRoute requiredRole="admin">
  <AdminPanel />
</ProtectedRoute>
```

**Funcionalidades**:
- Proteção baseada em autenticação
- Controle de acesso por role
- Redirecionamento automático
- Loading states

### Layout Components
**Localização**: `src/components/layout/`

```typescript
// Header com navegação responsiva
<Header />

// Layout principal com sidebar
<MainLayout>
  <Content />
</MainLayout>
```

**Funcionalidades**:
- Design system consistente
- Navegação responsiva
- Sidebar colapsável
- Breadcrumbs automáticos

---

## Utilitários

### Export Service
**Integrado em**: `src/pages/Relatorios.tsx`

```typescript
// Export PDF
await exportToPDF(data, {
  title: 'Relatório de Beneficiárias',
  filename: 'beneficiarias.pdf',
  columns: ['nome', 'cpf', 'telefone']
});

// Export Excel
await exportToExcel(data, {
  filename: 'beneficiarias.xlsx',
  sheetName: 'Beneficiárias'
});
```

**Funcionalidades**:
- Export PDF com formatação profissional
- Export Excel com estilos e fórmulas
- Configuração flexível de colunas
- Progress feedback para arquivos grandes
- Tratamento de erros robusto

### Utils Library
**Localização**: `src/lib/utils.ts`

```typescript
// Classname utility (cn)
const className = cn('base-class', condition && 'conditional-class');

// Date formatting
const formatted = formatDate(new Date(), 'dd/MM/yyyy');

// Currency formatting
const currency = formatCurrency(1234.56); // "R$ 1.234,56"
```

**Funcionalidades**:
- Utilitários de className (clsx + tailwind-merge)
- Formatação de datas brasileiras
- Formatação de moeda
- Debounce e throttle
- Validações comuns

---

## Tipos e Interfaces

### Types Principais
**Localização**: `src/types/`

```typescript
// User types
interface User {
  id: string;
  email: string;
  created_at: string;
}

interface Profile {
  id: string;
  email: string;
  nome_completo: string;
  role: 'admin' | 'user';
  created_at: string;
  updated_at: string;
}

// Beneficiária
interface Beneficiaria {
  id: string;
  nome_completo: string;
  cpf: string;
  data_nascimento: string;
  endereco?: string;
  contato1: string;
  contato2?: string;
  // ... outros campos
}

// Feed
interface FeedPost {
  id: string;
  titulo: string;
  conteudo: string;
  tipo: 'anuncio' | 'noticia' | 'evento';
  autor_id: string;
  created_at: string;
}

interface FeedComment {
  id: string;
  post_id: string;
  conteudo: string;
  autor_id: string;
  created_at: string;
}

// Tarefas
interface Tarefa {
  id: string;
  titulo: string;
  descricao?: string;
  beneficiaria_id?: string;
  responsavel_id: string;
  data_vencimento: string;
  prioridade: 'baixa' | 'media' | 'alta';
  status: 'pendente' | 'em_andamento' | 'concluida' | 'cancelada';
  created_at: string;
}
```

### Tipos do Banco de Dados
**Fonte**: `src/types/api.ts`

```typescript
// Tipagens alinhadas ao schema PostgreSQL
export interface Beneficiaria {
  id: string;
  nome: string;
  dataNascimento: string;
  createdAt: string;
  updatedAt: string;
}

export interface Projeto {
  id: string;
  nome: string;
  descricao?: string;
  dataInicio: string;
  dataFim?: string;
}
```

---

## Padrões de Desenvolvimento

### Estrutura de Arquivos
```
src/
├── components/          # Componentes reutilizáveis
│   ├── ui/             # Componentes base (shadcn/ui)
│   ├── layout/         # Componentes de layout
│   └── auth/           # Componentes de autenticação
├── hooks/              # Hooks customizados
├── lib/                # Serviços e utilitários
├── pages/              # Páginas da aplicação
├── types/              # Definições de tipos
├── integrations/       # Integrações externas
└── utils/              # Utilitários específicos
```

### Convenções de Nomenclatura
```typescript
// Componentes: PascalCase
const BeneficiariaCard = () => {};

// Hooks: camelCase com 'use' prefix
const useFormValidation = () => {};

// Serviços: camelCase
const sessionManager = {};

// Constantes: UPPER_SNAKE_CASE
const API_BASE_URL = '';

// Tipos: PascalCase
interface UserProfile {}
```

### Padrões de Estado
```typescript
// Loading states consistentes
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
const [data, setData] = useState<T[]>([]);

// Error handling padrão
try {
  setLoading(true);
  const result = await apiCall();
  setData(result);
} catch (error) {
  logger.error('Erro na operação', error);
  setError(error.message);
} finally {
  setLoading(false);
}
```

### Integração com o Backend Express
```typescript
// Consultas consistentes via cliente HTTP
const { data } = await apiClient.get<Projeto[]>('/api/projetos', {
  params: { orderBy: 'createdAt', direction: 'desc' }
});

// Subscrições em tempo real com Socket.IO
useEffect(() => {
  const socket = socketClient.connect();
  socket.on('projetos:updated', handleChange);

  return () => {
    socket.off('projetos:updated', handleChange);
    socket.disconnect();
  };
}, []);
```

---

## Performance e Otimização

### Lazy Loading
```typescript
// Páginas lazy loaded
const LazyBeneficiarias = lazy(() => import('./pages/Beneficiarias'));

// Uso com Suspense
<Suspense fallback={<Loading />}>
  <LazyBeneficiarias />
</Suspense>
```

### Memoization
```typescript
// Componentes pesados
const ExpensiveComponent = memo(({ data }) => {
  const processedData = useMemo(() => 
    processLargeData(data), [data]
  );
  
  return <div>{processedData}</div>;
});

// Callbacks estáveis
const handleClick = useCallback((id: string) => {
  onItemClick(id);
}, [onItemClick]);
```

### Bundle Optimization
```typescript
// Code splitting por rota
const routes = [
  {
    path: '/beneficiarias',
    component: lazy(() => import('./pages/Beneficiarias'))
  }
];

// Tree shaking
import { specific } from 'library'; // ✅
import * as library from 'library'; // ❌
```

---

**Última atualização**: Agosto 2025  
**Versão**: 1.0.0  
**Responsável**: Equipe de Desenvolvimento
