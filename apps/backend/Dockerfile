# syntax=docker/dockerfile:1
# Build optimized backend image using August 2025 best practices

# Stage 1: Dependencies installer
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

# Update to latest pnpm version
RUN corepack enable && corepack prepare pnpm@10.15.0 --activate

# Copy package files for dependency resolution
COPY package.json pnpm-lock.yaml ./
COPY nx.json tsconfig.base.json ./

# Install ALL dependencies with BuildKit cache mount
RUN --mount=type=cache,id=pnpm-store-v1-deps,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# Stage 2: Builder
FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install pnpm for build commands
RUN corepack enable && corepack prepare pnpm@10.15.0 --activate

# Copy installed dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json /app/pnpm-lock.yaml ./
COPY nx.json tsconfig.base.json ./

# Copy source code
COPY apps/backend ./apps/backend
COPY libs ./libs
COPY migrations ./migrations

# Build the application - this generates dist/apps/backend with bundled code
ENV NODE_ENV=production
RUN pnpm nx build backend --skip-nx-cache

# Stage 3: Production dependencies (using generated package.json)
FROM node:22-alpine AS prod-deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.15.0 --activate

# Copy the GENERATED package.json from build output (this has minimal deps)
COPY --from=builder /app/dist/apps/backend/package.json ./
COPY --from=builder /app/dist/apps/backend/pnpm-lock.yaml ./

# Install ONLY the production dependencies needed by the bundled app
RUN --mount=type=cache,id=pnpm-store-v1-prod,target=/root/.local/share/pnpm/store \
    pnpm install --prod --frozen-lockfile

# Stage 4: Final minimal runtime
FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat tini

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy built application (single bundled file + assets)
COPY --from=builder --chown=1001:1001 /app/dist/apps/backend/main.js ./
COPY --from=builder --chown=1001:1001 /app/dist/apps/backend/assets ./assets
COPY --from=builder --chown=1001:1001 /app/migrations ./migrations

# Copy minimal production dependencies
COPY --from=prod-deps --chown=1001:1001 /app/node_modules ./node_modules

# Set production environment
ENV NODE_ENV=production \
    PORT=3000 \
    NODE_OPTIONS="--max-old-space-size=512 --enable-source-maps"

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check using wget (Alpine has it by default)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/healthz || exit 1

# Use tini for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Start the application
CMD ["node", "main.js"]