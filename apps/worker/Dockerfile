# syntax=docker/dockerfile:1.10
# Production Dockerfile for Worker service
# Optimized for Railway deployment - October 2025
# BuildKit multi-mount strategy eliminates 51s node_modules copy

ARG NODE_VERSION=22-alpine
ARG PNPM_VERSION=10.18.3

########################
# Stage 1: Builder
########################
FROM node:${NODE_VERSION} AS builder

WORKDIR /app

# Build tooling for native deps
RUN apk add --no-cache python3 make g++

# Enable corepack and pin pnpm version
ARG PNPM_VERSION
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

# Copy workspace metadata
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./
COPY nx.json tsconfig.base.json ./

# Install ALL dependencies using cache mount (NO node_modules copy!)
# pnpm's virtual store architecture makes this fast
RUN --mount=type=cache,id=s/40592a1b-0050-4394-8e85-9b7198afea3a-pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prefer-offline

# Copy source code
COPY libs ./libs
COPY apps/worker ./apps/worker

ENV NODE_ENV=production

# Build with NX cache mount (Railway format)
RUN --mount=type=cache,id=s/40592a1b-0050-4394-8e85-9b7198afea3a-nx,target=/app/.nx/cache \
    pnpm nx build worker --configuration=production

# Copy the worker's package.json to the dist folder
COPY apps/worker/package.json dist/apps/worker/

# Install production dependencies with cache mount (Railway format)
RUN --mount=type=cache,id=s/40592a1b-0050-4394-8e85-9b7198afea3a-pnpm-prod,target=/root/.local/share/pnpm/store \
    cd dist/apps/worker && pnpm install --production --no-frozen-lockfile --prefer-offline

# Stage 3: Runner (Debian-based for Playwright compatibility)
FROM node:22-slim AS runner

# Install dependencies for Puppeteer and Playwright with cache mount (Railway format)
RUN --mount=type=cache,id=s/40592a1b-0050-4394-8e85-9b7198afea3a-apt,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,id=s/40592a1b-0050-4394-8e85-9b7198afea3a-apt-lists,target=/var/lib/apt/lists,sharing=locked \
    apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
    wget \
    ca-certificates

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=false \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    NODE_ENV=production \
    SERVICE_NAME=worker \
    NODE_OPTIONS="--max-old-space-size=2048"

RUN groupadd -g 1001 nodejs && \
    useradd -r -u 1001 -g nodejs nodejs

WORKDIR /app

COPY --from=builder --chown=nodejs:nodejs /app/dist/apps/worker ./

# Install Playwright browsers with cache mount (reduces from ~1m to ~15s) (Railway format)
RUN --mount=type=cache,id=s/40592a1b-0050-4394-8e85-9b7198afea3a-playwright,target=/ms-playwright \
    npx playwright install chromium && \
    mkdir -p /tmp/pdf-generator /app/templates/pdf/examples /ms-playwright && \
    chown -R nodejs:nodejs /tmp/pdf-generator /app/templates /ms-playwright

USER nodejs

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "console.log('Worker healthy')" || exit 1

CMD ["node", "main.js"]