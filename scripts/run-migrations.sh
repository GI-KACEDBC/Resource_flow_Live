#!/bin/bash
#
# ResourceFlow - Run Migrations Only (PostgreSQL)
# Use this when you want to run new migrations without re-seeding.
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/../backend"

echo "📦 Running migrations..."
php artisan migrate --force
echo "✅ Migrations complete."
