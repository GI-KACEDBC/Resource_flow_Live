#!/bin/bash

# Fix Laravel Configuration Issues
# This script checks and fixes common configuration problems

echo "🔧 Fixing Laravel Configuration Issues..."
echo ""

cd "$(dirname "$0")"

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    if [ -f .env.example ]; then
        echo "📋 Copying .env.example to .env..."
        cp .env.example .env
    else
        echo "⚠️  .env.example not found. Please create .env manually."
        exit 1
    fi
fi

# Check and set APP_KEY
if ! grep -q "^APP_KEY=base64:" .env 2>/dev/null; then
    echo "🔑 Generating APP_KEY..."
    php artisan key:generate --force
else
    echo "✅ APP_KEY is set"
fi

# Check and set SESSION_DRIVER
if ! grep -q "^SESSION_DRIVER=" .env 2>/dev/null; then
    echo "📝 Adding SESSION_DRIVER=file to .env..."
    echo "SESSION_DRIVER=file" >> .env
elif grep -q "^SESSION_DRIVER=$" .env 2>/dev/null || grep -q "^SESSION_DRIVER=\s*$" .env 2>/dev/null; then
    echo "📝 Setting SESSION_DRIVER=file in .env..."
    sed -i.bak 's/^SESSION_DRIVER=.*/SESSION_DRIVER=file/' .env
else
    echo "✅ SESSION_DRIVER is set"
fi

# Check and set CACHE_DRIVER
if ! grep -q "^CACHE_DRIVER=" .env 2>/dev/null; then
    echo "📝 Adding CACHE_DRIVER=file to .env..."
    echo "CACHE_DRIVER=file" >> .env
elif grep -q "^CACHE_DRIVER=$" .env 2>/dev/null || grep -q "^CACHE_DRIVER=\s*$" .env 2>/dev/null; then
    echo "📝 Setting CACHE_DRIVER=file in .env..."
    sed -i.bak 's/^CACHE_DRIVER=.*/CACHE_DRIVER=file/' .env
else
    echo "✅ CACHE_DRIVER is set"
fi

# Remove duplicate variable definitions (keep last occurrence)
echo "🧹 Checking for duplicate .env variables..."
awk -F= '!seen[$1]++' .env > .env.tmp && mv .env.tmp .env

# Clear Laravel caches
echo ""
echo "🧹 Clearing Laravel caches..."
php artisan config:clear 2>/dev/null || echo "⚠️  config:clear failed"
php artisan cache:clear 2>/dev/null || echo "⚠️  cache:clear failed"
php artisan route:clear 2>/dev/null || echo "⚠️  route:clear failed"
php artisan view:clear 2>/dev/null || echo "⚠️  view:clear failed"

# Remove bootstrap cache config if exists
if [ -f bootstrap/cache/config.php ]; then
    echo "🗑️  Removing bootstrap/cache/config.php..."
    rm -f bootstrap/cache/config.php
fi

# Ensure storage directories exist
echo "📁 Ensuring storage directories exist..."
mkdir -p storage/framework/cache/data
mkdir -p storage/framework/sessions
mkdir -p storage/framework/views
mkdir -p storage/logs
mkdir -p storage/app/public/requests
mkdir -p storage/app/public/verifications
mkdir -p storage/app/public/donations
mkdir -p storage/app/public/uploads

# Set permissions (Unix/Linux/Mac only)
if [[ "$OSTYPE" != "msys" && "$OSTYPE" != "win32" ]]; then
    echo "🔐 Setting storage permissions..."
    chmod -R 775 storage
    chmod -R 775 bootstrap/cache
fi

echo ""
echo "✅ Configuration fix complete!"
echo ""
echo "📋 Summary:"
echo "   - APP_KEY: $(grep '^APP_KEY=' .env | cut -d'=' -f2 | cut -c1-20)..."
echo "   - SESSION_DRIVER: $(grep '^SESSION_DRIVER=' .env | cut -d'=' -f2)"
echo "   - CACHE_DRIVER: $(grep '^CACHE_DRIVER=' .env | cut -d'=' -f2)"
echo ""
echo "🚀 You can now run: php artisan migrate"
