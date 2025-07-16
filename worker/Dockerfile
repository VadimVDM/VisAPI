# Base stage with build tools
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
RUN pnpm install

# Build stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm nx build worker

# Runtime stage using Node.js alpine for easier dependency management
FROM node:20-alpine AS runner

# Install runtime dependencies for Chromium
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Set working directory
WORKDIR /app

# Copy necessary files from builder
COPY --from=builder --chown=1001:1001 /app/dist/worker ./
COPY --from=builder --chown=1001:1001 /app/templates ./templates
COPY --from=builder --chown=1001:1001 /app/node_modules ./node_modules

# Set environment variables
ENV NODE_OPTIONS="--max-old-space-size=1024"
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Use non-root user
USER 1001:1001

EXPOSE 3000

CMD ["node", "main.js"]