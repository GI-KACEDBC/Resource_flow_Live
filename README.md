ResourceFlow Setup Guide
Authors: Elikplim Kwao Gbewonyo, Fred Akwei, Bryce Hansen

This project is a humanitarian aid and resource allocation platform focused on key deliverables including account registration, verification, and basic resource allocation, with:Backend: Laravel 10 (PHP) API – runs on http://localhost:8000Frontend: React 18 + Vite app – runs on http://localhost:5173.

Use this guide to run it on your laptop after unzipping.
Quick start (Windows): Open PowerShell in this folder and run .\setup.ps1 once to install everything. 
Then run .\run-backend.ps1 in one window and .\run-frontend.ps1 in another. 
Open http://localhost:5173 in your browser.Prerequisites (install these first)RequirementVersionCheck commandPHP8.2 or higherphp -vComposerLatestcomposer -VNode.js18 or higher (LTS recommended)node -vnpmComes with Node.jsnpm -vPostgreSQL14 or higherpsql -VPHP: https://windows.php.net/download/ – add PHP to your system PATH.
Composer: https://getcomposer.org/download/Node.js: https://nodejs.org/ – use the LTS version.PostgreSQL: https://www.postgresql.org/download/

Quick setup (first time)

1. Backend (Laravel)Open a terminal in the project root and run:PowerShellcd backend
Then run these commands one by one:PowerShell# Install PHP dependencies
composer install

# Create .env from .env.example if it doesn't exist
if (!(Test-Path .env)) { Copy-Item .env.example .env }

# Generate application key
php artisan key:generate

# Link storage for file uploads (Crucial for verification docs/receipts)
php artisan storage:link

# Run database migrations
php artisan migrate --force

# Seed demo data (NGOs, default users, projects)
php artisan db:seed --force
2. Frontend (React)Open a second terminal in the project root and run:PowerShellcd frontend
npm install
Running the appYou need two terminals (or use the provided .ps1 scripts).Terminal 1 – Backend (Laravel API)PowerShellcd backend
php artisan serve
Leave this running. You should see: Laravel development server started on http://localhost:8000.Terminal 2 – Frontend (React)PowerShellcd frontend
npm run dev
Leave this running. 
You should see the local URL, usually http://localhost:5173.Use the appOpen your browser and go to: http://localhost:5173The frontend talks to the API at http://localhost:8000/api (backend must be running).Using PostgreSQL (pgAdmin)

ResourceFlow is designed to use PostgreSQL.
In pgAdmin, create a new database (e.g., resourceflow).
In the project, open backend/.env and set:Code snippetDB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=resourceflow
DB_USERNAME=postgres
DB_PASSWORD=your_postgres_password

(Use your real database username and password).
From the backend folder run:PowerShellphp artisan migrate --force
php artisan db:seed --force
Tables and data will appear in your database in pgAdmin.Important: After changing DB_* variables in the .env file, you must restart the backend server (php artisan serve or run-backend.ps1). 
Otherwise, the app will fail to connect.Third-Party Integrations (.env Configuration)For full functionality (Payments and ID Verification), ensure these are set in your backend/.env and frontend/.env files:Paystack: PAYSTACK_PUBLIC_KEY and PAYSTACK_SECRET_KEYQoreID (Ghana Card): QOREID_CLIENT_ID and QOREID_SECRETFrontend API Target: VITE_AP

Database connection refusedEnsure PostgreSQL is running, verify your DB_* credentials in .env, and restart the backend server.Frontend can’t reach backendMake sure php artisan serve is running in the backend. Verify CORS configurations (SANCTUM_STATEFUL_DOMAINS and CORS_ORIGINS) in .env.Images/Uploads are brokenRun php artisan storage:link in the backend folder so the frontend can access stored files.Camera not working (Verification)Ensure your browser has granted camera permissions. Chrome requires localhost or HTTPS for webcam access.SummaryInstall PHP 8.2+, Composer, Node.js 18+, and PostgreSQL 14+.In backend: composer install, copy .env, php artisan key:generate, configure DB, php artisan storage:link, php artisan migrate, php artisan db:seed.In frontend: npm install.Run backend: cd backend → php artisan serve.Run frontend: cd frontend → npm run dev.

Open http://localhost:5173 in your browser.
Default login credentials
After running the database seeder (php artisan db:seed --force in the backend folder), you can log in with the following default accounts to test the applcation.

Role         Email                        Password
SuperAdmin   superadmin@resourceflow.com  svc_r3f70w-J3TM3ga
Auditor      auditor@resourceflow.com     svc_r3f70w-J3TM3ga
Driver       driver@resourceflow.com      svc_r3f70w-J3TM3ga
Recipient    recipient@resourceflow.com   svc_r3f70w-J3TM3ga
Donor        donor@resourceflow.com       svc_r3f70w-J3TM3ga
