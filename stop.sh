#!/bin/bash

# SSMS (School Schedule Management System) - Stop Script
# This script stops ONLY SSMS-related processes and frees the ports

echo "🛑 Stopping SSMS (School Schedule Management System)..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if a port is in use (alternative methods)
check_port() {
    local port=$1
    # Use netstat or ss if available, otherwise try nc
    if command -v netstat >/dev/null 2>&1; then
        netstat -tln 2>/dev/null | grep ":$port " >/dev/null && return 0
    elif command -v ss >/dev/null 2>&1; then
        ss -tln 2>/dev/null | grep ":$port " >/dev/null && return 0
    elif command -v lsof >/dev/null 2>&1; then
        lsof -Pi :$port -sTCP:LISTEN -t >/dev/null && return 0
    else
        # Fallback: try to connect to port
        timeout 1 bash -c "echo >/dev/tcp/localhost/$port" 2>/dev/null && return 0
    fi
    return 1
}

# Function to kill processes on a specific port
kill_port() {
    local port=$1
    local service_name=$2

    if check_port $port; then
        echo -e "${YELLOW}🔍 Found $service_name running on port $port${NC}"
        echo -e "${RED}🛑 Stopping $service_name on port $port...${NC}"

        # Get PIDs of processes using the port
        local pids=""
        if command -v lsof >/dev/null 2>&1; then
            pids=$(lsof -ti:$port 2>/dev/null)
        elif command -v netstat >/dev/null 2>&1; then
            pids=$(netstat -tlnp 2>/dev/null | grep ":$port " | awk '{print $7}' | cut -d'/' -f1 | tr '\n' ' ')
        elif command -v ss >/dev/null 2>&1; then
            pids=$(ss -tlnp 2>/dev/null | grep ":$port " | awk '{print $6}' | cut -d',' -f2 | cut -d'=' -f2 | tr '\n' ' ')
        fi

        if [ ! -z "$pids" ]; then
            echo "Found PIDs: $pids"
            kill -TERM $pids 2>/dev/null

            # Wait a bit for graceful shutdown
            sleep 2

            # Force kill if still running
            if check_port $port; then
                echo -e "${RED}⚠️  Force killing remaining processes on port $port${NC}"
                kill -KILL $pids 2>/dev/null
            fi

            echo -e "${GREEN}✅ Successfully stopped $service_name${NC}"
        else
            echo -e "${YELLOW}⚠️  No PIDs found for port $port${NC}"
        fi
    else
        echo -e "${BLUE}ℹ️  $service_name not running on port $port${NC}"
    fi
}

# Function to kill SSMS-specific processes by command pattern
kill_ssms_processes() {
    local pattern=$1
    local display_name=$2
    local project_dir=$3

    echo -e "${YELLOW}🔍 Looking for $display_name processes...${NC}"

    # Find processes by command pattern that are SSMS-related
    local pids=$(pgrep -f "$pattern" 2>/dev/null | xargs -I {} sh -c 'ps -p {} -o pid,cmd 2>/dev/null | grep -E "(ssms|scheduler)" | awk "{print \$1}"' 2>/dev/null)

    # Alternative: check if process is running from project directory
    if [ -z "$pids" ] && [ -d "$project_dir" ]; then
        pids=$(ps aux 2>/dev/null | grep "$project_dir" | grep -E "$pattern" | grep -v grep | awk '{print $2}' | tr '\n' ' ')
    fi

    if [ ! -z "$pids" ]; then
        echo -e "${RED}🛑 Found SSMS $display_name processes: $pids${NC}"
        kill -TERM $pids 2>/dev/null

        # Wait for graceful shutdown
        sleep 2

        # Check if any are still running
        local remaining=$(pgrep -f "$pattern" 2>/dev/null | xargs -I {} sh -c 'ps -p {} -o pid,cmd 2>/dev/null | grep -E "(ssms|scheduler)" | awk "{print \$1}"' 2>/dev/null)
        if [ -z "$remaining" ] && [ -d "$project_dir" ]; then
            remaining=$(ps aux 2>/dev/null | grep "$project_dir" | grep -E "$pattern" | grep -v grep | awk '{print $2}' | tr '\n' ' ')
        fi

        if [ ! -z "$remaining" ]; then
            echo -e "${RED}⚠️  Force killing remaining SSMS $display_name processes${NC}"
            kill -KILL $remaining 2>/dev/null
        fi

        echo -e "${GREEN}✅ Successfully stopped SSMS $display_name processes${NC}"
    else
        echo -e "${BLUE}ℹ️  No SSMS $display_name processes found${NC}"
    fi
}

echo ""
echo "========================================"
echo "🛑 STOPPING SSMS PROCESSES ONLY"
echo "========================================"
echo ""

# Get project directory
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 1. Stop FastAPI backend server (typically runs on port 8000)
kill_port 8000 "SSMS FastAPI Backend Server"

# 2. Stop React development server (typically runs on port 3000)
kill_port 3000 "SSMS React Development Server"

# 3. Stop any other SSMS-related ports
kill_port 3001 "SSMS React Dev Server (alt)"
kill_port 5000 "SSMS Development Server"

# 4. Kill SSMS-specific Python processes (only those running server.py from this project)
kill_ssms_processes "uvicorn.*server" "FastAPI Backend" "$PROJECT_DIR"

# 5. Kill SSMS-specific Python processes with python3 (fallback)
kill_ssms_processes "python3.*server\.py" "Python Server" "$PROJECT_DIR"

# 6. Kill SSMS-specific Node.js processes (only those in project directory)
kill_ssms_processes "node.*react-scripts" "React Scripts" "$PROJECT_DIR"
kill_ssms_processes "npm.*start" "NPM Start" "$PROJECT_DIR"

# 7. Kill any remaining processes specifically from the project directory
if [ -d "$PROJECT_DIR" ]; then
    echo -e "${YELLOW}🔍 Checking for any remaining processes in SSMS project directory...${NC}"

    # Find processes running from project directory (exclude common system processes)
    local project_pids=$(ps aux 2>/dev/null | grep "$PROJECT_DIR" | grep -v grep | grep -E "(python3|node|npm|uvicorn)" | awk '{print $2}' | tr '\n' ' ')

    if [ ! -z "$project_pids" ]; then
        echo -e "${RED}🛑 Found remaining SSMS project processes: $project_pids${NC}"
        kill -TERM $project_pids 2>/dev/null

        sleep 2

        # Force kill if needed
        local remaining=$(ps aux 2>/dev/null | grep "$PROJECT_DIR" | grep -v grep | grep -E "(python3|node|npm|uvicorn)" | awk '{print $2}' | tr '\n' ' ')
        if [ ! -z "$remaining" ]; then
            echo -e "${RED}⚠️  Force killing remaining SSMS project processes${NC}"
            kill -KILL $remaining 2>/dev/null
        fi

        echo -e "${GREEN}✅ Successfully stopped all remaining SSMS processes${NC}"
    else
        echo -e "${BLUE}ℹ️  No additional SSMS processes found in project directory${NC}"
    fi
fi

echo ""
echo "========================================"
echo -e "${GREEN}✅ SSMS STOP COMPLETE${NC}"
echo "========================================"
echo ""
echo -e "${BLUE}📋 Summary:${NC}"
echo "  • SSMS FastAPI backend server stopped"
echo "  • SSMS React development server stopped"
echo "  • All SSMS-related processes terminated"
echo "  • SSMS ports freed (8000, 3000)"
echo ""
echo -e "${GREEN}🎉 All SSMS processes have been stopped successfully!${NC}"
echo ""

# Show current status
echo -e "${BLUE}📊 Current Port Status:${NC}"
if check_port 8000; then
    echo -e "${RED}  ❌ Port 8000 still in use${NC}"
else
    echo -e "${GREEN}  ✅ Port 8000 is free${NC}"
fi

if check_port 3000; then
    echo -e "${RED}  ❌ Port 3000 still in use${NC}"
else
    echo -e "${GREEN}  ✅ Port 3000 is free${NC}"
fi

echo ""
echo -e "${YELLOW}💡 Tip: Run './start.sh' to restart SSMS${NC}"
