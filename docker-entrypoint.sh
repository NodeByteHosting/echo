#!/bin/bash
set -e

echo "=================================================="
echo "🦊 Echo Bot Container Starting"
echo "=================================================="
echo ""
echo "📅 Date: $(date)"
echo "📁 Working directory: $(pwd)"
echo "🐧 OS: $(uname -a)"
echo ""
echo "📂 Root files:"
ls -lah /app | head -20
echo ""
echo "📂 Source directory:"
ls -lah /app/src | head -20
echo ""
echo "🔍 Environment check:"
echo "   NODE_ENV: ${NODE_ENV}"
echo "   TOKEN: ${TOKEN:+✅ SET (hidden)}${TOKEN:-❌ NOT SET}"
echo "   CLIENT_ID: ${CLIENT_ID:+✅ SET}${CLIENT_ID:-❌ NOT SET}"
echo "   DATABASE_URL: ${DATABASE_URL:+✅ SET (hidden)}${DATABASE_URL:-❌ NOT SET}"
echo "   OPENAI_API_KEY: ${OPENAI_API_KEY:+✅ SET (hidden)}${OPENAI_API_KEY:-❌ NOT SET}"
echo "   TAVILY_API_KEY: ${TAVILY_API_KEY:+✅ SET (hidden)}${TAVILY_API_KEY:-❌ NOT SET}"
echo ""

# Check required environment variables
MISSING_VARS=()
[[ -z "$TOKEN" ]] && MISSING_VARS+=("TOKEN")
[[ -z "$CLIENT_ID" ]] && MISSING_VARS+=("CLIENT_ID")
[[ -z "$DATABASE_URL" ]] && MISSING_VARS+=("DATABASE_URL")
[[ -z "$OPENAI_API_KEY" ]] && MISSING_VARS+=("OPENAI_API_KEY")
[[ -z "$TAVILY_API_KEY" ]] && MISSING_VARS+=("TAVILY_API_KEY")

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo "❌ ERROR: Missing required environment variables: ${MISSING_VARS[*]}"
    echo "Please set these variables in your docker-compose.yml or environment"
    exit 1
fi
echo "✅ All required environment variables are set"
echo ""
echo "🔍 Bun version:"
bun --version
echo ""
echo "🗄️  Running database migrations..."

# Try migrations first (for production with migration files)
if bunx prisma migrate deploy 2>/dev/null; then
    echo "✅ Migrations applied successfully"
# If no migrations or migrations fail, try db push (for initial setup or development)
elif bunx prisma db push --accept-data-loss --skip-generate 2>/dev/null; then
    echo "✅ Database schema synced (using db push)"
else
    echo "⚠️  Warning: Database migration failed"
    echo "    Attempting to continue - bot may have errors if schema is not synced"
fi
echo ""
echo "🏃 Executing: bun run src/index.js"
echo "=================================================="
echo ""

exec bun run src/index.js
