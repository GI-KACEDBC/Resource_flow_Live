# ResourceFlow Frontend Prototype

This is a small Vite + React + TypeScript prototype demonstrating the Urgency Determination Engine in real-time.

Setup

1. Install dependencies

```bash
cd frontend
npm install
```

2. Run dev server

```bash
npm run dev
```

Open the URL printed by Vite (default http://localhost:5173) to interact with the Urgency Calculator.

Notes

- The calculation logic is in `src/services/urgencyCalculator.ts` and mirrors the backend algorithm.
- Components: `UrgencyCalculator` renders interactive controls; `UrgencyVisualization` shows the score, level, and breakdown.

This is a UI prototype; for full backend integration call the Laravel API endpoints under `/api/urgency` to compute/save results server-side.
