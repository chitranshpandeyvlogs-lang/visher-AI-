module.exports = {
  apps: [
    {
      name: 'visher-server',
      script: './server.ts',
      interpreter: 'tsx',
      instances: 'max',
      exec_mode: 'cluster',
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        REDIS_URL: 'redis://localhost:6379',
        QUEUE_CONCURRENCY: '10',
        PORT: 3000,
        DISABLE_CLUSTERING: 'false'
      },
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      watch: false,
      ignore_watch: ['node_modules', 'dist', '.git'],
      max_restarts: 10,
      min_uptime: '10s',
      autorestart: true,
      shutdown_with_message: true,
      kill_timeout: 30000,
    }
  ]
};
