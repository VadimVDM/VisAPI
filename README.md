# VisAPI - Workflow Automation Platform

Internal workflow automation engine for Visanet that serves as the central nervous system for operational tasks.

## Quick Start

1. **Prerequisites**
   - Node.js 18+
   - pnpm
   - Docker & Docker Compose

2. **Setup**
   ```bash
   pnpm setup
   ```

3. **Start Development**
   ```bash
   pnpm dev
   ```

   This will start:
   - Frontend: http://localhost:3000
   - Backend: http://localhost:3001
   - Database: PostgreSQL on port 5432
   - Redis: Redis on port 6379
   - Adminer: http://localhost:8080 (DB management)
   - Redis Commander: http://localhost:8081 (Redis management)

## Architecture

```
VisAPI/
├── apps/
│   ├── frontend/          # Next.js 14 admin dashboard
│   └── backend/           # NestJS API gateway
├── packages/
│   ├── shared/            # Shared utilities and types
│   └── config/            # Shared configuration
└── infrastructure/        # Docker & deployment configs
```

## Development Scripts

- `pnpm dev` - Start all services in development mode
- `pnpm dev:frontend` - Start only frontend
- `pnpm dev:backend` - Start only backend
- `pnpm build` - Build all applications
- `pnpm test` - Run all tests
- `pnpm lint` - Lint all code
- `pnpm format` - Format all code

## Docker Services

- `pnpm docker:up` - Start PostgreSQL & Redis
- `pnpm docker:down` - Stop all services
- `pnpm docker:logs` - View logs

## Database Access

- **Adminer**: http://localhost:8080
  - Server: `postgres`
  - Username: `postgres`
  - Password: `postgres`
  - Database: `visapi_dev`

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: NestJS, TypeScript, PostgreSQL, Redis
- **Development**: NX Monorepo, Docker, ESLint, Prettier
- **Testing**: Jest, Playwright
- **Deployment**: Vercel (Frontend), Render (Backend), Supabase (Database)

## Project Structure

This is an NX monorepo with the following structure:

- `apps/frontend` - Next.js admin dashboard
- `apps/backend` - NestJS API gateway
- `packages/shared` - Shared utilities and types
- `packages/config` - Shared configuration

## Environment Variables

Create `.env.local` files in each app directory:

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Backend (.env.local)
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/visapi_dev
REDIS_URL=redis://localhost:6379
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests: `pnpm test`
4. Run linting: `pnpm lint`
5. Create a pull request

## Sprint 0 Status

- ✅ NX monorepo structure established
- ✅ Next.js 14 frontend with App Router
- ✅ NestJS backend with TypeScript
- ✅ Docker development environment
- ✅ ESLint and Prettier configuration
- ✅ Development scripts and documentation