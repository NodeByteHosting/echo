#!/bin/sh
set -e

echo "================================"
echo "🚀 Echo Bot Starting"
echo "================================"
echo "📁 Working directory: $(pwd)"
echo "📂 Files in /app:"
ls -la /app
echo ""
echo "📂 Files in /app/src:"
ls -la /app/src
echo ""
echo "🔍 Checking environment variables:"
echo "   TOKEN: ${TOKEN:+SET}"
echo "   CLIENT_ID: ${CLIENT_ID:+SET}"
echo "   DATABASE_URL: ${DATABASE_URL:+SET}"
echo ""
echo "🏃 Starting bot..."
echo "================================"
exec bun run src/index.js
