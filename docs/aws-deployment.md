# AWS 部署架構（us-west-2）

## 架構概覽

```
┌─────────────┐         ┌─────────────────────┐         ┌─────────────┐
│   Amplify   │  HTTPS  │    EC2 (t3.small)   │  TCP    │  RDS        │
│  (Frontend) │ ──────> │  + Nginx + Node.js  │ ──────> │  PostgreSQL │
│  Nuxt SSG   │         │  Express :3001      │  5432   │  db.t3.micro│
└─────────────┘         └─────────────────────┘         └─────────────┘
                               │
                        Elastic IP + 
                        Let's Encrypt SSL
                        (or ALB + ACM)
```

## 元件規格

| 元件 | 服務 | 規格 | Region |
|------|------|------|--------|
| Frontend | AWS Amplify | 已部署 | us-west-2 |
| Backend | EC2 | t3.small (2 vCPU, 2GB RAM) | us-west-2 |
| Database | RDS PostgreSQL | db.t3.micro (2 vCPU, 1GB RAM) | us-west-2 |
| HTTPS | Nginx + Let's Encrypt | 免費 SSL | EC2 上 |

## 網路架構

- VPC: 使用 default VPC（簡化 hackathon 設定）
- EC2 Security Group: 允許 80, 443 (HTTP/HTTPS), 22 (SSH)
- RDS Security Group: 只允許 EC2 Security Group 的 5432 inbound

## 部署步驟

### 1. 建立 RDS PostgreSQL
- Engine: PostgreSQL 16
- Instance: db.t3.micro
- Storage: 20 GB gp3
- Public access: No（只允許同 VPC 的 EC2 連）
- DB name: `aihackthon`
- Master user: `postgres`

### 2. 建立 EC2
- AMI: Amazon Linux 2023
- Instance: t3.small
- Elastic IP: 配一個固定 IP
- Key pair: 建立新的或使用既有的
- Security Group: 開 22/80/443

### 3. EC2 上的軟體
- Node.js 18+（via nvm）
- Nginx（反向代理 + SSL termination）
- PM2（Node.js process manager）
- Certbot（Let's Encrypt SSL）

### 4. 資料遷移
```bash
# 本機執行
pg_dump "postgresql://neondb_owner:密碼@neon-endpoint/neondb?sslmode=require" \
  --format=custom --no-owner -f backup.dump

# 上傳到 EC2 後
pg_restore --host=RDS_ENDPOINT --port=5432 \
  --username=postgres --dbname=aihackthon \
  --no-owner --format=custom backup.dump
```

### 5. 更新環境變數
- Backend `.env`: DATABASE_URL 改指向 RDS
- Frontend `.env`: NUXT_PUBLIC_API_BASE 改指向 EC2 domain

## 所需 domain（建議）

如果沒有自己的 domain，可以先用 EC2 Elastic IP 搭配 nip.io：
例如 `https://52.10.xxx.xxx.nip.io`（Let's Encrypt 支援）

或者直接用 ALB + ACM 免費憑證（但需要自己的 domain）。
