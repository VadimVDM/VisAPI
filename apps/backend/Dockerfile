# syntax=docker/dockerfile:1.7
# Optimized NestJS backend for Railway deployment - December 2024

ARG NODE_VERSION=22-alpine
ARG PNPM_VERSION=latest

########################
# Stage 1: Dependencies
########################
FROM node:${NODE_VERSION} AS deps
WORKDIR /app

# Build tooling for native deps (bcrypt, etc)
RUN apk add --no-cache python3 make g++ libc6-compat

# Enable corepack
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY nx.json tsconfig.base.json ./

# Install dependencies (rely on Docker layer caching)
RUN pnpm install --frozen-lockfile

########################
# Stage 2: Builder
########################
FROM node:${NODE_VERSION} AS builder
WORKDIR /app

# Minimal deps for build
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

# Copy dependencies from previous stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json /app/pnpm-lock.yaml ./
COPY nx.json tsconfig.base.json ./

# Copy source code
COPY apps/backend ./apps/backend
COPY libs ./libs
COPY migrations ./migrations

# Build with production optimizations (remove --skip-nx-cache for faster builds with Nx Cloud)
ENV NODE_ENV=production
RUN pnpm nx build backend

########################
# Stage 3: Production deps
########################
FROM node:${NODE_VERSION} AS prod-deps
WORKDIR /app

# Need libc6-compat for bcrypt and other native deps, jq for JSON manipulation
RUN apk add --no-cache libc6-compat jq
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

# Copy generated package.json from build
COPY --from=builder /app/dist/apps/backend/package.json ./

# Add missing dependencies that webpack doesn't detect
RUN jq '.dependencies.tslib = "^2.8.1" | \
        .dependencies."@supabase/supabase-js" = "^2.55.0" | \
        .dependencies."@nestjs/websockets" = "^11.1.6" | \
        .dependencies."@nestjs/microservices" = "^11.1.6" | \
        .dependencies."@fastify/view" = "^10.0.2" | \
        .dependencies."class-transformer" = "^0.5.1"' \
    < package.json > package.json.tmp && \
    mv package.json.tmp package.json

# Install production deps (no lockfile as it's generated package.json)
RUN pnpm install --prod --ignore-scripts

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
RUN pip3 install --no-cache-dir pyairtable==3.2.0 --break-system-packages

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