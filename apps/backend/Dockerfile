# syntax=docker/dockerfile:1.10
# Optimized NestJS backend for Railway deployment - October 2025
# BuildKit multi-mount strategy eliminates 2.5min node_modules copy

ARG NODE_VERSION=22-alpine
ARG PNPM_VERSION=10.18.3

########################
# Stage 1: Pruned Workspace
########################
FROM node:${NODE_VERSION} AS pruner
WORKDIR /app

# Enable corepack and pin pnpm version
ARG PNPM_VERSION
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

# Copy workspace metadata only
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./
COPY nx.json tsconfig.base.json ./

# Fetch dependencies to cache WITHOUT installing (fast metadata operation)
RUN --mount=type=cache,id=s/576692d1-8171-425f-a8fd-bd5e987e045d-pnpm,target=/root/.local/share/pnpm/store \
    pnpm fetch --frozen-lockfile

########################
# Stage 2: Builder
########################
FROM node:${NODE_VERSION} AS builder
WORKDIR /app

# Build tooling for native deps (bcrypt, etc)
RUN apk add --no-cache python3 make g++ libc6-compat

# Enable corepack and pin pnpm version
ARG PNPM_VERSION
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./
COPY nx.json tsconfig.base.json ./

# Install ALL dependencies using cache mount (NO node_modules copy!)
# pnpm's virtual store architecture makes this fast
RUN --mount=type=cache,id=s/576692d1-8171-425f-a8fd-bd5e987e045d-pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prefer-offline

# Copy source code
COPY apps/backend ./apps/backend
COPY libs ./libs
COPY migrations ./migrations

# Build with production optimizations using NX cache mount (Railway format)
# This reduces rebuild time from 1m 3s to ~15s when source unchanged
ENV NODE_ENV=production
RUN --mount=type=cache,id=s/576692d1-8171-425f-a8fd-bd5e987e045d-nx,target=/app/.nx/cache \
    pnpm nx build backend

########################
# Stage 3: Production deps
########################
FROM node:${NODE_VERSION} AS prod-deps
WORKDIR /app

# Need libc6-compat for bcrypt and other native deps
RUN apk add --no-cache libc6-compat

# Enable corepack and pin pnpm version
ARG PNPM_VERSION
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

# Copy generated package.json from webpack build
COPY --from=builder /app/dist/apps/backend/package.json ./package.json

# Manually add missing dependencies that webpack's externalDependencies doesn't detect
# This is faster than jq and works with Node.js built-ins
RUN node -e " \
    const pkg = require('./package.json'); \
    pkg.dependencies = pkg.dependencies || {}; \
    Object.assign(pkg.dependencies, { \
      'tslib': '^2.8.1', \
      '@supabase/supabase-js': '^2.76.1', \
      '@nestjs/websockets': '^11.1.6', \
      '@nestjs/microservices': '^11.1.6', \
      '@fastify/view': '^10.0.2', \
      'class-transformer': '^0.5.1' \
    }); \
    require('fs').writeFileSync('./package.json', JSON.stringify(pkg, null, 2)); \
  "

# Install production dependencies using cache mount (Railway format)
# Using --prefer-offline to use cached packages from builder stage
RUN --mount=type=cache,id=s/576692d1-8171-425f-a8fd-bd5e987e045d-pnpm-prod,target=/root/.local/share/pnpm/store \
    pnpm install --prod --no-optional --ignore-scripts --prefer-offline

########################
# Stage 4: Runner
########################
FROM node:${NODE_VERSION} AS runner

# tini for signal handling, libc6-compat for native deps, python3 and pip for Airtable script
RUN apk add --no-cache tini libc6-compat python3 py3-pip

# Non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy built application
COPY --from=builder --chown=1001:1001 /app/dist/apps/backend/main.js ./
COPY --from=builder --chown=1001:1001 /app/dist/apps/backend/assets ./assets
COPY --from=builder --chown=1001:1001 /app/dist/apps/backend/airtable ./airtable
COPY --from=builder --chown=1001:1001 /app/migrations ./migrations

# Copy production node_modules (needed for native deps like bcrypt)
COPY --from=prod-deps --chown=1001:1001 /app/node_modules ./node_modules

# Install Python dependencies for Airtable integration
RUN pip3 install --no-cache-dir pyairtable==3.2.0 requests --break-system-packages

# Metadata
ARG GIT_COMMIT=unknown
ARG BUILD_DATE=unknown
LABEL org.opencontainers.image.source="https://github.com/visanet/visapi" \
      org.opencontainers.image.revision="${GIT_COMMIT}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.title="VisAPI Backend" \
      org.opencontainers.image.description="Enterprise workflow automation for Visanet"

# Production settings (reduced source maps overhead)
ENV NODE_ENV=production \
    PORT=3000 \
    NODE_OPTIONS="--max-old-space-size=512"

USER nodejs
EXPOSE 3000

# Health check (quiet output)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -q -O - http://127.0.0.1:3000/api/v1/healthz >/dev/null || exit 1

# Proper signal handling with tini
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "main.js"]