#!/bin/sh
set -e

echo "🚀 Starting Budget Application..."

# Wait for database to be ready
echo "⏳ Waiting for database..."
sleep 5

# Run Prisma migrations
echo "📦 Running database migrations..."
npx prisma migrate deploy

# Start the application
echo "✅ Starting Next.js application..."
exec node server.js
