module.exports = {
  apps: [
    {
      name: 'assist-move-backend',
      script: './backend/server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        CORS_ORIGIN: 'http://localhost:8080',
        POSTGRES_HOST: 'localhost',
        POSTGRES_PORT: 5432,
        POSTGRES_DB: 'movemarias',
        POSTGRES_USER: 'postgres',
        POSTGRES_PASSWORD: '15002031',
        JWT_SECRET: 'movemarias_jwt_secret_key_2025_production',
        JWT_REFRESH_SECRET: 'movemarias_jwt_refresh_secret_key_2025_production',
        JWT_EXPIRY: '24h'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log',
      time: true,
      watch: false,
      ignore_watch: ['node_modules', 'logs'],
      max_memory_restart: '1G'
    },
    {
      name: 'assist-move-frontend',
      script: 'npm',
      args: 'run dev',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 8080,
        VITE_API_URL: 'http://localhost:3000'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 8080
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_file: './logs/frontend-combined.log',
      time: true,
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'dist'],
      max_memory_restart: '1G'
    }
  ]
};
