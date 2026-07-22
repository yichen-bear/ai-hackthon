# AI Hackathon

## 專案結構

```
ai-hackthon/
├── frontend/       # Nuxt 4 + Vue 3 前端
├── backend/        # Express + Prisma 後端
└── package.json    # 根目錄（用來同時啟動所有服務）
```

## 環境需求

- [Node.js](https://nodejs.org/) v18 以上
- npm（隨 Node.js 一起安裝）

## 取得專案

```bash
git clone <你的 repo URL>
cd ai-hackthon
```

## 啟動開發環境

回到根目錄，一行指令同時啟動所有服務：

```bash
npm run dev
```

這會同時啟動：

| 服務 | 說明 | 網址 |
|------|------|------|
| prisma | 本地 Prisma Postgres 資料庫 | localhost:51213 |
| backend | Express API server | http://localhost:3001 |
| frontend | Nuxt dev server | http://localhost:3000 |

終端會用顏色標籤區分各服務的輸出，按 `Ctrl+C` 可以一次全部停止。

## 也可以分開啟動

如果需要分別除錯，可以各開一個 terminal：

```bash
# Terminal 1 - 資料庫
cd backend
npx prisma dev

# Terminal 2 - 後端
cd backend
node index.js

# Terminal 3 - 前端
cd frontend
npm run dev
```

## 環境變數

- `backend/.env` — 資料庫連線字串（DATABASE_URL）
- `frontend/.env`（如果有的話）— 前端環境變數

> 注意：`.env` 檔案不會上傳到 git，組員需要自行建立。可以參考 `.env` 範例或跟其他組員拿。

## 常用指令

```bash
# Prisma 相關（在 backend/ 目錄下執行）
npx prisma migrate dev      # 建立 migration
npx prisma generate         # 產生 Prisma Client
npx prisma studio           # 開啟資料庫 GUI

# Frontend（在 frontend/ 目錄下執行）
npm run build               # 打包正式版
npm run preview             # 預覽打包結果
```
