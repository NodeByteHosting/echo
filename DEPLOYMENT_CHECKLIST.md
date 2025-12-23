# 🚀 Echo Bot Deployment Checklist

## Pre-Deployment

- [ ] Copy `.env.example` to `.env` and fill in all values
- [ ] Ensure PostgreSQL database is running and accessible
- [ ] Test database connection with `DATABASE_URL`
- [ ] Verify Discord bot token is valid
- [ ] Confirm OpenAI API key has credits
- [ ] Confirm Tavily API key is valid

## Required Environment Variables

### Discord
- [ ] `TOKEN` - Your Discord bot token
- [ ] `CLIENT_ID` - Your Discord application client ID

### Database
- [ ] `DATABASE_URL` - PostgreSQL connection string

### AI Services
- [ ] `OPENAI_API_KEY` - OpenAI API key
- [ ] `TAVILY_API_KEY` - Tavily search API key

## Docker Deployment

### Using Docker Compose (Recommended)
```bash
# 1. Build and start the bot
docker compose up -d --build

# 2. Check logs
docker compose logs -f echo-bot

# 3. Stop the bot
docker compose down
```

### Using Docker Only
```bash
# 1. Build the image
docker build -t echo-bot .

# 2. Run the container
docker run -d \
  --name echo-bot \
  --env-file .env \
  --restart unless-stopped \
  echo-bot

# 3. Check logs
docker logs -f echo-bot

# 4. Stop the container
docker stop echo-bot
docker rm echo-bot
```

## Dokploy Deployment

1. **Create New Application**
   - Select "Docker Compose" or "Dockerfile"
   - Connect your Git repository

2. **Set Environment Variables** (in Dokploy UI)
   ```
   TOKEN=your_token
   CLIENT_ID=your_client_id
   DATABASE_URL=postgresql://...
   OPENAI_API_KEY=your_key
   TAVILY_API_KEY=your_key
   ```

3. **Deploy**
   - Click "Deploy" button
   - Monitor logs for startup

4. **Verify**
   - Bot should appear online in Discord
   - Check health status in Dokploy

## Troubleshooting

### Bot Not Coming Online

1. **Check logs** for error messages
   ```bash
   docker logs echo-bot
   # or in Dokploy: View Logs
   ```

2. **Verify environment variables**
   - All required vars are set
   - No typos in variable names
   - TOKEN is valid and not expired

3. **Database connection**
   - DATABASE_URL format is correct
   - Database is accessible from container
   - Database exists and schema is up to date

4. **API Keys**
   - OPENAI_API_KEY is valid and has credits
   - TAVILY_API_KEY is valid

### Common Errors

**"Missing required environment variables"**
- Solution: Set all required env vars in your deployment

**"Failed to start bot"**
- Check Discord token validity
- Verify bot has proper intents enabled in Discord Developer Portal

**"Database connection failed"**
- Verify DATABASE_URL is correct
- Check database is running and accessible
- Ensure database user has proper permissions

**Import errors / Module not found**
- This was fixed - ensure you're using the latest code
- Verify all imports use `#` prefix (not `@`)

## Health Checks

The bot includes:
- Environment variable validation at startup
- Automatic database migration on container start
- Health check every 30 seconds
- Auto-restart on failure

## Post-Deployment

- [ ] Verify bot appears online in Discord
- [ ] Test basic commands
- [ ] Check database connectivity
- [ ] Monitor logs for errors
- [ ] Set up log monitoring/alerts (optional)

## Updating the Bot

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker compose down
docker compose up -d --build

# Or in Dokploy: click "Rebuild" button
```

---

✅ **All checks passed? Your bot should be online!**
