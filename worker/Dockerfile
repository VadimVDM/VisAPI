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
COPY worker/package.json ./worker/
RUN pnpm install

# Build stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/worker/node_modules ./worker/node_modules
COPY . .
RUN pnpm nx build worker

# Distroless runtime stage for enhanced security
FROM gcr.io/distroless/nodejs20-debian11 AS runner

# Set working directory
WORKDIR /app

# Copy necessary files from builder
COPY --from=builder --chown=1001:1001 /app/dist/worker ./
COPY --from=builder --chown=1001:1001 /app/templates ./templates
COPY --from=builder --chown=1001:1001 /app/node_modules ./node_modules

# Copy Chromium and dependencies from Alpine build stage
COPY --from=builder --chown=1001:1001 /usr/bin/chromium-browser /usr/bin/chromium-browser
COPY --from=builder --chown=1001:1001 /usr/lib/chromium /usr/lib/chromium
COPY --from=builder --chown=1001:1001 /usr/share/fonts /usr/share/fonts
COPY --from=builder --chown=1001:1001 /lib/libz.so.1 /lib/libz.so.1

# Set environment variables
ENV NODE_OPTIONS="--max-old-space-size=1024"
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Use non-root user (distroless nodejs user)
USER 1001:1001

EXPOSE 3000

CMD ["main.js"]