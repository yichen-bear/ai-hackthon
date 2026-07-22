# Tech Stack

## Frontend (`frontend/`)
- **Framework**: Nuxt 4 (v4.5+) with Vue 3
- **Language**: TypeScript (ESM, `"type": "module"`)
- **Router**: vue-router v5
- **Dev tools**: Nuxt DevTools enabled

## Backend (`backend/`)
- **Runtime**: Node.js v18+
- **Framework**: Express v5
- **Language**: JavaScript (CommonJS, `"type": "commonjs"`)
- **ORM**: Prisma v7 with `@prisma/client`
- **Database**: PostgreSQL (local Prisma Postgres via `prisma dev`)
- **Config**: `prisma.config.ts` loads env via `dotenv/config`
- **Generated client output**: `backend/generated/prisma`

## Root Monorepo
- Uses `concurrently` to run all services in parallel via `npm run dev`
- No workspace-level package manager workspaces — each sub-project manages its own `node_modules`

## Common Commands

```bash
# Start all services (from root)
npm run dev

# Backend — Prisma (from backend/)
npx prisma dev              # Start local Prisma Postgres
npx prisma migrate dev      # Create a migration
npx prisma generate         # Regenerate Prisma Client
npx prisma studio           # Open database GUI

# Frontend (from frontend/)
npm run dev                 # Start Nuxt dev server
npm run build               # Production build
npm run preview             # Preview production build
```

## Key Conventions
- Backend uses `require()` (CommonJS); do not use ES module syntax there
- Frontend uses ES modules and TypeScript
- Environment variables live in `.env` files at each sub-project root (not committed to git)
- Prisma schema is at `backend/prisma/schema.prisma`
