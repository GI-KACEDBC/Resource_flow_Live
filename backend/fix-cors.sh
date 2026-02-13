#!/bin/bash

echo "🔧 Fixing CORS issues..."

# Clear all caches
echo "Clearing caches..."
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear

echo "✅ Caches cleared!"
echo ""
echo "⚠️  IMPORTANT: Restart your Laravel server now!"
echo "   Stop the current server (Ctrl+C) and run: php artisan serve"
echo ""
echo "Then try logging in again."
