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
        POSTGRES_HOST: 'localhost',
        POSTGRES_PORT: 5432,
        POSTGRES_DB: 'movemarias',
        POSTGRES_USER: 'movemarias',
        POSTGRES_PASSWORD: '15002031'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
      watch: false,
      ignore_watch: ['node_modules', 'logs'],
      max_memory_restart: '1G'
    }
  ]
};
