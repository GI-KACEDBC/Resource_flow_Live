#!/bin/bash
#
# ResourceFlow - VPS Remote Deployment Script
# Run this script ON your VPS after uploading the project.
# Based on Deployment_Guide.md Section 9 (Hostinger VPS).
#
# Prerequisites: Ubuntu 22.04, root or sudo access
# Usage: ./vps-deploy-remote.sh
# Or: bash vps-deploy-remote.sh
#
# Set these before running (or export from vps-deploy-config):
#   DOMAIN, API_DOMAIN, DB_PASSWORD, PAYSTACK_PUBLIC_KEY, PAYSTACK_SECRET_KEY
#   CERTBOT_EMAIL (for SSL)
#

set -e

# Config (override via environment)
DOMAIN="${DOMAIN:-yourdomain.com}"
API_DOMAIN="${API_DOMAIN:-api.yourdomain.com}"
DB_PASSWORD="${DB_PASSWORD:?Set DB_PASSWORD}"
PAYSTACK_PUBLIC_KEY="${PAYSTACK_PUBLIC_KEY:-pk_live_placeholder}"
PAYSTACK_SECRET_KEY="${PAYSTACK_SECRET_KEY:-sk_live_placeholder}"
QOREID_SECRET_KEY="${QOREID_SECRET_KEY:-}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-admin@${DOMAIN}}"
APP_PATH="/var/www/resourceflow"

echo "=============================================="
echo "  ResourceFlow - VPS Remote Deployment"
echo "=============================================="
echo "  Domain: $DOMAIN"
echo "  API: $API_DOMAIN"
echo "=============================================="
echo ""

# --- Phase 1: Server setup (skip if already done) ---
install_deps() {
  echo "📦 Installing dependencies..."
  apt update && apt upgrade -y
  apt install -y software-properties-common
  add-apt-repository -y ppa:ondrej/php
  apt update

  apt install -y \
    php8.2-fpm php8.2-cli php8.2-pgsql php8.2-mbstring php8.2-xml \
    php8.2-curl php8.2-zip php8.2-gd php8.2-bcmath php8.2-redis \
    nginx postgresql postgresql-contrib \
    certbot python3-certbot-nginx \
    git supervisor

  curl -sS https://getcomposer.org/installer | php
  mv composer.phar /usr/local/bin/composer
  chmod +x /usr/local/bin/composer

  curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
  apt install -y nodejs

  systemctl enable nginx php8.2-fpm postgresql
  systemctl start nginx php8.2-fpm postgresql
}

# --- Phase 2: PostgreSQL ---
setup_db() {
  echo "🗄️  Setting up PostgreSQL..."
  sudo -u postgres psql -c "CREATE DATABASE resourceflow;" 2>/dev/null || true
  sudo -u postgres psql -c "CREATE USER resourceflow_user WITH ENCRYPTED PASSWORD '$DB_PASSWORD';" 2>/dev/null || true
  sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE resourceflow TO resourceflow_user;" 2>/dev/null || true
  sudo -u postgres psql -d resourceflow -c "GRANT ALL ON SCHEMA public TO resourceflow_user;" 2>/dev/null || true
  sudo -u postgres psql -d resourceflow -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO resourceflow_user;" 2>/dev/null || true
  sudo -u postgres psql -d resourceflow -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO resourceflow_user;" 2>/dev/null || true
}

# --- Phase 3: Backend ---
setup_backend() {
  echo "📦 Setting up backend..."
  cd "$APP_PATH/backend"

  [ -f .env ] || cp .env.example .env

  # Write .env
  cat > .env << EOF
APP_NAME=ResourceFlow
APP_ENV=production
APP_KEY=
APP_DEBUG=false
APP_URL=https://${API_DOMAIN}
FRONTEND_URL=https://${DOMAIN}
SANCTUM_STATEFUL_DOMAINS=${DOMAIN},www.${DOMAIN}
LOG_CHANNEL=stack
LOG_LEVEL=error
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=resourceflow
DB_USERNAME=resourceflow_user
DB_PASSWORD=${DB_PASSWORD}
BROADCAST_DRIVER=log
CACHE_DRIVER=file
FILESYSTEM_DISK=local
QUEUE_CONNECTION=database
SESSION_DRIVER=file
SESSION_LIFETIME=120
PAYSTACK_PUBLIC_KEY=${PAYSTACK_PUBLIC_KEY}
PAYSTACK_SECRET_KEY=${PAYSTACK_SECRET_KEY}
QOREID_SECRET_KEY=${QOREID_SECRET_KEY}
EOF

  composer install --no-dev --optimize-autoloader --no-interaction
  php artisan key:generate --force
  php artisan migrate:fresh --seed --force
  php artisan storage:link 2>/dev/null || true
  php artisan config:cache
  php artisan route:cache
  php artisan view:cache
}

# --- Phase 4: Frontend ---
setup_frontend() {
  echo "📦 Setting up frontend..."
  cd "$APP_PATH/frontend"

  [ -f .env ] || cp .env.example .env

  cat > .env << EOF
VITE_API_BASE_URL=https://${API_DOMAIN}/api
VITE_PAYSTACK_PUBLIC_KEY=${PAYSTACK_PUBLIC_KEY}
EOF

  # Skip build if dist already exists (e.g. uploaded from local)
  if [ -f "dist/index.html" ]; then
    echo "   ✓ Using existing frontend build (dist/)"
  else
    npm ci
    npm run build
  fi
}

# --- Phase 5: Permissions ---
set_permissions() {
  echo "🔐 Setting permissions..."
  chown -R www-data:www-data "$APP_PATH"
  chmod -R 755 "$APP_PATH"
  chmod -R 775 "$APP_PATH/backend/storage"
  chmod -R 775 "$APP_PATH/backend/bootstrap/cache"
}

# --- Phase 6: Nginx ---
setup_nginx() {
  echo "🌐 Configuring Nginx..."

  cat > /etc/nginx/sites-available/resourceflow-api << EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${API_DOMAIN};
    root ${APP_PATH}/backend/public;
    index index.php;
    charset utf-8;
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    location / {
        try_files \$uri \$uri/ /index.php?\$query_string;
    }
    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt  { access_log off; log_not_found off; }
    error_page 404 /index.php;
    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME \$realpath_root\$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_hide_header X-Powered-By;
    }
    location ~ /\.(?!well-known).* { deny all; }
}
EOF

  cat > /etc/nginx/sites-available/resourceflow-frontend << EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} www.${DOMAIN};
    root ${APP_PATH}/frontend/dist;
    index index.html;
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    location ~* \.(css|js|jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
EOF

  ln -sf /etc/nginx/sites-available/resourceflow-api /etc/nginx/sites-enabled/
  ln -sf /etc/nginx/sites-available/resourceflow-frontend /etc/nginx/sites-enabled/
  rm -f /etc/nginx/sites-enabled/default
  nginx -t && systemctl reload nginx
}

# --- Phase 7: SSL ---
setup_ssl() {
  echo "🔒 Installing SSL certificates..."
  certbot --nginx -d "$API_DOMAIN" -d "$DOMAIN" -d "www.$DOMAIN" \
    --non-interactive --agree-tos -m "$CERTBOT_EMAIL" || true
  certbot renew --dry-run 2>/dev/null || true
}

# --- Phase 8: Supervisor ---
setup_supervisor() {
  echo "⚙️  Configuring Supervisor..."
  cat > /etc/supervisor/conf.d/resourceflow-worker.conf << EOF
[program:resourceflow-worker]
process_name=%(program_name)s_%(process_num)02d
command=php ${APP_PATH}/backend/artisan queue:work --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
numprocs=2
redirect_stderr=true
stdout_logfile=${APP_PATH}/backend/storage/logs/worker.log
stopwaitsecs=3600
user=www-data
EOF
  supervisorctl reread
  supervisorctl update
  supervisorctl start resourceflow-worker:* 2>/dev/null || true
}

# --- Phase 9: Cron ---
setup_cron() {
  echo "⏰ Configuring cron..."
  (crontab -l 2>/dev/null | grep -v "resourceflow/backend"; echo "* * * * * cd ${APP_PATH}/backend && php artisan schedule:run >> /dev/null 2>&1") | crontab -
}

# --- Phase 10: Firewall ---
setup_firewall() {
  echo "🔥 Configuring firewall..."
  ufw allow OpenSSH 2>/dev/null || true
  ufw allow 'Nginx Full' 2>/dev/null || true
  ufw --force enable 2>/dev/null || true
}

# --- Main ---
main() {
  if [ ! -d "$APP_PATH" ]; then
    echo "❌ Error: $APP_PATH not found. Upload the project first."
    echo "   From local: scp -r /path/to/Resource_flow_Live root@VPS_IP:/var/www/resourceflow"
    exit 1
  fi

  # Skip package install if PHP exists (faster re-runs)
  if ! command -v php &>/dev/null; then
    install_deps
  else
    echo "✓ PHP already installed, skipping package install"
  fi

  setup_db
  setup_backend
  setup_frontend
  set_permissions
  setup_nginx
  setup_ssl
  setup_supervisor
  setup_cron
  setup_firewall

  echo ""
  echo "=============================================="
  echo "  ✅ VPS Deployment Complete!"
  echo "=============================================="
  echo ""
  echo "Next steps:"
  echo "  1. Add DNS A records: @, www, api → your VPS IP"
  echo "  2. Paystack webhook: https://${API_DOMAIN}/api/payments/paystack-webhook"
  echo "  3. Log in: https://${DOMAIN} (superadmin@resourceflow.com)"
  echo "  4. Change default passwords!"
  echo ""
}

main "$@"
