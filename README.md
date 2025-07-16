# VisAPI - Enterprise Workflow Automation Platform

[![Version](https://img.shields.io/badge/version-v1.0.0-success)](https://github.com/VadimVDM/VisAPI/releases)
[![Status](https://img.shields.io/badge/status-production--ready-brightgreen)](https://api.visanet.app/api/v1/healthz)
[![License](https://img.shields.io/badge/license-proprietary-blue)](LICENSE)

Production-ready enterprise workflow automation system for Visanet, delivering automated visa processing, multi-channel notifications, document generation, and comprehensive monitoring.

**Version 1.0.0** - All features complete with enterprise-grade infrastructure, security, and operational excellence.

## 🚀 Production

- **Frontend**: https://app.visanet.app (Next.js on Vercel)
- **Backend API**: https://api.visanet.app (NestJS on Render)
- **API Health**: https://api.visanet.app/api/v1/healthz
- **Version**: v1.0.0 (Released July 17, 2025)
- **Status**: Production-ready with 99.9% uptime target
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
pnpm test             # Run tests (16 suites, 100% passing)
pnpm lint             # Lint code (ESLint + TypeScript)
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
- **Container Security**: Distroless images with non-root execution
- **Vulnerability Scanning**: Automated security checks in CI/CD pipeline
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
- **Infrastructure**: Vercel, Render, Docker, Terraform IaC
- **Integrations**: WhatsApp (CGB API), PDF generation (Puppeteer), Slack notifications, Resend email
- **Monitoring**: Grafana Cloud dashboards, Prometheus metrics, Bull-Board queue UI, structured logging
- **CI/CD**: GitHub Actions with automated testing and security scanning

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

## 📊 Project Status

**Production Ready - All Sprints Complete**

VisAPI is a mature, enterprise-grade platform. All major development sprints are complete, delivering a feature-rich, secure, and scalable system.

- **Sprint 0: Foundation** ✅ **COMPLETED**
- **Sprint 1: Core Engine & Gateway** ✅ **COMPLETED**
- **Sprint 2: Frontend Integration & Testing** ✅ **COMPLETED**
- **Sprint 2.5: Architecture & Security Overhaul** ✅ **COMPLETED**
- **Sprint 3: Advanced Workflow Features** ✅ **COMPLETED**
- **Sprint 4: Hardening & Launch** ✅ **COMPLETED** (July 17, 2025)

### Production Features
- **🚀 Performance**: Validated for 5,000 requests/minute with <200ms P95 latency
- **🔒 Security**: Container hardening, threat modeling, and continuous vulnerability scanning
- **📊 Monitoring**: Enterprise Grafana Cloud integration with real-time dashboards
- **♿ Accessibility**: >90% Lighthouse score with WCAG 2.1 AA compliance
- **🛡️ Reliability**: Chaos engineering tested with comprehensive runbooks
- **📈 Scalability**: Auto-scaling infrastructure with Terraform automation

## 📚 Documentation & Resources

### Project Documentation
- **Setup Guide**: [README.md](README.md) - This file
- **Project Guide**: [CLAUDE.md](CLAUDE.md) - Complete project overview for AI assistants
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

**Version**: 1.0.0 | **Released**: July 17, 2025 | **Status**: Production Ready