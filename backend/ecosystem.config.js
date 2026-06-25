/**
 * PM2 集群模式配置
 * 启动: pm2 start ecosystem.config.js
 * 重载: pm2 reload ecosystem.config.js  (零停机)
 */
module.exports = {
  apps: [
    {
      name: 'yeshu-api',
      script: './dist/main.js',
      instances: 2,          // 两个工作进程，充分利用多核
      exec_mode: 'cluster',
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // 日志
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
