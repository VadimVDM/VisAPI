# Base stage
FROM node:20-alpine AS base

# Install dependencies for Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Set Puppeteer to use installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.13.1 --activate

WORKDIR /app

# Dependencies stage
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
COPY worker/package.json ./worker/
RUN pnpm install --frozen-lockfile

# Build stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/worker/node_modules ./worker/node_modules
COPY . .
RUN pnpm nx build worker

# Runtime stage
FROM base AS runner

# Create non-root user
RUN addgroup -g 1001 nodejs && \
    adduser -u 1001 -G nodejs -s /bin/sh -D nodejs

WORKDIR /app

# Copy necessary files
COPY --from=builder --chown=nodejs:nodejs /app/dist/worker ./
COPY --from=builder --chown=nodejs:nodejs /app/templates ./templates
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Set memory limit for PDF generation
ENV NODE_OPTIONS="--max-old-space-size=1024"

USER nodejs

EXPOSE 3000

CMD ["node", "main.js"]