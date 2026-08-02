#!/bin/bash
# =============================================================
# 資料庫遷移腳本：Neon PostgreSQL → RDS PostgreSQL
# 在本機或 EC2 上執行（需安裝 pg_dump 和 pg_restore）
# =============================================================

set -e

# ─── 設定來源（Neon） ───
# 填入你的 Neon 連線字串（包含密碼）
NEON_URL="postgresql://user:password@your-neon-endpoint/dbname?sslmode=require"

# ─── 設定目標（RDS）── 請填入 RDS 建立後的資訊 ───
RDS_HOST="你的rds-endpoint.us-west-2.rds.amazonaws.com"
RDS_PORT="5432"
RDS_USER="postgres"
RDS_DB="aihackthon"
# RDS_PASSWORD 會透過 PGPASSWORD 環境變數傳入

DUMP_FILE="neon-backup-$(date +%Y%m%d-%H%M%S).dump"

echo "===== Step 1: 從 Neon 匯出資料 ====="
echo "匯出至: $DUMP_FILE"
pg_dump "$NEON_URL" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --verbose \
  -f "$DUMP_FILE"

echo ""
echo "===== Step 2: 匯入至 RDS ====="
echo "目標: $RDS_HOST:$RDS_PORT/$RDS_DB"
echo ""
echo "請輸入 RDS master password:"
read -s RDS_PASSWORD
export PGPASSWORD="$RDS_PASSWORD"

# 先確保 uuid-ossp extension 存在
psql -h "$RDS_HOST" -p "$RDS_PORT" -U "$RDS_USER" -d "$RDS_DB" -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'

# 匯入資料
pg_restore \
  --host="$RDS_HOST" \
  --port="$RDS_PORT" \
  --username="$RDS_USER" \
  --dbname="$RDS_DB" \
  --no-owner \
  --no-privileges \
  --format=custom \
  --verbose \
  "$DUMP_FILE"

unset PGPASSWORD

echo ""
echo "============================================"
echo "  ✅ 資料遷移完成！"
echo "  備份檔案: $DUMP_FILE"
echo ""
echo "  驗證資料："
echo "  psql -h $RDS_HOST -U $RDS_USER -d $RDS_DB"
echo "  > SELECT count(*) FROM _prisma_migrations;"
echo "============================================"
