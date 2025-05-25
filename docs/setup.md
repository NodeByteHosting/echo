# Setup Guide

This guide walks through the process of setting up Echo for development or deployment.

## Prerequisites

- [Bun](https://bun.sh) 1.0 or higher
- PostgreSQL database
- Discord Bot Token
- OpenAI API Key

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/nodebyte/echo.git
   cd echo
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Create `.env` file:
   ```env
   # Discord
   DISCORD_TOKEN=your_bot_token
   CLIENT_ID=your_client_id
   
   # Database
   DATABASE_URL=postgresql://user:password@localhost:5432/echo
   
   # OpenAI
   OPENAI_API_KEY=your_api_key
   TAVILY_API_KEY=your_tavily_key
   
   # Optional Settings
   DEBUG=false
   LOG_LEVEL=info
   ```

## Database Setup

1. Create PostgreSQL database:
   ```bash
   createdb echo
   ```

2. Run migrations:
   ```bash
   bunx prisma migrate dev
   ```

3. Generate Prisma client:
   ```bash
   bunx prisma generate
   ```

## Development Setup

1. Start in development mode:
   ```bash
   bun dev
   ```

2. Format code:
   ```bash
   bun run prettier --write .
   ```

## Production Deployment

1. Run migrations:
   ```bash
   bunx prisma migrate deploy
   ```

2. Start the bot:
   ```bash
   bun start
   ```

## Configuration

### Discord Setup
1. Create application at Discord Developer Portal
2. Create bot user
3. Get bot token and client ID
4. Set required intents and permissions

### Database Configuration
1. Set up PostgreSQL database
2. Configure connection URL
3. Run initial migrations

### OpenAI Setup
1. Create OpenAI account
2. Generate API key
3. Configure environment variables

## Troubleshooting

Common issues and solutions:

1. Database Connection
   - Check connection string
   - Verify PostgreSQL is running
   - Check database permissions

2. Discord Connection
   - Verify bot token
   - Check required intents
   - Verify permissions

3. AI Integration
   - Validate API key
   - Check rate limits
   - Verify model access

## Monitoring

The bot includes built-in monitoring capabilities. You can:

1. Access logs through your NodeByte dashboard
2. Use the `/status` command to check bot health
3. View performance metrics in your hosting panel

## Updates

Keep dependencies updated:
```bash
bun update
```

Run migrations after updates:
```bash
bunx prisma migrate dev
```
