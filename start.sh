#!/bin/bash
set -e  # Exit on any error

echo "Checking system installations..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js 16+."
    exit 1
fi
echo "Node.js version: $(node --version)"

# Check npm or bun
if command -v bun &> /dev/null; then
    PACKAGE_MANAGER="bun"
    echo "Using bun for package management."
elif command -v npm &> /dev/null; then
    PACKAGE_MANAGER="npm"
    echo "Using npm for package management."
else
    echo "Neither bun nor npm is installed. Please install a package manager."
    exit 1
fi

# Check Python
if ! command -v python &> /dev/null; then
    echo "Python is not installed. On Arch Linux, install with: pacman -S python"
    exit 1
fi
echo "Python version: $(python --version)"

# Check pip
if ! command -v pip &> /dev/null; then
    echo "pip is not installed. On Arch Linux, install with: pacman -S python-pip"
    exit 1
fi

echo "Assuming dependencies are installed manually."

# Check if services are already running
if [ -f backend.pid ] && kill -0 $(cat backend.pid) 2>/dev/null; then
    echo "Backend already running (PID: $(cat backend.pid)). Skipping start."
else
    echo "Starting backend server..."
    cd backend
    uvicorn server:app --host 127.0.0.1 --port 8080 &
    BACKEND_PID=$!
    echo $BACKEND_PID > backend.pid
    echo "Backend started with PID: $BACKEND_PID"
fi

if [ -f frontend.pid ] && kill -0 $(cat frontend.pid) 2>/dev/null; then
    echo "Frontend already running (PID: $(cat frontend.pid)). Skipping start."
else
    echo "Starting frontend server..."
    cd frontend
    if [ "$PACKAGE_MANAGER" = "bun" ]; then
        bun start &
    else
        npm start &
    fi
    FRONTEND_PID=$!
    echo $FRONTEND_PID > frontend.pid
    echo "Frontend started with PID: $FRONTEND_PID"
fi

echo "Services started successfully."
echo "Backend: http://127.0.0.1:8080"
echo "Frontend: http://localhost:4040"
