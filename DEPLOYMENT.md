# Dokploy Deployment Guide

## Required Environment Variables

Set these in your Dokploy environment configuration:

```bash
# Required - Discord
TOKEN=your_discord_bot_token
CLIENT_ID=your_discord_client_id

# Required - Database
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Required - AI Services
OPENAI_API_KEY=your_openai_api_key
TAVILY_API_KEY=your_tavily_api_key

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

1. **Connect Your Repository**
   - In Dokploy, click "Create Application"
   - Select "Docker" as the application type
   - Connect your Git repository
   - Select the branch to deploy (e.g., `main`)

2. **Configure Build Settings**
   - Build Type: Dockerfile
   - Dockerfile Path: `./Dockerfile` (default)
   - Build Context: `.` (root directory)

3. **Set Environment Variables**
   - Go to the "Environment" tab
   - Add all required variables:
     ```
     TOKEN=your_discord_bot_token
     CLIENT_ID=your_discord_client_id
     DATABASE_URL=postgresql://user:password@host:5432/dbname
     OPENAI_API_KEY=your_openai_api_key
     TAVILY_API_KEY=your_tavily_api_key
     ```
   - Optional: Add `NODE_ENV=production` (already set in Dockerfile)

4. **Database Connection**
   - If using Dokploy's PostgreSQL service:
     - Create a new PostgreSQL database in Dokploy
     - Copy the connection string
     - Use the internal service name in DATABASE_URL
   - If using external database:
     - Ensure database is accessible from Dokploy's network
     - Use the external hostname/IP in DATABASE_URL

5. **Deploy**
   - Click "Deploy" button
   - Monitor the build logs
   - Wait for "✅ Echo is now online!" message in logs

6. **Verify Deployment**
   - Check bot status in Discord (should show online)
   - Review application logs in Dokploy
   - Test bot commands in Discord

## Troubleshooting

### Common Dokploy Issues

**Build Fails**
- Check that the repository is accessible
- Verify Dockerfile path is correct
- Review build logs for specific errors

**Container Starts but Bot Doesn't Come Online**
- Check application logs for error messages
- Verify all 5 required environment variables are set
- Ensure DATABASE_URL can connect from within the container
- Validate Discord TOKEN is not expired

**Database Connection Issues**
- If using Dokploy PostgreSQL: Use internal service name (e.g., `postgres-echo-xxxxx:5432`)
- If using external DB: Ensure firewall allows Dokploy's IP
- Test DATABASE_URL format: `postgresql://user:password@host:5432/database`
- Check database exists and user has proper permissions

**"Missing required environment variables" Error**
- Go to Dokploy Environment tab
- Verify all 5 required vars are set:
  - TOKEN
  - CLIENT_ID
  - DATABASE_URL
  - OPENAI_API_KEY
  - TAVILY_API_KEY
- Click "Redeploy" after adding variables

**Health Check Failures**
- The bot has a 60-second startup grace period
- If failing after startup, check bot logs for crashes
- Verify the bot process is running (health check looks for Bun process)

### Getting Logs in Dokploy

1. Go to your application in Dokploy
2. Click "Logs" tab
3. Look for startup messages:
   - `🦊 Echo Bot Container Starting`
   - `✅ All required environment variables are set`
   - `✅ Migrations applied successfully`
   - `✅ Echo is now online!`

If the bot doesn't come online:

1. Check logs in Dokploy console
2. Verify `DATABASE_URL` is set correctly
3. Ensure Discord token has proper permissions
4. Check that all required environment variables are set

## Health Check

The container includes a health check that verifies Bun is running. Dokploy will automatically restart if health check fails.
