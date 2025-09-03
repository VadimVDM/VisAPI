# Production Dockerfile for Worker service
# Optimized for Railway deployment

# Stage 1: Dependencies
FROM node:22-alpine AS deps

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json pnpm-lock.yaml nx.json tsconfig.base.json ./

RUN corepack enable && corepack prepare pnpm@latest --activate
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

RUN corepack enable && corepack prepare pnpm@latest --activate

ENV NODE_ENV=production
RUN pnpm nx build worker --configuration=production

# Ensure tslib is in the generated package.json
RUN cd dist/apps/worker && \
    if ! grep -q "tslib" package.json; then \
      npm pkg set dependencies.tslib="^2.8.1"; \
    fi

# Install dependencies for the built app
RUN cd dist/apps/worker && pnpm install --production

# Stage 3: Runner
FROM node:22-alpine AS runner

# Install Chromium for PDF generation
RUN apk update && apk add --no-cache \
  chromium \
  nss \
  freetype \
  freetype-dev \
  harfbuzz \
  ca-certificates \
  ttf-freefont \
  font-noto-emoji \
  && rm -rf /var/cache/apk/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    NODE_ENV=production \
    SERVICE_NAME=worker \
    NODE_OPTIONS="--max-old-space-size=2048"

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

COPY --from=builder --chown=nodejs:nodejs /app/dist/apps/worker ./

RUN mkdir -p /tmp/pdf-generator /app/templates/pdf/examples && \
    chown -R nodejs:nodejs /tmp/pdf-generator /app/templates

USER nodejs

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "console.log('Worker healthy')" || exit 1

CMD ["node", "main.js"]