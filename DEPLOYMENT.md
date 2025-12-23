# Dokploy Deployment Guide

## Required Environment Variables

Set these in your Dokploy environment configuration:

```bash
# Required
TOKEN=your_discord_bot_token
CLIENT_ID=your_discord_client_id
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Optional
MODERATOR_ROLE_ID=
INDEXABLE_CHANNEL_IDS=
MOD_LOG_CHANNEL_ID=
NODE_ENV=production
```

## Database Setup

Make sure your PostgreSQL database is accessible from the container. 

### Option 1: Using Dokploy's built-in PostgreSQL

1. Create a new PostgreSQL instance in Dokploy
2. Use the internal service name as host (e.g., `database-echobot-xxxxx`)
3. Set `DATABASE_URL` like:
   ```
   DATABASE_URL=postgresql://username:password@database-echobot-xxxxx:5432/echo
   ```

### Option 2: Using External PostgreSQL

1. Ensure your database accepts connections from Dokploy's IP
2. Use the public IP/hostname and port
3. Set `DATABASE_URL` like:
   ```
   DATABASE_URL=postgresql://username:password@your-db-host:5432/echo
   ```

**Important**: After deployment, run migrations:
```bash
bunx prisma migrate deploy
# or
bunx prisma db push
```

## Deployment Steps

1. **Push your code** to your Git repository
2. **Create a new application** in Dokploy
3. **Set environment variables** as listed above
4. **Deploy** - Dokploy will build using the Dockerfile

## Troubleshooting

If the bot doesn't come online:

1. Check logs in Dokploy console
2. Verify `DATABASE_URL` is set correctly
3. Ensure Discord token has proper permissions
4. Check that all required environment variables are set

## Health Check

The container includes a health check that verifies Bun is running. Dokploy will automatically restart if health check fails.
