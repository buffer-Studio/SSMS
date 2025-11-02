# SSMS (School Schedule Management System)

## 🚀 Quick Start

### Start the Application
```bash
./start.sh
```
This will start both the FastAPI backend (port 8000) and React frontend (port 3000).

### Stop the Application
```bash
./stop.sh
```
This will gracefully stop all running processes and free up the ports.

## 📋 Available Scripts

### `start.sh`
- Starts the complete SSMS application
- Automatically installs dependencies if needed
- Activates Python virtual environment
- Provides real-time status and process information
- Accessible at:
  - Frontend: http://localhost:3000
  - Backend API: http://localhost:8000
  - API Docs: http://localhost:8000/docs

### `stop.sh`
- Stops all SSMS-related processes
- Kills processes by port (8000, 3000, etc.)
- Terminates Python and Node.js processes
- Cleans up project-related background processes
- Provides detailed status feedback

## 🔧 Manual Control

### Backend Only
```bash
cd backend
# Activate virtual environment if available
source venv/bin/activate  # or source .venv/bin/activate
pip install -r requirements.txt
python server.py
```

### Frontend Only
```bash
cd frontend
npm install
npm start
```

## 📊 Process Management

The scripts handle:
- ✅ Port conflict detection
- ✅ Graceful process termination
- ✅ Virtual environment activation
- ✅ Dependency installation
- ✅ Process monitoring and logging
- ✅ Clean shutdown procedures

## 🛑 Emergency Stop

If processes don't stop gracefully:
```bash
# Force kill all related processes
pkill -f "python.*server.py"
pkill -f "react-scripts"
pkill -f "uvicorn"
```

## 🌐 URLs

- **Application**: http://localhost:3000
- **API Documentation**: http://localhost:8000/docs
- **API Base**: http://localhost:8000/api

## 📝 Notes

- Ensure ports 8000 and 3000 are available before starting
- The application uses SQLite database (`backend/ssms.db`)
- Static files are served from the React build in production
