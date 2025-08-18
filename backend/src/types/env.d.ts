declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    PORT: string;
    FRONTEND_URL: string;
    REDIS_HOST: string;
    REDIS_PORT: string;
    REDIS_PASSWORD: string;
    [key: string]: string | undefined;
  }
}
