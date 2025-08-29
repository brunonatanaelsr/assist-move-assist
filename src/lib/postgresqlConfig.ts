// Configuração global do PostgreSQL (sem mocks)
export const usePostgreSQLConfig = () => {
  const isPostgreSQLMode = true;
  return {
    isPostgreSQLMode,
    apiBaseUrl:
      window.location.hostname === 'movemarias.squadsolucoes.com.br'
        ? 'http://movemarias.squadsolucoes.com.br/api'
        : 'http://localhost:3001/api',
  };
};
