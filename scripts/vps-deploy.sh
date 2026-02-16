#!/bin/bash
#
# ResourceFlow - Complete VPS Deployment
# Run locally to prepare, upload to VPS, and run remote setup.
#
# Usage:
#   1. cp scripts/vps-deploy-config.example scripts/vps-deploy-config
#   2. Edit scripts/vps-deploy-config with your VPS_IP, DOMAIN, etc.
#   3. source scripts/vps-deploy-config
#   4. ./scripts/vps-deploy.sh
#
# Or with env vars:
#   VPS_HOST=1.2.3.4 DOMAIN=example.com DB_PASSWORD=xxx ./scripts/vps-deploy.sh
#
# Options:
#   --local-only    Build and prepare only, do not upload or run on VPS
#   --upload-only   Build, upload to VPS, but do not run remote script
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

LOCAL_ONLY=false
UPLOAD_ONLY=false
for arg in "$@"; do
  case $arg in
    --local-only)   LOCAL_ONLY=true ;;
    --upload-only)  UPLOAD_ONLY=true ;;
  esac
done

# Load config if exists
[ -f "$SCRIPT_DIR/vps-deploy-config" ] && source "$SCRIPT_DIR/vps-deploy-config"

# Skip upload if VPS_HOST is placeholder (user will add real IP later)
if [[ -z "$VPS_HOST" || "$VPS_HOST" == "YOUR_VPS_IP" ]]; then
  LOCAL_ONLY=true
  echo "Note: VPS_HOST not set — building locally. Add your VPS IP to scripts/vps-deploy-config and run again to deploy."
fi

echo "=============================================="
echo "  ResourceFlow - VPS Deployment"
echo "=============================================="
echo ""

# --- Step 1: Local build ---
echo "📦 Step 1: Building locally..."
cd "$BACKEND_DIR"
composer install --no-dev --optimize-autoloader --no-interaction
php artisan config:cache 2>/dev/null || true
php artisan route:cache 2>/dev/null || true
php artisan view:cache 2>/dev/null || true

cd "$FRONTEND_DIR"
npm ci
npm run build

echo "   ✅ Local build complete"
echo ""

if [ "$LOCAL_ONLY" = true ]; then
  echo "Done. Build ready for deployment."
  echo ""
  echo "When you have your VPS IP, add it to scripts/vps-deploy-config:"
  echo "  export VPS_HOST=your.actual.vps.ip"
  echo ""
  echo "Then run again for full deploy:"
  echo "  source scripts/vps-deploy-config && ./scripts/vps-deploy.sh"
  echo ""
  echo "Or upload manually, then on VPS run:"
  echo "  rsync -avz --exclude node_modules --exclude .git $ROOT_DIR/ root@YOUR_VPS_IP:/var/www/resourceflow/"
  echo "  ssh root@YOUR_VPS_IP"
  echo "  cd /var/www/resourceflow && source scripts/vps-deploy-config && sudo -E bash scripts/vps-deploy-remote.sh"
  exit 0
fi

# --- Step 2: Upload to VPS ---
if [ -z "$VPS_HOST" ]; then
  echo "⚠️  VPS_HOST not set. Skipping upload."
  echo "   Set VPS_HOST in vps-deploy-config or environment."
  echo "   Then run vps-deploy-remote.sh on the VPS manually."
  exit 0
fi

VPS_USER="${VPS_USER:-root}"
VPS_PORT="${VPS_SSH_PORT:-22}"
REMOTE_PATH="/var/www/resourceflow"

echo "📤 Step 2: Uploading to VPS ($VPS_USER@$VPS_HOST)..."

# Create remote directory
ssh -p "$VPS_PORT" -o StrictHostKeyChecking=no "$VPS_USER@$VPS_HOST" "mkdir -p $REMOTE_PATH" 2>/dev/null || true

# Rsync (exclude dev files)
rsync -avz --delete \
  -e "ssh -p $VPS_PORT -o StrictHostKeyChecking=no" \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'backend/.env' \
  --exclude 'backend/vendor' \
  --exclude 'frontend/dist' \
  --exclude 'backend/storage/logs/*' \
  --exclude 'backend/storage/framework/cache/*' \
  --exclude '.DS_Store' \
  "$ROOT_DIR/" "$VPS_USER@$VPS_HOST:$REMOTE_PATH/"

# Upload built frontend dist (we built locally)
rsync -avz -e "ssh -p $VPS_PORT -o StrictHostKeyChecking=no" \
  "$FRONTEND_DIR/dist/" "$VPS_USER@$VPS_HOST:$REMOTE_PATH/frontend/dist/"

echo "   ✅ Upload complete"
echo ""

if [ "$UPLOAD_ONLY" = true ]; then
  echo "Done (--upload-only). SSH to VPS and run:"
  echo "  cd $REMOTE_PATH && sudo bash scripts/vps-deploy-remote.sh"
  exit 0
fi

# --- Step 3: Run remote deployment ---
echo "🚀 Step 3: Running remote deployment on VPS..."
ssh -p "$VPS_PORT" -o StrictHostKeyChecking=no "$VPS_USER@$VPS_HOST" \
  "cd $REMOTE_PATH && DOMAIN=${DOMAIN} API_DOMAIN=${API_DOMAIN} DB_PASSWORD=${DB_PASSWORD} PAYSTACK_PUBLIC_KEY=${PAYSTACK_PUBLIC_KEY} PAYSTACK_SECRET_KEY=${PAYSTACK_SECRET_KEY} QOREID_SECRET_KEY=${QOREID_SECRET_KEY} CERTBOT_EMAIL=${CERTBOT_EMAIL} sudo -E bash scripts/vps-deploy-remote.sh"

echo ""
echo "=============================================="
echo "  ✅ Deployment Complete!"
echo "=============================================="
