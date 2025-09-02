// Ambiente de desenvolvimento
const DEV_CONFIG = {
  API_URL: '/api',
  AUTH_TOKEN_KEY: 'auth_token',
  USER_KEY: 'user',
};

// Ambiente de produção
const PROD_CONFIG = {
  API_URL: 'https://api.movemarias.com.br/api',
  AUTH_TOKEN_KEY: 'auth_token',
  USER_KEY: 'user',
};

// Ambiente de teste
const TEST_CONFIG = {
  API_URL: 'http://localhost:3000/api',
  AUTH_TOKEN_KEY: 'test_auth_token',
  USER_KEY: 'test_user',
};

const ENV = import.meta.env.MODE || 'development';

const CONFIG = {
  development: DEV_CONFIG,
  production: PROD_CONFIG,
  test: TEST_CONFIG,
}[ENV];

if (!CONFIG) {
  throw new Error(`Ambiente inválido: ${ENV}`);
}

export const {
  API_URL,
  AUTH_TOKEN_KEY,
  USER_KEY,
} = CONFIG;
