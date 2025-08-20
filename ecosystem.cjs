module.exports = {
  apps: [
    {
      name: 'move-marias-backend',
      script: 'backend/server.js',
      instances: 1,
      exec_mode: 'cluster',
      watch: true,
      ignore_watch: ['node_modules', 'logs', 'uploads'],
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        POSTGRES_HOST: 'localhost',
        POSTGRES_PORT: 5432,
        POSTGRES_DB: 'movemarias',
        POSTGRES_USER: 'postgres',
        POSTGRES_PASSWORD: '15002031',
        JWT_SECRET: 'move@marias#jwt$2025',
        JWT_EXPIRES_IN: '7d',
        JWT_COOKIE_EXPIRES_IN: 7,
        CORS_ORIGIN: 'http://localhost:3000'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: 'logs/backend-error.log',
      out_file: 'logs/backend-out.log',
      log_file: 'logs/backend-combined.log',
      time: true,
      merge_logs: true,
      max_memory_restart: '1G'
    },
    {
      name: 'move-marias-frontend',
      script: 'npm',
      args: 'run dev',
      cwd: './frontend',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'development',
        PORT: 3001
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: 'logs/frontend-error.log',
      out_file: 'logs/frontend-out.log',
      log_file: 'logs/frontend-combined.log',
      time: true,
      merge_logs: true,
      max_memory_restart: '1G'
    }
  ],
  
  deploy: {
    production: {
      user: 'ubuntu',
      host: 'seu-servidor-producao',
      ref: 'origin/main',
      repo: 'git@github.com:brunonatanaelsr/assist-move-assist.git',
      path: '/var/www/move-marias',
      'post-deploy': 'cd backend && npm install && pm2 reload ecosystem.cjs --env production'
    },
    staging: {
      user: 'ubuntu',
      host: 'seu-servidor-staging',
      ref: 'origin/staging',
      repo: 'git@github.com:brunonatanaelsr/assist-move-assist.git',
      path: '/var/www/move-marias-staging',
      'post-deploy': 'cd backend && npm install && pm2 reload ecosystem.cjs --env staging'
    }
  }
};
