# ResourceFlow – Database Setup

For full deployment instructions, see **[DEPLOYMENT.md](DEPLOYMENT.md)**.

---

## Quick Reference

### Fresh Deploy (clears all data, creates Super Admin + Auditor)

```bash
./scripts/setup-database.sh --fresh
# or
cd backend && php artisan migrate:fresh --seed --force
```

### Migrations Only (no seed)

```bash
./scripts/setup-database.sh --migrate
# or
cd backend && php artisan migrate --force
```

### Seed Only (re-seed users without dropping tables)

```bash
./scripts/setup-database.sh --seed-only
# or
cd backend && php artisan db:seed --force
```

### Create Database (PostgreSQL)

```bash
createdb -U postgres resourceflow
```

### Configure .env

```env
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=resourceflow
DB_USERNAME=postgres
DB_PASSWORD=your_password
```

---

## User Schema (consolidated)

The `users` table is created in a single migration with:

- Core: name, email, password, role, organization, address, phone
- Verification: is_verified, is_blocked, verified_at, verification_status, verified_by, ghana_card
- Staff: permissions, custom_role_name (for special roles)
- Password expiry: password_changed_at
- Reputation: reputation_score

---

## Default Accounts 

| Role | Email | Password |
|------|-------|----------|
| Super Admin | superadmin@resourceflow.com | See DEPLOYMENT.md |
| Auditor | auditor@resourceflow.com | See DEPLOYMENT.md |

---

## Verify Verification Documents

```bash
cd backend
php artisan verification:check-documents
```

Shows total count and sample of recent documents. When `QOREID_SECRET_KEY` is not configured, Ghana Card uploads are saved for manual review.
