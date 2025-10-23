# Changelog

All notable changes to the School Scheduling Management System (SSMS) project.

## [2.0.0] - 2025-10-23

### 🎉 Major Release - Complete Overhaul

### Added

#### Authentication & Security
- JWT-based authentication with secure token handling
- Password change functionality with comprehensive validation
- Password history tracking (last 5 passwords) to prevent reuse
- Rate limiting on login endpoint (5 attempts per minute)
- bcrypt password hashing for secure storage
- Pydantic field validators for password_history JSON parsing

#### User Management
- Teacher designation system (e.g., "Mathematics tr", "Computer tr")
- Designation locking/unlocking by admins
- Enhanced user CRUD operations
- User listing with role-based filtering

#### Notifications
- Real-time notification system
- Notification categories (password changes, schedule updates, admin actions)
- Read/unread status tracking
- Notification count badge
- Bulk and individual mark-as-read
- Delete notification functionality

#### Schedule Features
- Schedule change request system
- Request approval workflow for admins
- Request history tracking
- Enhanced changelog panel with beautiful slide-up animation
- Toggle button for changelog access
- Auto-close on backdrop click

#### UI/UX Improvements
- Complete responsive redesign for mobile devices
- Dark mode support with smooth transitions
- Green gradient theme (emerald-to-teal)
- Auto-scroll to timetable content on page load
- Smooth animations throughout (fade-ins, slide-ins)
- Loading states for all operations
- Toast notifications with Sonner
- Equal-sized timetable cells for professional appearance

#### Network & Deployment
- Dual access support (localhost + network simultaneously)
- Auto-detection system for backend URL
- Smart frontend configuration based on hostname
- Backend binding to 0.0.0.0 for network accessibility
- Environment-based configuration with .env files

#### Technical Enhancements
- SQLite database with automatic migrations
- Database schema updates with ALTER TABLE support
- Structured logging with detailed error tracking
- Comprehensive error handling
- API documentation with Swagger/ReDoc
- Code organization improvements
- Field validators for complex data types

#### Data Management
- CSV export functionality
- QR code generation for teacher schedules
- Improved data portability

### Changed
- Migrated from MongoDB to SQLite (no external database required)
- Updated React to version 19
- Modernized component structure with Shadcn/UI
- Improved API response formats
- Enhanced error messages
- Optimized database queries

### Removed
- Exhibition Mode (completely removed as requested)
- MongoDB dependencies
- Unnecessary complexity in changelog display

### Fixed
- Password history column missing error
- Table horizontal overflow issues
- Changelog not displaying as button
- Auto-scroll scrolling too far down
- Network access issues from mobile devices
- Login validation errors with password_history field
- CORS configuration for network access

### Security
- Added rate limiting to prevent brute force attacks
- Implemented password reuse prevention
- Enhanced JWT token security
- Improved input validation across all endpoints

---

## [1.0.0] - 2025-09-XX

### Initial Release

#### Core Features
- Basic admin and teacher dashboards
- Schedule creation and management
- User authentication
- MongoDB integration
- Basic timetable view
- Simple changelog tracking

---

## Development Notes

### Database Migrations Applied
1. Added `designation` column to users table
2. Added `password_history` column to users table
3. Created notifications table
4. Created schedule_requests table

### Breaking Changes (v2.0.0)
- Switched from MongoDB to SQLite (requires database migration)
- Changed API response format for some endpoints
- Updated frontend routing structure
- Modified authentication flow

### Migration Guide (v1.0.0 → v2.0.0)
1. Export existing data from MongoDB
2. Delete MongoDB container (if used)
3. Install new requirements: `pip install -r requirements.txt`
4. Start backend - SQLite database auto-creates
5. Import data using provided migration script (if available)
6. Update `.env` files with new configuration

---

## Upcoming Features (Planned)

See [FEATURES.md](FEATURES.md) for detailed roadmap including:
- Email notifications
- Student portal
- Parent access
- Calendar integration
- Mobile app
- Advanced analytics
- Multi-language support

---

**Note**: Version numbers follow [Semantic Versioning](https://semver.org/).
