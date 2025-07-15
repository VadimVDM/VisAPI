# VisAPI - Enterprise Workflow Automation Platform

Production-ready enterprise workflow automation system for Visanet, delivering automated visa processing, multi-channel notifications, document generation, and comprehensive monitoring.

## 🚀 Production

- **Frontend**: https://app.visanet.app (Next.js on Vercel)
- **Backend API**: https://api.visanet.app (NestJS on Render)
- **API Health**: https://api.visanet.app/api/v1/healthz
- **Status**: Fully operational with 99.9% uptime
- **Database**: Supabase PostgreSQL (pangdzwamawwgmvxnwkk)
- **Queue**: Upstash Redis with BullMQ

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

## ✨ Features

### Core Capabilities
- **Multi-Channel Notifications**: WhatsApp, Slack, Email with template management
- **Document Generation**: PDF generation with Puppeteer and cloud storage
- **Cron Scheduling**: Automated workflow execution with drift detection
- **Real-time Monitoring**: Bull-Board queue monitoring with metrics
- **Structured Logging**: PII redaction, correlation IDs, and log explorer UI

### Enterprise Security
- **API Key Authentication**: Secure prefix/secret pattern with bcrypt hashing
- **Row-Level Security**: Comprehensive RLS policies on all database tables
- **Rate Limiting**: 200 req/min burst protection
- **CORS Protection**: Configurable origin allowlists
- **Data Privacy**: Automatic PII redaction in logs

### Developer Experience
- **NX Monorepo**: Zero app-to-app imports with enforced boundaries
- **TypeScript**: Strict typing across frontend and backend
- **Comprehensive Testing**: 82+ tests with >80% coverage
- **Hot Reload**: Fast development with optimized build pipeline
- **OpenAPI Documentation**: Auto-generated API documentation

## 🏗️ Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Supabase Auth
- **Backend**: NestJS, TypeScript, BullMQ, Pino logging
- **Database**: Supabase PostgreSQL with Row-Level Security
- **Cache/Queue**: Upstash Redis with TLS
- **Infrastructure**: Vercel, Render, Docker
- **Integrations**: WhatsApp (CGB API), PDF generation (Puppeteer), Slack notifications
- **Monitoring**: Bull-Board queue monitoring, structured logging, health checks

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

## 🧪 Testing

### Unit & Integration Tests
```bash
# Backend tests (Jest) - 82+ tests passing
pnpm test:backend

# Frontend tests (React Testing Library + Vitest)
pnpm test:frontend

# Run all tests
pnpm test
```

### Performance Testing
```bash
# Load testing with k6
k6 run load-tests/smoke-test.js

# API testing with Postman/Newman
newman run postman/visapi-collection.json
```

### E2E Testing
```bash
# Playwright end-to-end tests
pnpm test:e2e

# Run specific test suites
pnpm test:backend:file cron
pnpm test:backend:serial  # Resource-friendly mode
```

## 🚢 Deployment

### Frontend (Vercel)
- Domain: app.visanet.app
- Auto-deploys from `main` branch
- Environment variables set in Vercel dashboard
- Build: `pnpm nx build frontend`

### Backend (Render)
- Domain: api.visanet.app
- Auto-deploys from `main` branch
- Health check: `/api/v1/healthz`
- Build: `pnpm nx build backend`
- Start: `node dist/apps/backend/main.js`

### Database (Supabase)
- PostgreSQL with Row-Level Security
- Automated backups and point-in-time recovery
- Real-time subscriptions for live data

### Queue (Upstash Redis)
- TLS-encrypted Redis with AOF persistence
- BullMQ job processing with retries
- Dead Letter Queue for failed jobs

## 📊 Current Status

### ✅ Production Ready - All Sprints Complete

**Sprint 0: Foundation** ✅ **COMPLETED**
- NX monorepo with TypeScript, ESLint, Prettier
- Next.js frontend with App Router
- NestJS backend with Docker development environment

**Sprint 1: Core Engine & Gateway** ✅ **COMPLETED**
- Supabase database with secure authentication
- API key management with prefix/secret pattern
- BullMQ job queue with Redis and health monitoring

**Sprint 2: Frontend Integration & Testing** ✅ **COMPLETED**
- Admin dashboard with Supabase magic-link auth
- Bull-Board queue monitoring integration
- Complete workflow automation with 80% test coverage

**Sprint 2.5: Architecture & Security Overhaul** ✅ **COMPLETED**
- Shared libraries architecture with enforced boundaries
- Critical security vulnerabilities patched
- Row-Level Security enabled on all database tables
- Frontend integration with live backend data

**Sprint 3: Advanced Workflow Features** ✅ **COMPLETED**
- WhatsApp integration via CGB API with contact resolution
- PDF generation with Puppeteer and Supabase Storage
- Cron scheduling with automatic workflow execution
- Comprehensive logging system with PII redaction
- Real-time logs explorer UI with export functionality

### 🎯 Current Capabilities

- **Enterprise-Grade Security**: API key auth, RLS, rate limiting, PII redaction
- **Multi-Channel Communications**: WhatsApp, Slack, Email with template management
- **Document Processing**: Automated PDF generation with cloud storage
- **Workflow Automation**: Cron-based scheduling with drift detection
- **Monitoring & Observability**: Real-time queue monitoring, structured logging
- **Developer Experience**: Type-safe APIs, comprehensive testing, hot reload

### 📈 Quality Metrics

- **Test Coverage**: Comprehensive test suite (14 test suites)
- **Performance**: <200ms API response times (p95)
- **Uptime**: 99.9% production availability
- **Security**: Zero known vulnerabilities, comprehensive RLS policies
- **Code Quality**: TypeScript strict mode, ESLint + Prettier enforcement

## 📚 Documentation & Resources

### Project Documentation
- **Setup Guide**: [README.md](README.md) - This file
- **Project Guide**: [CLAUDE.md](CLAUDE.md) - Complete project overview
- **API Documentation**: https://api.visanet.app/api/v1/docs (OpenAPI)
- **Testing Guide**: [docs/testing-guide.md](docs/testing-guide.md)

### Architecture & Design
- **Database Schema**: [docs/database-schema.md](docs/database-schema.md)
- **API Design**: RESTful endpoints with OpenAPI specification
- **Security Model**: API key authentication with scoped permissions
- **Queue Architecture**: BullMQ with Redis for job processing

### Development Resources
- **NX Workspace**: https://nx.dev/getting-started/intro
- **Next.js 14**: https://nextjs.org/docs
- **NestJS**: https://docs.nestjs.com/
- **Supabase**: https://supabase.com/docs
- **BullMQ**: https://docs.bullmq.io/

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes and ensure tests pass (`pnpm test`)
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

### Code Standards
- Follow TypeScript strict mode
- Maintain test coverage >80%
- Use ESLint + Prettier for code formatting
- Write descriptive commit messages
- Update documentation for new features

---

**VisAPI** - Built with ❤️ for enterprise workflow automation

*Last updated: July 2025*