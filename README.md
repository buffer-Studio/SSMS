# School Scheduling Management System (SSMS)

> A modern, feature-rich web application for managing school timetables with real-time updates, notifications, and comprehensive admin controls.

[![React](https://img.shields.io/badge/React-19-61dafb?logo=react)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.13-3776ab?logo=python)](https://www.python.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?logo=tailwind-css)](https://tailwindcss.com/)

---

## ✨ Features at a Glance

🔐 **Secure Authentication** - JWT-based auth with password history tracking  
📅 **Smart Scheduling** - Comprehensive timetable management with conflict detection  
🔔 **Real-time Notifications** - Instant alerts for schedule and password changes  
📝 **Change Tracking** - Complete audit trail with beautiful changelog UI  
🎨 **Modern UI** - Responsive design with dark mode and smooth animations  
🌐 **Network Ready** - Auto-detects local/network access for seamless deployment  
👥 **Role-Based Access** - Separate admin and teacher interfaces  
📊 **Data Export** - CSV export and QR code generation  

---

## 🚀 Quick Start

### Prerequisites
- Python 3.13+
- Node.js 18+
- npm or yarn

### Backend Setup
```bash
cd SSMS/backend
pip install -r requirements.txt
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup
```bash
cd SSMS/frontend
npm install
npm start
```

### Access the Application
- **Local**: http://localhost:3000
- **Network**: http://YOUR_IP:3000
- **API Docs**: http://localhost:8000/docs

---

## 🎯 Core Features

### For Administrators
- ✅ Complete schedule management (5 days × 8 periods)
- ✅ User account management with role assignment
- ✅ Teacher designation system with locking
- ✅ Break period configuration
- ✅ Schedule change request approval
- ✅ Real-time notifications
- ✅ Change log tracking
- ✅ CSV data export
- ✅ Dark mode support

### For Teachers
- ✅ Personalized timetable view
- ✅ Schedule change notifications
- ✅ Changelog access
- ✅ Password management
- ✅ QR code for quick access
- ✅ Schedule change requests
- ✅ Auto-scroll to content
- ✅ Mobile-responsive interface

---

## 🏗️ Architecture

### Tech Stack
**Frontend:**
- React 19 with Hooks
- Tailwind CSS + Shadcn/UI
- React Router v6
- Axios for API calls
- Sonner for toasts

**Backend:**
- FastAPI (Python 3.13)
- SQLite database (no setup required!)
- JWT authentication
- bcrypt password hashing
- slowapi rate limiting
- Pydantic validation

**Database:**
- SQLite with automatic migrations
- No external database server needed
- Built-in backup support

### Architecture Flow
```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   React     │  HTTP   │   FastAPI   │  SQLite │   Database  │
│  Frontend   ├────────>│   Backend   ├────────>│  (Built-in) │
│  (Port 3000)│ <──────┤  (Port 8000)│ <──────┤ (ssms_db)   │
└─────────────┘  JSON   └─────────────┘  Sync   └─────────────┘
       │
       │ JWT Authentication
       │ Auto-detection (Local/Network)
       │ React Router
       v
┌─────────────────────────────────────┐
│  User Roles:                         │
│  - Admin: Full CRUD operations       │
│  - Teacher: Read + Request changes   │
└─────────────────────────────────────┘
```

---

## 📦 Installation & Setup

### Prerequisites
- Node.js 18+ and npm
- Python 3.13+
- No external database needed! (SQLite built-in)

### Backend Setup

1. **Navigate to backend directory:**
```bash
cd SSMS/backend
```

2. **Install Python dependencies:**
```bash
pip install -r requirements.txt
```

3. **Configure environment variables:**
Create `.env` file (or use .env.example):
```env
JWT_SECRET_KEY="your-secret-key-here"
JWT_ALGORITHM="HS256"
JWT_EXPIRATION_MINUTES=1440
CORS_ORIGINS="*"
DEBUG=True
```

4. **Start the backend server:**
```bash
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

**Backend will be accessible at:**
- Local: http://127.0.0.1:8000
- Network: http://YOUR_IP:8000
- API Docs: http://127.0.0.1:8000/docs
### Frontend Setup

1. **Navigate to frontend directory:**
```bash
cd SSMS/frontend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure environment (optional):**
Create `.env` file:
```env
REACT_APP_BACKEND_URL=auto
REACT_APP_NETWORK_IP=YOUR_IP_HERE
WDS_SOCKET_PORT=443
```

4. **Start the development server:**
```bash
npm start
```

**Frontend will be accessible at:**
- Local: http://localhost:3000
- Network: http://YOUR_IP:3000

---

## 🎮 Usage

### Default Admin Credentials
- **Username**: `admin123`
- **Password**: Set during first login or database initialization

### Creating Your First Schedule

1. **Login as Admin**
2. Navigate to "Users" tab
3. Add teacher accounts
4. Go to "Schedules" tab
5. Click on any cell to assign a schedule
6. Teachers will see their schedules in real-time!

### Accessing from Other Devices

The application automatically detects whether you're accessing locally or over the network:

- **On your computer**: Use `http://localhost:3000`
- **On your phone/tablet**: Use `http://YOUR_COMPUTER_IP:3000`

The backend URL is automatically configured based on how you access the frontend!


## 📸 Screenshots

### Admin Dashboard
- Comprehensive schedule management
- User management with designations
- Change request approval
- Notification center

### Teacher Dashboard  
- Personal timetable view
- Beautiful changelog panel
- QR code access
- Password management

### Mobile Experience
- Fully responsive design
- Touch-optimized interface
- Auto-scroll to content
- Smooth animations

---

## 🔒 Security Features

- ✅ **JWT Authentication** - Secure token-based auth
- ✅ **Password Hashing** - bcrypt with salt
- ✅ **Password History** - Prevents reuse of last 5 passwords
- ✅ **Rate Limiting** - Protection against brute force
- ✅ **CORS Configuration** - Controlled cross-origin access
- ✅ **Input Validation** - Pydantic models
- ✅ **SQL Injection Prevention** - Parameterized queries

---

## 📁 Project Structure

```
SSMS/
├── backend/
│   ├── server.py              # Main FastAPI app
│   ├── database.py            # SQLite adapter with migrations
│   ├── config.py              # Configuration management
│   ├── exceptions.py          # Custom exception handlers
│   ├── logging_config.py      # Logging setup
│   ├── requirements.txt       # Python dependencies
│   ├── .env.example           # Environment template
│   └── ssms_database.db       # SQLite database (auto-created)
│
├── frontend/
│   ├── src/
│   │   ├── App.js             # Main React component
│   │   ├── config/
│   │   │   └── api.js         # Smart backend URL detection
│   │   ├── pages/
│   │   │   ├── HomePage.js
│   │   │   ├── LoginPage.js
│   │   │   ├── AdminDashboard.js
│   │   │   └── TeacherDashboard.js
│   │   └── components/
│   │       ├── TimetableGrid.js
│   │       ├── ChangeLogPanel.js
│   │       ├── QRCodeModal.js
│   │       ├── ChangePasswordModal.js
│   │       ├── NotificationPanel.js
│   │       ├── ScheduleChangeRequestModal.js
│   │       └── ui/            # Shadcn components
│   ├── package.json
│   └── .env                   # Environment config
│
├── FEATURES.md                # Complete feature list
├── README.md                  # This file
└── .gitignore                 # Git ignore rules
```

---

## 🛠️ API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/change-password` - Change password

### Users
- `GET /api/users` - List all users (Admin)
- `POST /api/users` - Create user (Admin)
- `DELETE /api/users/{id}` - Delete user (Admin)
- `PATCH /api/users/{id}/designation` - Update designation (Admin)

### Schedules
- `GET /api/schedules` - Get all schedules
- `POST /api/schedules` - Create/update schedule (Admin)
- `DELETE /api/schedules/{id}` - Delete schedule (Admin)
- `GET /api/schedules/export` - Export to CSV

### Notifications
- `GET /api/notifications` - Get notifications
- `PATCH /api/notifications/{id}/read` - Mark as read
- `DELETE /api/notifications/{id}` - Delete notification

### Changelogs
- `GET /api/changelogs` - Get change history

### Settings
- `GET /api/settings/break-period` - Get break config
- `PUT /api/settings/break-period` - Update break config (Admin)

Full API documentation: http://localhost:8000/docs

---

## � Troubleshooting

### Backend won't start
```bash
# Check if port 8000 is in use
netstat -ano | findstr :8000

# Kill the process if needed
taskkill /F /PID <PID>
```

### Frontend can't connect
- Check `.env` file has `REACT_APP_BACKEND_URL=auto`
- Verify backend is running on port 8000
- Check network IP is correct

### Database errors
- Delete `ssms_database.db` and restart backend
- Database will be recreated automatically
- Default admin account will be created

### Network access not working
- Ensure backend runs with `--host 0.0.0.0`
- Check firewall settings
- Verify IP address in `.env` file

---

## 📚 Documentation

- **API Documentation**: http://localhost:8000/docs (Swagger UI)
- **Alternative API Docs**: http://localhost:8000/redoc (ReDoc)
- **Features List**: See [FEATURES.md](FEATURES.md)

---

## 🤝 Contributing

This is a demonstration project. For improvements:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request


## 📄 License

This project is developed for educational and demonstration purposes.

---

## 👏 Acknowledgments

Built with modern web technologies:
- **FastAPI** - High-performance Python web framework
- **React** - Powerful UI library
- **Tailwind CSS** - Utility-first CSS framework
- **Shadcn/UI** - Beautiful component library
- **SQLite** - Reliable embedded database

---

## � Support

For issues or questions:
- Check the [FEATURES.md](FEATURES.md) documentation
- Review the API docs at http://localhost:8000/docs
- Consult the troubleshooting section above

---

## 🔮 Roadmap

See [FEATURES.md](FEATURES.md) for:
- ✅ Completed features
- 🚧 Planned improvements
- 💡 Future enhancement ideas

---

**Last Updated**: October 23, 2025  
**Version**: 2.0.0  
**Status**: Production Ready ✨

---

Made with ❤️ for modern school management

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
- Check if MongoDB Docker container is running: `docker ps | grep mongodb`
- Verify port 8000 is available
- Check MongoDB connection string in `.env` file
- Ensure Docker is installed and running

**MongoDB connection issues:**
- Restart MongoDB container: `docker restart mongodb`
- Check container logs: `docker logs mongodb`
- Verify authentication credentials in connection string

**Frontend won't connect:**
- Ensure backend is running on port 8000
- Check browser console for CORS errors
- Verify backend API endpoints are accessible
- Check frontend `.env` file has correct `REACT_APP_BACKEND_URL=http://127.0.0.1:8000`
- Restart frontend after changing `.env` file

**Login fails:**
- Verify MongoDB is running and accessible
- Check backend logs for initialization messages
- Ensure demo users were created during startup
- Try restarting the backend server

**Port conflicts:**
- Backend uses port 8000 (not 8001)
- Frontend uses port 3000
- MongoDB uses port 27017

**Port already in use error:**
- Kill existing uvicorn processes: `pkill -f uvicorn`
- Or find and kill specific process: `ps aux | grep uvicorn` then `kill [PID]`
- Check if port is free: `ss -tlnp | grep 8000`

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
