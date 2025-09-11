// Configuração global do PostgreSQL (sem mocks)
export const usePostgreSQLConfig = () => {
  const isPostgreSQLMode = true;
  const apiBaseUrl = (import.meta as any)?.env?.VITE_API_URL || '/api';
  return {
    isPostgreSQLMode,
    apiBaseUrl,
  };
};
