#!/bin/bash
# =============================================================
# 快速部署腳本（在 EC2 上執行，用於更新程式碼）
# 用法：bash deploy.sh [branch]
# =============================================================

set -e

BRANCH=${1:-main}
APP_DIR="/home/ec2-user/ai-hackthon"

echo "===== 拉取最新程式碼 ($BRANCH) ====="
cd $APP_DIR
git fetch origin
git checkout $BRANCH
git pull origin $BRANCH

echo "===== 安裝後端依賴 ====="
cd $APP_DIR/backend
npm install --production

echo "===== 重新產生 Prisma Client ====="
npx prisma generate

echo "===== 執行資料庫遷移 ====="
npx prisma migrate deploy

echo "===== 重啟 PM2 ====="
pm2 restart api

echo ""
echo "✅ 部署完成！"
echo "   確認狀態：pm2 status"
echo "   查看日誌：pm2 logs api"
