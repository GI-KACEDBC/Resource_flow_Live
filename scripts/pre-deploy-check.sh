#!/bin/bash
#
# ResourceFlow - Pre-Deployment Checklist
# Verifies configuration before deployment.
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

ERRORS=0

echo "=============================================="
echo "  ResourceFlow - Pre-Deployment Check"
echo "=============================================="
echo ""

# Backend .env
echo "Backend (.env)"
if [ ! -f "$BACKEND_DIR/.env" ]; then
  echo "  ❌ .env not found (copy .env.example)"
  ERRORS=$((ERRORS + 1))
else
  echo "  ✓ .env exists"
  grep -q "^APP_KEY=base64:" "$BACKEND_DIR/.env" 2>/dev/null && echo "  ✓ APP_KEY set" || { echo "  ❌ APP_KEY missing (run php artisan key:generate)"; ERRORS=$((ERRORS + 1)); }
  grep -q "^APP_ENV=production" "$BACKEND_DIR/.env" 2>/dev/null && echo "  ✓ APP_ENV=production" || echo "  ⚠ APP_ENV not production"
  grep -q "^APP_DEBUG=false" "$BACKEND_DIR/.env" 2>/dev/null && echo "  ✓ APP_DEBUG=false" || echo "  ⚠ APP_DEBUG not false"
  grep -q "^DB_" "$BACKEND_DIR/.env" 2>/dev/null && echo "  ✓ DB_* configured" || { echo "  ❌ DB_* missing"; ERRORS=$((ERRORS + 1)); }
  grep -q "yourdomain" "$BACKEND_DIR/.env" 2>/dev/null && echo "  ⚠ Replace yourdomain.com with your actual domain" || echo "  ✓ Domain configured"
fi
echo ""

# Frontend .env
echo "Frontend (.env)"
if [ ! -f "$FRONTEND_DIR/.env" ]; then
  echo "  ❌ .env not found (copy .env.example)"
  ERRORS=$((ERRORS + 1))
else
  echo "  ✓ .env exists"
  grep -qE "^VITE_API_BASE_URL=.+" "$FRONTEND_DIR/.env" 2>/dev/null && echo "  ✓ VITE_API_BASE_URL set" || echo "  ⚠ VITE_API_BASE_URL missing or empty (required for production)"
  grep -q "yourdomain" "$FRONTEND_DIR/.env" 2>/dev/null && echo "  ⚠ Replace yourdomain.com with your API URL" || echo "  ✓ API URL configured"
fi
echo ""

# PHP
echo "Requirements"
command -v php >/dev/null 2>&1 && echo "  ✓ PHP $(php -r 'echo PHP_VERSION;')" || { echo "  ❌ PHP not found"; ERRORS=$((ERRORS + 1)); }
command -v composer >/dev/null 2>&1 && echo "  ✓ Composer" || { echo "  ❌ Composer not found"; ERRORS=$((ERRORS + 1)); }
command -v node >/dev/null 2>&1 && echo "  ✓ Node $(node -v)" || { echo "  ❌ Node not found"; ERRORS=$((ERRORS + 1)); }
command -v npm >/dev/null 2>&1 && echo "  ✓ npm $(npm -v)" || { echo "  ❌ npm not found"; ERRORS=$((ERRORS + 1)); }
echo ""

# Database connectivity (optional)
if [ -f "$BACKEND_DIR/.env" ]; then
  echo "Database"
  cd "$BACKEND_DIR"
  if php artisan migrate:status >/dev/null 2>&1; then
    echo "  ✓ Database connection OK"
  else
    echo "  ⚠ Database connection failed (check DB_* in .env)"
  fi
  echo ""
fi

echo "=============================================="
if [ $ERRORS -gt 0 ]; then
  echo "  ❌ $ERRORS issue(s) found. Fix before deploying."
  exit 1
else
  echo "  ✅ Pre-deployment check passed!"
fi
echo "=============================================="
