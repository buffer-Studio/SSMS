# School Scheduling Management System

## Overview
A minimalistic yet impressive web-based scheduling management system designed for high school exhibitions. The application allows administrators to manage class timetables in real-time while teachers can view their personalized schedules with instant update notifications.

## 🎯 Core Features:

### For Administrators
- **Complete Schedule Management**: Create, edit, and delete teacher schedules across 5 working days (Monday-Friday) and 8 periods per day
- **Teacher Account Management**: Add and manage teacher accounts with secure authentication
- **Break Period Configuration**: Toggle break periods between Period 3 and Period 4 (simulating half-yearly changes)
- **Conflict Detection**: Automatically prevent double-booking and scheduling conflicts
- **Real-time Update Tracking**: All schedule changes are logged with timestamps and admin attribution

### For Teachers
- **Personalized Timetable View**: Clean, organized display of weekly schedule
- **Change Notifications**: Orange-highlighted cells indicate schedule modifications within the last 24 hours
- **Change Log Panel**: View detailed history of recent schedule updates
- **Manual Refresh**: Refresh button to check for latest updates (simulates real-time in exhibition demo)
- **Dark Mode Support**: Toggle between light and dark themes

### Exhibition Features
- **Exhibition Mode Toggle**: Special badge display for demonstration purposes
- **QR Code Quick Login**: Mock QR-based authentication demo (shows concept for production)
- **Clean, Professional UI**: Minimalistic design with smooth animations and transitions
- **Responsive Layout**: Works seamlessly on desktop and mobile devices

## 🏗️ System Architecture

### Tech Stack
**Frontend:**
- React 19.x - Modern UI framework
- React Router - Client-side routing
- Tailwind CSS - Utility-first styling
- Shadcn/UI - Pre-built component library
- Axios - HTTP client

**Backend:**
- FastAPI - High-performance Python web framework
- SQLAlchemy - SQL toolkit and ORM
- PyJWT - JWT token authentication
- Passlib - Password hashing
- Pydantic - Data validation

**Database:**
- SQLite - Lightweight SQL database

### Architecture Flow
```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   React     │  HTTP   │   FastAPI   │  Async  │   SQLite    │
│  Frontend   ├────────>│   Backend   ├────────>│   Database  │
│ (Port 4040) │ <──────┤ (Port 8080) │ <──────┤ (File-based) │
└─────────────┘  JSON   └─────────────┘  SQLAlchemy └─────────────┘
       │
       │ JWT Authentication
       │ State Management
       │ Routing
       v
┌─────────────────────────────────────┐
│  User Roles:                         │
│  - Admin: Full CRUD operations       │
│  - Teacher: Read-only schedule view  │
└─────────────────────────────────────┘
```

## 📦 Installation & Setup

### Prerequisites
- Node.js 16+ and npm/bun
- Python 3.11+

### Backend Setup

1. **Navigate to backend directory:**
```bash
cd backend
```

2. **Install Python dependencies:**
```bash
pip install -r requirements.txt
```

3. **Configure environment variables:**
The `.env` file should contain:
```
DATABASE_URL="sqlite+aiosqlite:///school_schedule.db"
CORS_ORIGINS="*"
JWT_SECRET_KEY="school-schedule-secret-key-2025"
```

4. **Start the backend server:**
```bash
uvicorn server:app --host 127.0.0.1 --port 8080
```

The backend will be available at `http://127.0.0.1:8080`
API documentation: `http://127.0.0.1:8080/docs`

### Frontend Setup

1. **Navigate to frontend directory:**
```bash
cd frontend
```

2. **Install dependencies:**
```bash
npm install
# or if you prefer bun:
bun install
```

3. **Start the frontend development server:**
```bash
npm start
# or:
bun start
```

The application will open at `http://localhost:4040`

### Quick Start (All-in-One)

Run these commands in separate terminal windows:

**Terminal 1 - Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --host 127.0.0.1 --port 8080
```

**Terminal 2 - Frontend:**
```bash
cd frontend
bun install
bun start
```

### Verification

1. **Check Backend:** Visit `http://127.0.0.1:8080/docs`
2. **Check Frontend:** Visit `http://localhost:4040`

## 👥 Demo Accounts

### Administrator Account
```
Username: admin123
Password: password123
```

### Teacher Accounts
```
Teacher 1: t_sagnik / pass123 (Sagnik Sir)
Teacher 2: t_nadeem / pass123 (Nadeem Sir)
Teacher 3: t_prinshu / pass123 (Prinshu Sir)
Teacher 4: t_abhishek / pass123 (Abhishek Sir)
```

## 🎭 Exhibition Mode

Toggle exhibition mode from the homepage to showcase the system with:
- Floating badge indicating demo mode
- QR code login demonstration
- Optimized for presentation on large screens

## 🚀 Usage Guide

### Admin Workflow
1. Login with admin credentials
2. Navigate to "Schedules" tab
3. Select a teacher from dropdown
4. Click empty cells to add schedule entries
5. Click existing entries to edit or delete
6. Switch to "Teachers" tab to manage accounts
7. Adjust break period in "Settings" tab

### Teacher Workflow
1. Login with teacher credentials
2. View personalized timetable automatically
3. Orange highlights show recent changes
4. Check change log panel for details
5. Use refresh button to get latest updates

## 🎯 Exhibition Presentation Strategy

### Demo Script
1. Show homepage with Exhibition Mode toggle
2. Login as admin, add a schedule entry
3. In another window, login as teacher
4. Refresh teacher view to show the change
5. Demonstrate orange highlight and change log
6. Show break period configuration
7. Display QR code demo modal

## 📝 Key Features Explained

### Break Period System
- Can be positioned after Period 3 or Period 4
- Admin can toggle this in Settings tab
- Simulates half-yearly schedule adjustments
- Automatically displayed in timetable grid

### Change Tracking
- Every schedule edit creates a changelog entry
- Teachers see orange highlights for 24 hours
- Detailed change log shows old vs new values
- Tracks which admin made the change

### Conflict Detection
- Prevents double-booking of classrooms
- Checks if class already has a lesson at that time
- Shows clear error message when conflict detected

## 🔒 Security Features

- JWT Authentication with 7-day token expiration
- Bcrypt password hashing
- Role-based access control
- Protected API endpoints
- CORS configuration

## 🎨 Design Philosophy

**Minimalistic & Professional:**
- Clean light theme with soft gradients
- Academic color palette (blue, gray, orange)
- Space Grotesk for headings, Inter for body text
- Glass-morphism effects for depth
- Smooth transitions and animations

## 🔧 Troubleshooting

**Backend won't start:**
- Verify port 8080 is available
- Check SQLite database file path in `.env` file
- Ensure all Python dependencies are installed

**Database connection issues:**
- Check if the SQLite database file exists in the backend directory
- Verify DATABASE_URL in `.env` file is correct
- Restart the backend server

**Frontend won't connect:**
- Ensure backend is running on port 8080
- Check browser console for CORS errors
- Verify backend API endpoints are accessible
- Check frontend `.env` file has correct `REACT_APP_BACKEND_URL=http://127.0.0.1:8080`
- Restart frontend after changing `.env` file

**Login fails:**
- Check backend logs for initialization messages
- Ensure demo users were created during startup
- Try restarting the backend server

**Port conflicts:**
- Backend uses port 8080
- Frontend uses port 4040

**Port already in use error:**
- Kill existing uvicorn processes: `pkill -f uvicorn`
- Or find and kill specific process: `ps aux | grep uvicorn` then `kill [PID]`
- Check if port is free: `ss -tlnp | grep 8080`

## 📄 API Endpoints

### Authentication
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/verify` - Verify token

### Users (Admin only)
- `GET /api/users` - List all users
- `POST /api/users` - Create new user
- `DELETE /api/users/{user_id}` - Delete user

### Schedules
- `GET /api/schedules` - Get schedules
- `POST /api/schedules` - Create schedule (Admin)
- `PUT /api/schedules/{schedule_id}` - Update schedule (Admin)
- `DELETE /api/schedules/{schedule_id}` - Delete schedule (Admin)

### Settings
- `GET /api/settings/break-period` - Get break config
- `PUT /api/settings/break-period` - Update break position (Admin)

### Changelogs
- `GET /api/changelogs` - Get change history

## 🙏 Credits

**Created by Yuvraj, Supriyo & Naman**

This project showcases modern full-stack web development, user experience design, and practical problem-solving for educational institutions.

---

**Status:** Exhibition Demo Ready
