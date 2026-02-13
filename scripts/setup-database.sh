#!/bin/bash
#
# ResourceFlow - PostgreSQL Database Setup Script
# Runs migrations and seeders for local development and testing.
#
# Usage: ./scripts/setup-database.sh [options]
#   --fresh     Drop all tables and re-run migrations (default)
#   --migrate   Run migrations only (no fresh, no seed)
#   --seed      Run seeders only
#   --seed-only Run seeders without migrate (assumes DB exists)
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/../backend" && pwd)"

cd "$BACKEND_DIR"

# Parse arguments
MODE="full"
for arg in "$@"; do
  case $arg in
    --fresh)    MODE="full" ;;
    --migrate)  MODE="migrate" ;;
    --seed)     MODE="full" ;;
    --seed-only) MODE="seed" ;;
  esac
done

echo "=============================================="
echo "  ResourceFlow - PostgreSQL Database Setup"
echo "=============================================="
echo ""

# Check .env exists
if [ ! -f .env ]; then
  echo "❌ Error: .env file not found in backend/"
  echo "   Copy .env.example to .env and configure DB credentials."
  exit 1
fi

# Load DB config from .env (grep for safety with special chars)
DB_NAME=$(grep -E "^DB_DATABASE=" .env 2>/dev/null | cut -d= -f2- | tr -d '"' | tr -d "'" || echo "resourceflow")
DB_USER=$(grep -E "^DB_USERNAME=" .env 2>/dev/null | cut -d= -f2- | tr -d '"' | tr -d "'" || echo "postgres")
DB_HOST=$(grep -E "^DB_HOST=" .env 2>/dev/null | cut -d= -f2- | tr -d '"' | tr -d "'" || echo "127.0.0.1")
DB_PORT=$(grep -E "^DB_PORT=" .env 2>/dev/null | cut -d= -f2- | tr -d '"' | tr -d "'" || echo "5432")

echo "Database: $DB_NAME @ $DB_HOST:$DB_PORT"
echo ""

# Optional: Create database if it doesn't exist (PostgreSQL)
# Skips if psql not found or creation fails - migrations will fail with clear error
create_db_if_missing() {
  if command -v psql &>/dev/null; then
    if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
      echo "Creating database '$DB_NAME'..."
      psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -tc "CREATE DATABASE \"$DB_NAME\";" 2>/dev/null || echo "   (Create skipped - ensure DB exists manually)"
    fi
  fi
}

# Run migrations
run_migrations() {
  echo "📦 Running migrations..."
  php artisan migrate --force
  echo "   ✅ Migrations complete."
  echo ""
}

# Run migrations (fresh - drops all tables)
run_migrations_fresh() {
  echo "📦 Running migrations (fresh - dropping all tables)..."
  php artisan migrate:fresh --force
  echo "   ✅ Migrations complete."
  echo ""
}

# Run seeders
run_seeders() {
  echo "🌱 Running database seeders..."
  php artisan db:seed --force
  echo "   ✅ Seeders complete."
  echo ""
}

# Execute based on mode
case $MODE in
  full)
    create_db_if_missing
    run_migrations_fresh
    run_seeders
    ;;
  migrate)
    create_db_if_missing
    run_migrations
    ;;
  seed)
    run_seeders
    ;;
esac

echo "=============================================="
echo "  ✅ Database setup complete!"
echo "=============================================="
echo ""
echo "Default accounts (password: svc_r3f70w-J3TM3ga - change after first login):"
echo "  Super Admin: superadmin@resourceflow.com"
echo "  Auditor:     auditor@resourceflow.com"
echo ""
