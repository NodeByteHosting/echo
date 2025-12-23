# Use Bun as base image
FROM oven/bun:1-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache openssl procps bash curl

# Copy package files
COPY package.json bun.lockb ./

# Copy Prisma schema
COPY prisma ./prisma

# Install dependencies
RUN bun install --frozen-lockfile --ignore-scripts

# Generate Prisma Client
RUN bunx prisma generate

# Copy all application files
COPY . .

# Make entrypoint executable
RUN chmod +x /app/docker-entrypoint.sh

# Set environment
ENV NODE_ENV=production

# Use entrypoint
ENTRYPOINT ["/app/docker-entrypoint.sh"]

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s CMD pgrep -f bun || exit 1
