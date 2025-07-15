# VisAPI - Workflow Automation Platform

Enterprise workflow automation system automating visa processing, notifications, and document generation for Visanet.

## 🚀 Production

- **Frontend**: https://app.visanet.app (Next.js on Vercel)
- **Backend API**: https://api.visanet.app (NestJS on Render)
- **API Health**: https://api.visanet.app/api/v1/healthz

## 🛠️ Local Development

### Prerequisites
- Node.js 18+ 
- pnpm 10+
- Docker & Docker Compose

### Quick Start
```bash
# Clone and setup
git clone https://github.com/VadimVDM/VisAPI.git
cd VisAPI
pnpm setup

# Start development
pnpm dev
```

**Local URLs:**
- Frontend: http://localhost:3001
- Backend: http://localhost:3000/api
- PostgreSQL: localhost:5432
- Redis: localhost:6379

## 📁 Project Structure

```
VisAPI/
├── apps/
│   ├── frontend/      # Next.js 14 (Vercel)
│   ├── backend/       # NestJS API (Render)
│   └── worker/        # BullMQ worker processes
├── libs/              # Shared libraries
│   ├── backend/       # Backend shared libs
│   ├── frontend/      # Frontend shared libs
│   └── shared/        # Universal utilities & types
├── docs/              # Documentation
└── tasks/             # Sprint planning
```

## 🔧 Development Commands

```bash
pnpm dev              # Start all services
pnpm build            # Build all apps
pnpm test             # Run tests
pnpm lint             # Lint code
pnpm docker:up        # Start local DB/Redis
pnpm docker:down      # Stop services
```

## 🏗️ Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: NestJS, TypeScript, BullMQ
- **Database**: Supabase (PostgreSQL)
- **Cache/Queue**: Upstash Redis
- **Infrastructure**: Vercel, Render, Docker

## 🔐 Environment Setup

Copy `.env.example` to `.env.local` and update values:

```bash
# Frontend (required)
NEXT_PUBLIC_API_URL=http://localhost:3000  # https://api.visanet.app in prod
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Backend (required)
DATABASE_URL=your_supabase_connection_string
REDIS_URL=your_upstash_redis_url
JWT_SECRET=your_generated_secret
CORS_ORIGIN=http://localhost:3001,https://app.visanet.app
```

## 🚢 Deployment

### Frontend (Vercel)
- Domain: app.visanet.app
- Auto-deploys from `main` branch
- Environment variables set in Vercel dashboard

### Backend (Render)
- Domain: api.visanet.app
- Auto-deploys from `main` branch
- Health check: `/api/v1/healthz`

## 📊 Current Status

**Sprint 0: Foundation** ✅ Complete
- Production deployments live
- Health monitoring active
- Custom domains configured

**Sprint 1: Core Engine** ✅ Complete
- Supabase authentication
- API key management
- Job queue system

**Sprint 2: Admin Dashboard** ✅ Complete
- Magic link authentication
- Frontend admin interface
- Bull-Board monitoring

**Sprint 2.5: Architecture Overhaul** ✅ Complete
- Shared libraries structure with 7 specialized libraries
- Zero app-to-app imports enforced
- Critical security vulnerabilities patched
- Frontend integrated with live data

**Next: Sprint 3**
- Advanced workflow features
- Enhanced logging & monitoring
- Cron scheduling system