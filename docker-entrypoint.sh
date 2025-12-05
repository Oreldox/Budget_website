#!/bin/sh
set -e

echo "🚀 Starting Budget Application..."

# Wait for database to be ready (only if using PostgreSQL)
if [ ! -z "$DATABASE_URL" ] && echo "$DATABASE_URL" | grep -q "postgresql"; then
  echo "⏳ Waiting for PostgreSQL database..."

  # Extract host and port from DATABASE_URL
  DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
  DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')

  echo "Checking connection to $DB_HOST:$DB_PORT..."

  # Wait for database with timeout
  timeout=30
  counter=0
  until nc -z $DB_HOST $DB_PORT 2>/dev/null || [ $counter -eq $timeout ]; do
    counter=$((counter + 1))
    echo "Waiting for database... ($counter/$timeout)"
    sleep 1
  done

  if [ $counter -eq $timeout ]; then
    echo "❌ Database connection timeout!"
    exit 1
  fi

  echo "✅ Database is ready!"

  # Run Prisma migrations for PostgreSQL
  echo "📦 Running database migrations..."
  npx prisma migrate deploy
else
  echo "🗄️  Using SQLite database (no wait needed)"

  # For SQLite, ensure database directory exists
  echo "📁 Creating database directory..."
  mkdir -p /app/data

  # Ensure Prisma client is generated
  echo "📦 Ensuring Prisma client is ready..."
  npx prisma generate

  # Push database schema (use db push instead of migrate for SQLite without migrations)
  echo "🔄 Initializing database schema..."
  if npx prisma migrate deploy 2>/dev/null; then
    echo "✅ Migrations applied successfully"
  else
    echo "⚠️  No migrations found, using db push..."
    npx prisma db push --accept-data-loss --skip-generate || echo "❌ DB push failed"
  fi
fi

# Start the application
echo "✅ Starting Next.js application..."
exec node server.js
