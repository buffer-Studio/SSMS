#!/bin/bash

# SSMS (School Schedule Management System) - Start Script
# This script starts the SSMS application with both backend and frontend

echo "🚀 Starting SSMS (School Schedule Management System)..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check if a port is in use (alternative to lsof)
check_port() {
    local port=$1
    # Use netstat or ss if available, otherwise try nc
    if command -v netstat >/dev/null 2>&1; then
        netstat -tln 2>/dev/null | grep ":$port " >/dev/null
    elif command -v ss >/dev/null 2>&1; then
        ss -tln 2>/dev/null | grep ":$port " >/dev/null
    else
        # Fallback: try to connect to port
        timeout 1 bash -c "echo >/dev/tcp/localhost/$port" 2>/dev/null
    fi
}

# Check if ports are available
echo -e "${BLUE}🔍 Checking port availability...${NC}"

if check_port 8000; then
    echo -e "${RED}❌ Port 8000 is already in use (FastAPI backend)${NC}"
    echo -e "${YELLOW}💡 Run './stop.sh' first to stop existing processes${NC}"
    exit 1
else
    echo -e "${GREEN}✅ Port 8000 is available${NC}"
fi

if check_port 3000; then
    echo -e "${RED}❌ Port 3000 is already in use (React frontend)${NC}"
    echo -e "${YELLOW}💡 Run './stop.sh' first to stop existing processes${NC}"
    exit 1
else
    echo -e "${GREEN}✅ Port 3000 is available${NC}"
fi

echo ""
echo "========================================"
echo "🚀 STARTING SSMS APPLICATION"
echo "========================================"
echo ""

# Check if we're in the right directory
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo -e "${RED}❌ Error: This script must be run from the SSMS project root directory${NC}"
    echo -e "${BLUE}Expected directories: backend/, frontend/${NC}"
    exit 1
fi

# Start backend server
echo -e "${BLUE}🔧 Starting FastAPI backend server...${NC}"
cd backend

# Check if virtual environment exists and activate it
if [ -d "venv" ]; then
    echo -e "${YELLOW}📦 Activating virtual environment...${NC}"
    source venv/bin/activate
elif [ -d ".venv" ]; then
    echo -e "${YELLOW}📦 Activating virtual environment...${NC}"
    source .venv/bin/activate
fi

# Install/update dependencies if needed
if [ ! -f "requirements.txt" ]; then
    echo -e "${RED}❌ requirements.txt not found in backend directory${NC}"
    exit 1
fi

echo -e "${YELLOW}📦 Installing/updating Python dependencies...${NC}"
pip install -r requirements.txt

# Start backend server in background
echo -e "${GREEN}🚀 Starting FastAPI server on port 8000...${NC}"
uvicorn server:app --host 127.0.0.1 --port 8000 --reload &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Check if backend started successfully
if check_port 8000; then
    echo -e "${GREEN}✅ Backend server started successfully (PID: $BACKEND_PID)${NC}"
else
    echo -e "${RED}❌ Failed to start backend server${NC}"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

cd ..

# Start frontend server
echo ""
echo -e "${BLUE}⚛️  Starting React frontend server...${NC}"
cd frontend

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ package.json not found in frontend directory${NC}"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing Node.js dependencies...${NC}"
    bun install
fi

# Start frontend server in background
echo -e "${GREEN}🚀 Starting React development server on port 3000...${NC}"
bun start &
FRONTEND_PID=$!

cd ..

echo ""
echo "========================================"
echo -e "${GREEN}✅ SSMS START COMPLETE${NC}"
echo "========================================"
echo ""
echo -e "${BLUE}📋 Services Started:${NC}"
echo -e "  • ${GREEN}FastAPI Backend${NC}: http://localhost:8000 (PID: $BACKEND_PID)"
echo -e "  • ${GREEN}React Frontend${NC}: http://localhost:3000 (PID: $FRONTEND_PID)"
echo ""
echo -e "${GREEN}🎉 SSMS is now running!${NC}"
echo ""
echo -e "${BLUE}🌐 Access your application:${NC}"
echo -e "  • Main Application: ${GREEN}http://localhost:3000${NC}"
echo -e "  • API Documentation: ${GREEN}http://localhost:8000/docs${NC}"
echo ""
echo -e "${YELLOW}💡 To stop the application, run: './stop.sh'${NC}"
echo ""
echo -e "${BLUE}📊 Process IDs:${NC}"
echo "  Backend PID: $BACKEND_PID"
echo "  Frontend PID: $FRONTEND_PID"
echo ""

# Save PIDs to a file for easy stopping
echo "$BACKEND_PID" > .ssms_pids
echo "$FRONTEND_PID" >> .ssms_pids

# Wait for user interrupt to stop
trap 'echo ""; echo -e "${YELLOW}🛑 Received interrupt signal...${NC}"; ./stop.sh; exit 0' INT

echo -e "${BLUE}🔄 Press Ctrl+C to stop all services${NC}"

# Keep the script running to show logs
wait
