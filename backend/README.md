# ResourceFlow - Resource Management System

A React + Laravel application for managing resource requests with an intelligent urgency calculation system.

## Features

- **Request Management**: Create, view, and manage resource requests
- **Urgency Calculation**: Automated urgency scoring based on multiple factors:
  - Need Criticality (30%)
  - Time Sensitivity (25%)
  - Recipient Vulnerability (20%)
  - Availability Gap (15%)
  - Admin Override (10%)
- **Real-time Preview**: See urgency calculations as you fill out the form
- **Request Dashboard**: View all requests sorted by urgency
- **Detailed Views**: Comprehensive request details with calculation breakdowns

## Tech Stack

### Frontend
- React 18
- TypeScript
- Vite
- React Router
- Tailwind CSS
- Lucide React (Icons)
- Axios

### Backend
- Laravel 10+
- PHP 8.2+
- SQLite (default, can be configured for PostgreSQL/MySQL)

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies (if you have a Laravel project):
```bash
composer install
```

3. Copy environment file:
```bash
cp .env.example .env
```

4. Generate application key:
```bash
php artisan key:generate
```

5. Create database file (for SQLite):
```bash
touch database/database.sqlite
```

6. Run migrations:
```bash
php artisan migrate
```

7. Start the Laravel development server:
```bash
php artisan serve
```

The backend will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment file (optional):
```bash
cp .env.example .env
```

4. Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

## API Endpoints

### Requests
- `GET /api/requests` - Get all requests
- `GET /api/requests/{id}` - Get a single request
- `POST /api/requests` - Create a new request
- `PUT /api/requests/{id}` - Update a request
- `DELETE /api/requests/{id}` - Delete a request

### Urgency Calculation
- `POST /api/urgency/calculate` - Calculate urgency score
- `GET /api/urgency/factors` - Get factor definitions
- `GET /api/urgency/scenarios` - Get demo scenarios
- `GET /api/urgency/formula` - Get calculation formula

## Project Structure

```
Resource_flow/
├── backend/
│   ├── app/
│   │   ├── Http/Controllers/Api/
│   │   │   ├── RequestController.php
│   │   │   └── UrgencyController.php
│   │   ├── Models/
│   │   │   └── Request.php
│   │   └── Services/
│   │       └── UrgencyCalculationService.php
│   ├── database/
│   │   ├── migrations/
│   │   └── seeders/
│   └── routes/
│       └── api.php
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   └── Navbar.tsx
│   │   │   └── urgency/
│   │   │       ├── UrgencyCalculator.tsx
│   │   │       └── UrgencyVisualization.tsx
│   │   ├── pages/
│   │   │   ├── RequestList.tsx
│   │   │   ├── RequestForm.tsx
│   │   │   └── RequestDetail.tsx
│   │   ├── services/
│   │   │   ├── api.ts
│   │   │   └── urgencyCalculator.ts
│   │   ├── types/
│   │   │   └── urgency.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
└── README.md
```

## Urgency Calculation

The urgency score is calculated using a weighted formula:

```
Score = (Criticality × 0.3) + (Time × 0.25) + (Vulnerability × 0.2) + (Availability × 0.15) + (Override × 0.1)
```

### Urgency Levels
- **Critical** (9.0-10.0): Response required < 6 hours
- **High** (7.0-8.9): Response required < 24 hours
- **Medium** (4.0-6.9): Response required < 72 hours
- **Low** (0.0-3.9): Response required > 72 hours

## Development Notes

- The frontend uses Vite's proxy to forward `/api` requests to the Laravel backend
- CORS is configured in `backend/config/cors.php` to allow requests from the frontend
- The urgency calculation logic is implemented both in the frontend (for preview) and backend (for persistence)

## License

This is a prototype project for demonstration purposes.

