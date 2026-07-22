# Project Structure

```
ai-hackthon/
├── .kiro/                  # Kiro IDE configuration and steering
├── package.json            # Root orchestrator (concurrently scripts)
├── .env                    # Root env (DATABASE_URL for Prisma)
│
├── backend/                # Express + Prisma API server
│   ├── index.js            # App entry point (Express setup, port 3001)
│   ├── routes/             # Route handlers (modular routing)
│   │   └── index.js        # Route definitions
│   ├── prisma/
│   │   └── schema.prisma   # Database schema
│   ├── prisma.config.ts    # Prisma configuration
│   ├── generated/prisma/   # Auto-generated Prisma Client (gitignored)
│   ├── public/             # Static files served by backend
│   ├── package.json        # Backend dependencies
│   └── .env                # Backend environment variables
│
├── frontend/               # Nuxt 4 + Vue 3 SPA
│   ├── app/
│   │   └── app.vue         # Root Vue component
│   ├── nuxt.config.ts      # Nuxt configuration
│   ├── tsconfig.json        # TypeScript config
│   ├── public/             # Static assets
│   └── package.json        # Frontend dependencies
```

## Conventions
- Backend route handlers go in `backend/routes/`
- Database models are defined in `backend/prisma/schema.prisma`
- Frontend pages, components, and composables follow standard Nuxt directory conventions (`app/pages/`, `app/components/`, `app/composables/`)
- Each sub-project is independently installable (`npm install` within its directory)
