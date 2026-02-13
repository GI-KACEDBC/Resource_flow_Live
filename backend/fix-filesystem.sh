#!/bin/bash
# This script fixes the Laravel filesystem configuration

echo "Fixing Laravel filesystem configuration..."

# Navigate to the backend directory
cd "$(dirname "$0")"

# 1. Ensure storage/app/public directory exists
echo "Creating storage directories..."
mkdir -p storage/app/public/{requests,verifications,donations,uploads}

# 2. Set proper permissions
echo "Setting permissions..."
chmod -R 755 storage/app/public

# 3. Create storage link if it doesn't exist
echo "Creating storage link..."
php artisan storage:link 2>&1 || echo "Storage link already exists or failed"

# 4. Clear config cache
echo "Clearing config cache..."
php artisan config:clear

# 5. Check if FILESYSTEM_DISK is set in .env
if ! grep -q "^FILESYSTEM_DISK=" .env 2>/dev/null; then
    echo "Adding FILESYSTEM_DISK to .env..."
    echo "" >> .env
    echo "# Filesystem Configuration" >> .env
    echo "FILESYSTEM_DISK=local" >> .env
else
    echo "FILESYSTEM_DISK already set in .env"
fi

echo ""
echo "Filesystem configuration fixed!"
echo ""
echo "Next steps:"
echo "1. Restart your Laravel server (php artisan serve)"
echo "2. Try uploading a file again"
echo ""
echo "If you still get errors, check:"
echo "- storage/app/public directory exists and is writable"
echo "- public/storage symlink exists"
echo "- .env has FILESYSTEM_DISK=local or FILESYSTEM_DISK=public"
