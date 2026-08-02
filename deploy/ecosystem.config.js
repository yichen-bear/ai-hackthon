// PM2 設定檔
// 用法：pm2 start ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'api',
      cwd: '/home/ec2-user/ai-hackthon/backend',
      script: 'index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
    },
  ],
}
