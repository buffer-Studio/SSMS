#!/bin/bash
set -e  # Exit on any error

echo "Stopping all services..."

# Kill backend if PID file exists
if [ -f backend.pid ]; then
    BACKEND_PID=$(cat backend.pid)
    if kill -0 $BACKEND_PID 2>/dev/null; then
        kill $BACKEND_PID
        echo "Backend process (PID: $BACKEND_PID) killed."
    else
        echo "Backend process (PID: $BACKEND_PID) not running."
    fi
    rm -f backend.pid
else
    echo "No backend PID file found."
fi

# Kill frontend if PID file exists
if [ -f frontend.pid ]; then
    FRONTEND_PID=$(cat frontend.pid)
    if kill -0 $FRONTEND_PID 2>/dev/null; then
        kill $FRONTEND_PID
        echo "Frontend process (PID: $FRONTEND_PID) killed."
    else
        echo "Frontend process (PID: $FRONTEND_PID) not running."
    fi
    rm -f frontend.pid
else
    echo "No frontend PID file found."
fi

echo "All services stopped."
