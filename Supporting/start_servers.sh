#!/bin/bash

# Script to start both Laravel backend and React frontend servers
# Press Ctrl+C to stop both servers

cd "$(dirname "$0")"

echo "=========================================="
echo "Starting ResourceFlow Servers"
echo "=========================================="
echo ""

# Function to cleanup background processes on exit
cleanup() {
    echo ""
    echo "Stopping servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit
}

trap cleanup SIGINT SIGTERM

# Start Laravel backend server
echo "🚀 Starting Laravel backend server..."
cd backend
php artisan serve > /dev/null 2>&1 &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 2

# Start React frontend server
echo "🚀 Starting React frontend server..."
cd frontend
npm run dev > /dev/null 2>&1 &
FRONTEND_PID=$!
cd ..

# Wait a moment for frontend to start
sleep 3

echo ""
echo "=========================================="
echo "✅ Servers are starting!"
echo "=========================================="
echo ""
echo "📍 Backend API:  http://localhost:8000"
echo "📍 Frontend App: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Wait for user interrupt
wait
