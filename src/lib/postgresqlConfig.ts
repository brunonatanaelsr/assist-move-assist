// Configuração global do PostgreSQL (sem mocks)
import { API_URL } from '@/config';

export const usePostgreSQLConfig = () => {
  const isPostgreSQLMode = true;
  const apiBaseUrl = API_URL;
  return {
    isPostgreSQLMode,
    apiBaseUrl,
  };
};
