#!/bin/bash
# =============================================================
# EC2 初始設定腳本（Amazon Linux 2023）
# 用法：ssh 進 EC2 後執行 bash ec2-setup.sh
# =============================================================

set -e

echo "===== 1. 更新系統 ====="
sudo dnf update -y

echo "===== 2. 安裝 Node.js 18 (via nvm) ====="
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install 18
nvm use 18
nvm alias default 18

echo "===== 3. 安裝 PM2 ====="
npm install -g pm2

echo "===== 4. 安裝 Nginx ====="
sudo dnf install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx

echo "===== 5. 安裝 Git ====="
sudo dnf install -y git

echo "===== 6. 安裝 Certbot (Let's Encrypt) ====="
sudo dnf install -y certbot python3-certbot-nginx

echo "===== 7. 安裝 PostgreSQL client (用於 pg_restore) ====="
sudo dnf install -y postgresql16

echo "===== 8. Clone 專案 ====="
cd ~
if [ ! -d "ai-hackthon" ]; then
  git clone https://github.com/yichen-bear/ai-hackthon.git
fi
cd ai-hackthon/backend

echo "===== 9. 安裝後端依賴 ====="
npm install

echo "===== 10. 產生 Prisma Client ====="
npx prisma generate

echo ""
echo "============================================"
echo "  EC2 基礎設定完成！"
echo "  接下來請手動完成："
echo "  1. 建立 backend/.env（參考 .env.example）"
echo "  2. 設定 Nginx（sudo nano /etc/nginx/conf.d/api.conf）"
echo "  3. 取得 SSL 憑證（sudo certbot --nginx）"
echo "  4. 啟動應用（pm2 start index.js --name api）"
echo "============================================"
