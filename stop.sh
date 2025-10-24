#!/bin/bash

echo "Stopping all services..."

# Kill backend (uvicorn)
pkill -f uvicorn
if [ $? -eq 0 ]; then
    echo "Backend processes killed."
else
    echo "No backend processes found."
fi

# Kill frontend (craco start, which is used in package.json)
pkill -f "craco start"
if [ $? -eq 0 ]; then
    echo "Frontend processes killed."
else
    echo "No frontend processes found."
fi

# Also kill any remaining node processes if needed
pkill -f node
if [ $? -eq 0 ]; then
    echo "Additional node processes killed."
fi

# Kill on specific ports if processes persist
# Backend port 8080
if command -v fuser &> /dev/null; then
    fuser -k 8080/tcp 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "Killed processes on port 8080."
    fi
else
    echo "fuser not available. On Arch Linux, install with: pacman -S psmisc"
fi

# Frontend port 4040
if command -v fuser &> /dev/null; then
    fuser -k 4040/tcp 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "Killed processes on port 4040."
    fi
else
    echo "fuser not available. On Arch Linux, install with: pacman -S psmisc"
fi

echo "All services stopped."
