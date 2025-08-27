// Configuração global do PostgreSQL
export const usePostgreSQLConfig = () => {
  // Sempre usar PostgreSQL - sem modo dummy
  const isPostgreSQLMode = true;
  
  return {
    isPostgreSQLMode,
    apiBaseUrl: window.location.hostname === 'movemarias.squadsolucoes.com.br' 
      ? 'http://movemarias.squadsolucoes.com.br/api'
      : 'http://localhost:3001/api'
  };
};

// Mock data para desenvolvimento enquanto não temos dados reais
export const mockBeneficiarias = [
  {
    id: 1,
    nome: 'Maria Silva Santos',
    cpf: '123.456.789-00',
    telefone: '(11) 99999-1111',
    endereco: 'Rua das Flores, 123 - São Paulo, SP',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z'
  },
  {
    id: 2,
    nome: 'Ana Paula Oliveira',
    cpf: '987.654.321-00',
    telefone: '(11) 99999-2222',
    endereco: 'Av. Principal, 456 - São Paulo, SP',
    created_at: '2024-01-16T14:30:00Z',
    updated_at: '2024-01-16T14:30:00Z'
  }
];

export const mockProjetos = [
  {
    id: 1,
    nome: 'Capacitação Profissional',
    descricao: 'Programa de capacitação em diversas áreas profissionais',
    data_inicio: '2024-01-01',
    data_fim: '2024-12-31',
    ativo: true
  },
  {
    id: 2,
    nome: 'Apoio Psicológico',
    descricao: 'Atendimento psicológico individual e em grupo',
    data_inicio: '2024-01-01',
    data_fim: '2024-12-31',
    ativo: true
  }
];
