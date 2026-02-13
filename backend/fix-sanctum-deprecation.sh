#!/bin/bash

# Fix Laravel Sanctum PHP 8.4 Deprecation Warning
# This script patches the Guard.php file to fix the implicit nullable parameter warning

echo "🔧 Fixing Laravel Sanctum PHP 8.4 Deprecation Warning..."
echo ""

cd "$(dirname "$0")"

GUARD_FILE="vendor/laravel/sanctum/src/Guard.php"

if [ ! -f "$GUARD_FILE" ]; then
    echo "❌ Sanctum Guard.php not found at $GUARD_FILE"
    echo "   Make sure you've run: composer install"
    exit 1
fi

# Check if already patched
if grep -q "protected function isValidBearerToken(?string \$token = null)" "$GUARD_FILE"; then
    echo "✅ Already patched! The file already has the correct nullable type."
    exit 0
fi

# Create backup
echo "📦 Creating backup..."
cp "$GUARD_FILE" "${GUARD_FILE}.backup"

# Apply patch
echo "🔨 Applying patch..."
sed -i.bak 's/protected function isValidBearerToken(string $token = null)/protected function isValidBearerToken(?string $token = null)/' "$GUARD_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Successfully patched Guard.php"
    echo ""
    echo "📝 Changed:"
    echo "   FROM: protected function isValidBearerToken(string \$token = null)"
    echo "   TO:   protected function isValidBearerToken(?string \$token = null)"
    echo ""
    echo "💡 Note: This patch will be lost if you run 'composer update laravel/sanctum'"
    echo "   Consider updating to a newer version of Sanctum that fixes this issue."
    echo ""
    echo "🗑️  Backup saved to: ${GUARD_FILE}.backup"
else
    echo "❌ Failed to apply patch"
    echo "   Restoring backup..."
    mv "${GUARD_FILE}.backup" "$GUARD_FILE"
    exit 1
fi
