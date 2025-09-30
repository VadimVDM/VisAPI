# Production Dockerfile for Worker service
# Optimized for Railway deployment

# Stage 1: Dependencies
FROM node:22-alpine AS deps

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json pnpm-lock.yaml nx.json tsconfig.base.json ./

RUN corepack enable && corepack prepare pnpm@10.15.1 --activate
RUN pnpm install --frozen-lockfile --prefer-offline

# Stage 2: Builder
FROM node:22-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./
COPY --from=deps /app/pnpm-lock.yaml ./

COPY nx.json tsconfig.base.json ./
COPY libs ./libs
COPY apps/worker ./apps/worker

RUN corepack enable && corepack prepare pnpm@10.15.1 --activate

ENV NODE_ENV=production
RUN pnpm nx build worker --configuration=production

# Copy the worker's package.json to the dist folder
COPY apps/worker/package.json dist/apps/worker/

# Install production dependencies (no lockfile in dist, so can't use frozen-lockfile)
RUN cd dist/apps/worker && pnpm install --production --no-frozen-lockfile

# Stage 3: Runner (Debian-based for Playwright compatibility)
FROM node:22-slim AS runner

# Install dependencies for Puppeteer and Playwright
RUN apt-get update && apt-get install -y \
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
  ca-certificates \
  && rm -rf /var/lib/apt/lists/*

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

# Install Playwright browsers before switching to nodejs user
RUN npx playwright install chromium

RUN mkdir -p /tmp/pdf-generator /app/templates/pdf/examples /ms-playwright && \
    chown -R nodejs:nodejs /tmp/pdf-generator /app/templates /ms-playwright

USER nodejs

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "console.log('Worker healthy')" || exit 1

CMD ["node", "main.js"]