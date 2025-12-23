# Use Bun as base image
FROM oven/bun:1-alpine

# Set working directory
WORKDIR /app

# Install system dependencies for Prisma and utilities
RUN apk add --no-cache openssl procps

# Copy package files and lockfile
COPY package.json bun.lockb ./

# Copy Prisma schema before install
COPY prisma ./prisma

# Install ALL dependencies first (including devDependencies for build)
RUN bun install --frozen-lockfile --ignore-scripts

# Generate Prisma Client
RUN bunx prisma generate

# Copy application files
COPY src ./src

# Copy specific root-level config files
COPY ai.config.js ./
COPY cacheManager.js ./
COPY presence.js ./
COPY prompt.service.js ./
COPY commitlint.config.cjs ./

# Remove devDependencies to reduce image size
RUN bun install --frozen-lockfile --production --ignore-scripts

# Set environment to production
ENV NODE_ENV=production

# Run the bot with Bun
CMD ["bun", "run", "src/index.js"]

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s CMD pgrep -f bun || exit 1
