# ResourceFlow – Deployment Guide

Complete guide for deploying a **fresh** ResourceFlow application with no sample data.

---

## Overview

- **Backend**: Laravel API (PHP 8.1+)
- **Frontend**: React + Vite SPA
- **Database**: PostgreSQL (recommended)
- **Payments**: Paystack (GHS)

After deployment, the system has **two default users**: Super Admin and Auditor.

---

## 0. Pre-Deployment Check

Run before deploying to verify configuration:

```bash
chmod +x scripts/pre-deploy-check.sh
./scripts/pre-deploy-check.sh
```

---

## 1. Fresh Deployment Steps

### 1.1 Backend

```bash
cd backend
cp .env.example .env
php artisan key:generate
```

Configure `.env`:

| Variable | Production Value |
|---------|------------------|
| `APP_ENV` | `production` |
| `APP_DEBUG` | `false` |
| `APP_URL` | `https://api.yourdomain.com` |
| `FRONTEND_URL` | `https://yourdomain.com` |
| `DB_CONNECTION` | `pgsql` |
| `DB_HOST` | Your DB host |
| `DB_DATABASE` | `resourceflow` |
| `DB_USERNAME` | Your DB user |
| `DB_PASSWORD` | Your DB password |
| `PAYSTACK_PUBLIC_KEY` | Live key |
| `PAYSTACK_SECRET_KEY` | Live key |
| `QOREID_SECRET_KEY` | Ghana Card verification (optional) |

```bash
# Fresh database: drops all tables, runs migrations, seeds Super Admin only
php artisan migrate:fresh --seed --force

# Or use the deploy script:
chmod +x scripts/deploy.sh
./scripts/deploy.sh
# Options: --backend-only, --frontend-only, --skip-db
# For fresh DB: run ./scripts/setup-database.sh first
```

### 1.2 Frontend

```bash
cd frontend
cp .env.example .env
```

Configure `.env`:

| Variable | Value |
|---------|-------|
| `VITE_API_BASE_URL` | `https://api.yourdomain.com/api` |
| `VITE_PAYSTACK_PUBLIC_KEY` | Paystack live public key |

```bash
npm ci
npm run build
```

Deploy the `frontend/dist/` folder to your static host.

---

## 2. Key Accounts
- **Super Admin** (admin role): Full application access – verification center, resource allocation, user management, financial reports, transparency log.
- **Auditor**: Document verification, audit logs, NGO verification, valuation review.


## 3. Web Server Configuration

### Nginx (Backend)

```nginx
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;
    root /var/www/resourceflow/backend/public;

    index index.php;
    charset utf-8;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }
}
```

### Nginx (Frontend – SPA)

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

### Paystack Webhook

Add to Paystack Dashboard → Webhooks:

```
https://api.yourdomain.com/api/payments/paystack-webhook
```

---

## 4. Database Setup Script

```bash
chmod +x scripts/setup-database.sh
./scripts/setup-database.sh --fresh
```

Options: `--fresh` (default), `--migrate` (migrations only), `--seed-only` (re-seed users). See [DATABASE_SETUP.md](DATABASE_SETUP.md) for details.

---

## 5. Environment Checklist

### Backend (.env)

- [ ] `APP_ENV=production`
- [ ] `APP_DEBUG=false`
- [ ] `APP_KEY` set
- [ ] `APP_URL` and `FRONTEND_URL` correct
- [ ] `SANCTUM_STATEFUL_DOMAINS` includes frontend domain (e.g. `yourdomain.com,www.yourdomain.com`)
- [ ] `CORS_ORIGINS` (optional) – comma-separated if using multiple frontend domains
- [ ] Database credentials
- [ ] Paystack live keys
- [ ] `QOREID_SECRET_KEY` (optional) – for Ghana Card verification

### Frontend (.env)

- [ ] `VITE_API_BASE_URL` points to backend API (e.g. `https://api.yourdomain.com/api`)
- [ ] `VITE_PAYSTACK_PUBLIC_KEY` set

---

## 6. Security

- **30-day password expiry**: All users must change their password every 30 days. Expired passwords block login until changed.
- Never commit `.env` files
- Use HTTPS everywhere
- Rotate `APP_KEY` and API keys if compromised
- Restrict database access to the app server

---

## 7. Post-Deployment

1. Log in as Super Admin
2. Change password
3. Add users via registration or admin tools
4. Configure Paystack webhook
5. Test a monetary donation flow
