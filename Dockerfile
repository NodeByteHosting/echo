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

# Install dependencies without scripts to avoid postinstall issues
RUN bun install --frozen-lockfile --production --ignore-scripts

# Generate Prisma Client explicitly
RUN bunx prisma generate

# Copy application files
COPY src ./src

# Copy root-level config files
COPY *.js ./
COPY *.cjs ./

# Set environment to production
ENV NODE_ENV=production

# Run the bot with Bun
CMD ["bun", "run", "src/index.js"]
# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s CMD pgrep -f bun || exit 1
