# Use Bun as base image
FROM oven/bun:1-alpine

# Set working directory
WORKDIR /app

# Install system dependencies for Prisma
RUN apk add --no-cache openssl

# Copy package files and lockfile
COPY package.json bun.lockb ./

# Install dependencies
RUN bun install --frozen-lockfile --production

# Copy Prisma schema
COPY prisma ./prisma

# Generate Prisma Client
RUN bunx prisma generate

# Copy application files
COPY src ./src
COPY *.js ./
COPY *.cjs ./

# Set environment to production
ENV NODE_ENV=production

# Run the bot with Bun
CMD ["bun", "run", "src/index.js"]