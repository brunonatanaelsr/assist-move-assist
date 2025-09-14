// Ambiente e variáveis de build
const ENV = (import.meta as any)?.env?.MODE || 'development';

// Chaves padrão
const AUTH_TOKEN_KEY = ENV === 'test' ? 'test_auth_token' : 'auth_token';
const USER_KEY = ENV === 'test' ? 'test_user' : 'user';

// URL da API: prioriza envs de build; tem fallback por ambiente
const API_URL =
  (import.meta as any)?.env?.VITE_API_BASE_URL ||
  (import.meta as any)?.env?.VITE_API_URL ||
  (ENV === 'development' ? '/api' : 'http://localhost:3000/api');

export { API_URL, AUTH_TOKEN_KEY, USER_KEY };
