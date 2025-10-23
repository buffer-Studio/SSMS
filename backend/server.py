from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Response, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.exceptions import RequestValidationError
from starlette.middleware.cors import CORSMiddleware
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import csv
import io
import json
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from passlib.context import CryptContext

# Import configuration and utilities
from config import settings
from logging_config import setup_logging, get_logger
from exceptions import (
    APIException,
    NotFoundException,
    ConflictException,
    UnauthorizedException,
    ForbiddenException,
    ValidationException,
    api_exception_handler,
    validation_exception_handler,
    generic_exception_handler,
    SuccessResponse
)

# Initialize logging
setup_logging(log_level="INFO" if not settings.debug else "DEBUG")
logger = get_logger(__name__)

# Database connection - SQLite (no setup required!)
from database import db, client
logger.info("✓ Using SQLite database (no setup required!)")

# Security setup
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Rate limiting setup
limiter = Limiter(key_func=get_remote_address)

# Create the main app
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="API for School Scheduling Management System",
    docs_url="/docs",
    redoc_url="/redoc"
)
api_router = APIRouter(prefix="/api")

# Add rate limiter to app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Register exception handlers
app.add_exception_handler(APIException, api_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

# ============ Models ============

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    name: str
    role: str  # 'admin' or 'teacher'
    designation: Optional[str] = None  # e.g., "Mathematics tr", "Computer tr"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    password_history: List[str] = Field(default_factory=list)  # Store last 5 password hashes
    
    @field_validator('password_history', mode='before')
    @classmethod
    def parse_password_history(cls, v):
        """Parse password_history from JSON string if needed."""
        if isinstance(v, str):
            try:
                return json.loads(v)
            except (json.JSONDecodeError, TypeError):
                return []
        return v if v is not None else []

class UserCreate(BaseModel):
    username: str
    password: str
    name: str
    role: str = 'teacher'
    designation: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str

class PasswordChange(BaseModel):
    old_password: str
    new_password: str

class PasswordReset(BaseModel):
    new_password: str

class ScheduleChangeRequest(BaseModel):
    day: str
    period: int
    current_subject: Optional[str] = None
    current_class: Optional[str] = None
    requested_subject: str
    requested_class: str
    reason: str

class Notification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    category: str  # "security" or "requests"
    title: str
    message: str
    from_user_id: str
    from_user_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    read: bool = False
    metadata: Optional[dict] = None

class TokenResponse(BaseModel):
    token: str
    user: User

class ScheduleEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    teacher_id: str
    teacher_name: str
    day: str  # Monday, Tuesday, etc.
    period: int  # 1-8
    subject: str
    class_name: str
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ScheduleCreate(BaseModel):
    teacher_id: str
    teacher_name: str
    day: str
    period: int
    subject: str
    class_name: str

class ScheduleUpdate(BaseModel):
    subject: Optional[str] = None
    class_name: Optional[str] = None

class Settings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "break_settings"
    break_after_period: int = 3  # 3 or 4
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ChangeLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    schedule_id: str
    teacher_id: str
    teacher_name: str
    day: str
    period: int
    old_value: str
    new_value: str
    changed_by: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ============ Helper Functions ============

def hash_password(password: str) -> str:
    """Hash password - truncate to 72 bytes for bcrypt compatibility."""
    # Bcrypt has a 72-byte limit, truncate if needed
    password_bytes = password.encode('utf-8')[:72]
    return pwd_context.hash(password_bytes.decode('utf-8'))

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash."""
    password_bytes = plain_password.encode('utf-8')[:72]
    return pwd_context.verify(password_bytes.decode('utf-8'), hashed_password)

def create_token(user_id: str, username: str, role: str) -> str:
    """Create JWT token for user authentication."""
    payload = {
        "sub": user_id,
        "username": username,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=settings.jwt_expiration_days)
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Validate JWT token and return current user."""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        user_id = payload.get("sub")
        if not user_id:
            raise UnauthorizedException(detail="Invalid token payload")

        user_doc = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user_doc:
            raise NotFoundException(resource="User", detail="User not found in database")

        if isinstance(user_doc.get('created_at'), str):
            user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])

        logger.debug(f"User authenticated: {user_doc.get('username')}")
        return User(**user_doc)
    except jwt.ExpiredSignatureError:
        logger.warning("Expired token attempt")
        raise UnauthorizedException(detail="Token has expired")
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid token: {str(e)}")
        raise UnauthorizedException(detail="Invalid token format")
    except Exception as e:
        logger.error(f"Authentication error: {str(e)}")
        raise UnauthorizedException(detail="Authentication failed")

# ============ Initialize Demo Data ============

async def init_demo_data():
    # Check if admin exists
    admin_exists = await db.users.find_one({"username": "admin123"})
    if not admin_exists:
        admin_user = User(
            username="admin123",
            name="Administrator",
            role="admin"
        )
        admin_doc = admin_user.model_dump()
        admin_doc['created_at'] = admin_doc['created_at'].isoformat()
        admin_doc['password_hash'] = hash_password("password123")
        await db.users.insert_one(admin_doc)
        logger.info("Admin user created")

    # Create demo teachers with designations
    demo_teachers = [
        {"username": "t_sagnik", "name": "Sagnik Sir", "password": "pass123", "designation": "Mathematics tr"},
        {"username": "t_nadeem", "name": "Nadeem Sir", "password": "pass123", "designation": "Science tr"},
        {"username": "t_prinshu", "name": "Prinshu Sir", "password": "pass123", "designation": "English tr"},
        {"username": "t_abhishek", "name": "Abhishek Sir", "password": "pass123", "designation": "Social Studies tr"},
    ]

    teacher_ids = {}
    for teacher in demo_teachers:
        exists = await db.users.find_one({"username": teacher["username"]})
        if not exists:
            user = User(
                username=teacher["username"],
                name=teacher["name"],
                role="teacher",
                designation=teacher["designation"]
            )
            user_doc = user.model_dump()
            user_doc['created_at'] = user_doc['created_at'].isoformat()
            user_doc['password_hash'] = hash_password(teacher["password"])
            await db.users.insert_one(user_doc)
            teacher_ids[teacher["username"]] = user.id
            logger.info(f"Teacher {teacher['name']} ({teacher['designation']}) created")
        else:
            teacher_ids[teacher["username"]] = exists["id"]

    # Initialize settings
    settings_exists = await db.settings.find_one({"id": "break_settings"})
    if not settings_exists:
        settings = Settings()
        settings_doc = settings.model_dump()
        settings_doc['updated_at'] = settings_doc['updated_at'].isoformat()
        await db.settings.insert_one(settings_doc)
        logger.info("Settings initialized")

    # Load demo schedules if none exist
    schedule_count = await db.schedules.count_documents({})
    if schedule_count == 0:
        await load_demo_schedules()
        logger.info("Demo schedules loaded")

async def load_demo_schedules():
    """Load comprehensive demo timetable data for all teachers"""

    # Get all teachers
    cursor = await db.users.find({"role": "teacher"}, {"_id": 0})
    teachers = await cursor.to_list(100)

    # Demo schedule templates - realistic school subjects
    demo_schedules = {
        "Sagnik Sir": [
            # Monday
            {"day": "Monday", "period": 1, "subject": "Mathematics", "class_name": "Grade 10A"},
            {"day": "Monday", "period": 2, "subject": "Mathematics", "class_name": "Grade 10B"},
            {"day": "Monday", "period": 3, "subject": "Algebra", "class_name": "Grade 11A"},
            {"day": "Monday", "period": 4, "subject": "Statistics", "class_name": "Grade 12A"},
            {"day": "Monday", "period": 5, "subject": "Mathematics", "class_name": "Grade 9A"},
            # Tuesday
            {"day": "Tuesday", "period": 1, "subject": "Calculus", "class_name": "Grade 12B"},
            {"day": "Tuesday", "period": 2, "subject": "Mathematics", "class_name": "Grade 10A"},
            {"day": "Tuesday", "period": 4, "subject": "Geometry", "class_name": "Grade 11B"},
            {"day": "Tuesday", "period": 5, "subject": "Mathematics", "class_name": "Grade 9B"},
            # Wednesday
            {"day": "Wednesday", "period": 1, "subject": "Mathematics", "class_name": "Grade 10B"},
            {"day": "Wednesday", "period": 2, "subject": "Algebra", "class_name": "Grade 11A"},
            {"day": "Wednesday", "period": 4, "subject": "Mathematics", "class_name": "Grade 9A"},
            {"day": "Wednesday", "period": 5, "subject": "Statistics", "class_name": "Grade 12A"},
            # Thursday
            {"day": "Thursday", "period": 1, "subject": "Mathematics", "class_name": "Grade 10A"},
            {"day": "Thursday", "period": 2, "subject": "Calculus", "class_name": "Grade 12B"},
            {"day": "Thursday", "period": 4, "subject": "Mathematics", "class_name": "Grade 9B"},
            {"day": "Thursday", "period": 5, "subject": "Geometry", "class_name": "Grade 11B"},
            # Friday
            {"day": "Friday", "period": 1, "subject": "Mathematics", "class_name": "Grade 10B"},
            {"day": "Friday", "period": 2, "subject": "Mathematics", "class_name": "Grade 9A"},
            {"day": "Friday", "period": 4, "subject": "Algebra", "class_name": "Grade 11A"},
        ],
        "Nadeem Sir": [
            # Monday
            {"day": "Monday", "period": 1, "subject": "Physics", "class_name": "Grade 11A"},
            {"day": "Monday", "period": 2, "subject": "Physics", "class_name": "Grade 12A"},
            {"day": "Monday", "period": 4, "subject": "Chemistry", "class_name": "Grade 10A"},
            {"day": "Monday", "period": 5, "subject": "Science", "class_name": "Grade 9A"},
            # Tuesday
            {"day": "Tuesday", "period": 1, "subject": "Chemistry", "class_name": "Grade 11B"},
            {"day": "Tuesday", "period": 2, "subject": "Physics", "class_name": "Grade 12B"},
            {"day": "Tuesday", "period": 3, "subject": "Lab Session", "class_name": "Grade 11A"},
            {"day": "Tuesday", "period": 5, "subject": "Science", "class_name": "Grade 9B"},
            # Wednesday
            {"day": "Wednesday", "period": 1, "subject": "Physics", "class_name": "Grade 11A"},
            {"day": "Wednesday", "period": 2, "subject": "Chemistry", "class_name": "Grade 10A"},
            {"day": "Wednesday", "period": 4, "subject": "Physics", "class_name": "Grade 12A"},
            {"day": "Wednesday", "period": 5, "subject": "Science", "class_name": "Grade 9A"},
            # Thursday
            {"day": "Thursday", "period": 1, "subject": "Chemistry", "class_name": "Grade 11B"},
            {"day": "Thursday", "period": 2, "subject": "Physics", "class_name": "Grade 12B"},
            {"day": "Thursday", "period": 4, "subject": "Lab Session", "class_name": "Grade 12A"},
            {"day": "Thursday", "period": 5, "subject": "Science", "class_name": "Grade 9B"},
            # Friday
            {"day": "Friday", "period": 1, "subject": "Physics", "class_name": "Grade 11A"},
            {"day": "Friday", "period": 2, "subject": "Chemistry", "class_name": "Grade 10A"},
            {"day": "Friday", "period": 4, "subject": "Science", "class_name": "Grade 9A"},
        ],
        "Prinshu Sir": [
            # Monday
            {"day": "Monday", "period": 1, "subject": "English Literature", "class_name": "Grade 11A"},
            {"day": "Monday", "period": 2, "subject": "English", "class_name": "Grade 9A"},
            {"day": "Monday", "period": 4, "subject": "Creative Writing", "class_name": "Grade 12A"},
            {"day": "Monday", "period": 5, "subject": "English", "class_name": "Grade 10A"},
            # Tuesday
            {"day": "Tuesday", "period": 1, "subject": "English", "class_name": "Grade 9B"},
            {"day": "Tuesday", "period": 2, "subject": "English Literature", "class_name": "Grade 11B"},
            {"day": "Tuesday", "period": 4, "subject": "English", "class_name": "Grade 10B"},
            {"day": "Tuesday", "period": 5, "subject": "Drama", "class_name": "Grade 12B"},
            # Wednesday
            {"day": "Wednesday", "period": 1, "subject": "English", "class_name": "Grade 9A"},
            {"day": "Wednesday", "period": 2, "subject": "English Literature", "class_name": "Grade 11A"},
            {"day": "Wednesday", "period": 4, "subject": "English", "class_name": "Grade 10A"},
            {"day": "Wednesday", "period": 5, "subject": "Creative Writing", "class_name": "Grade 12A"},
            # Thursday
            {"day": "Thursday", "period": 1, "subject": "English", "class_name": "Grade 9B"},
            {"day": "Thursday", "period": 2, "subject": "English Literature", "class_name": "Grade 11B"},
            {"day": "Thursday", "period": 4, "subject": "English", "class_name": "Grade 10B"},
            {"day": "Thursday", "period": 5, "subject": "Drama", "class_name": "Grade 12B"},
            # Friday
            {"day": "Friday", "period": 1, "subject": "English", "class_name": "Grade 9A"},
            {"day": "Friday", "period": 2, "subject": "English", "class_name": "Grade 10A"},
            {"day": "Friday", "period": 4, "subject": "English Literature", "class_name": "Grade 11A"},
        ],
        "Abhishek Sir": [
            # Monday
            {"day": "Monday", "period": 1, "subject": "History", "class_name": "Grade 10A"},
            {"day": "Monday", "period": 2, "subject": "Geography", "class_name": "Grade 9A"},
            {"day": "Monday", "period": 4, "subject": "World History", "class_name": "Grade 11A"},
            {"day": "Monday", "period": 5, "subject": "Social Studies", "class_name": "Grade 12A"},
            # Tuesday
            {"day": "Tuesday", "period": 1, "subject": "History", "class_name": "Grade 10B"},
            {"day": "Tuesday", "period": 2, "subject": "Geography", "class_name": "Grade 9B"},
            {"day": "Tuesday", "period": 4, "subject": "World History", "class_name": "Grade 11B"},
            {"day": "Tuesday", "period": 5, "subject": "Economics", "class_name": "Grade 12B"},
            # Wednesday
            {"day": "Wednesday", "period": 1, "subject": "History", "class_name": "Grade 10A"},
            {"day": "Wednesday", "period": 2, "subject": "Geography", "class_name": "Grade 9A"},
            {"day": "Wednesday", "period": 4, "subject": "World History", "class_name": "Grade 11A"},
            {"day": "Wednesday", "period": 5, "subject": "Social Studies", "class_name": "Grade 12A"},
            # Thursday
            {"day": "Thursday", "period": 1, "subject": "History", "class_name": "Grade 10B"},
            {"day": "Thursday", "period": 2, "subject": "Geography", "class_name": "Grade 9B"},
            {"day": "Thursday", "period": 4, "subject": "World History", "class_name": "Grade 11B"},
            {"day": "Thursday", "period": 5, "subject": "Economics", "class_name": "Grade 12B"},
            # Friday
            {"day": "Friday", "period": 1, "subject": "History", "class_name": "Grade 10A"},
            {"day": "Friday", "period": 2, "subject": "Geography", "class_name": "Grade 9A"},
            {"day": "Friday", "period": 4, "subject": "World History", "class_name": "Grade 11A"},
        ],
    }

    # Create schedules for each teacher
    for teacher in teachers:
        teacher_name = teacher["name"]
        if teacher_name in demo_schedules:
            for schedule_data in demo_schedules[teacher_name]:
                schedule = ScheduleEntry(
                    teacher_id=teacher["id"],
                    teacher_name=teacher_name,
                    day=schedule_data["day"],
                    period=schedule_data["period"],
                    subject=schedule_data["subject"],
                    class_name=schedule_data["class_name"]
                )
                schedule_doc = schedule.model_dump()
                schedule_doc['updated_at'] = schedule_doc['updated_at'].isoformat()
                await db.schedules.insert_one(schedule_doc)

@app.on_event("startup")
async def startup_event():
    """Initialize application on startup."""
    try:
        # Test database connection
        await db.command('ping')
        logger.info("✅ SQLite database connection successful")
        await init_demo_data()
    except Exception as e:
        logger.error(f"Database initialization failed: {str(e)}")
        logger.warning("⚠️  Server starting without database.")

# ============ Auth Routes ============

@api_router.post("/auth/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(credentials: UserLogin, request: Request):
    user_doc = await db.users.find_one({"username": credentials.username}, {"_id": 0})

    if not user_doc or not verify_password(credentials.password, user_doc.get('password_hash', '')):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    if isinstance(user_doc.get('created_at'), str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])

    user = User(**{k: v for k, v in user_doc.items() if k != 'password_hash'})
    token = create_token(user.id, user.username, user.role)

    return TokenResponse(token=token, user=user)

@api_router.get("/auth/verify")
async def verify_token(current_user: User = Depends(get_current_user)):
    return {"valid": True, "user": current_user}

@api_router.post("/auth/change-password")
async def change_password(
    password_data: PasswordChange,
    current_user: User = Depends(get_current_user)
):
    """Change password for current user."""
    user_doc = await db.users.find_one({"id": current_user.id})
    
    if not user_doc:
        raise NotFoundException(resource="User", detail="User not found")
    
    # Verify old password
    if not verify_password(password_data.old_password, user_doc.get('password_hash', '')):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    # Validate new password
    if len(password_data.new_password) < 8:
        raise ValidationException(detail="New password must be at least 8 characters")
    
    if len(password_data.new_password) > 72:
        raise ValidationException(detail="Password too long (max 72 characters)")
    
    # Check password history (last 5 passwords)
    password_history = json.loads(user_doc.get('password_history', '[]'))
    for old_hash in password_history[-5:]:
        if verify_password(password_data.new_password, old_hash):
            raise ValidationException(detail="Cannot reuse one of your last 5 passwords")
    
    # Hash new password
    new_hash = hash_password(password_data.new_password)
    
    # Update password history
    password_history.append(user_doc.get('password_hash'))
    if len(password_history) > 5:
        password_history = password_history[-5:]
    
    # Update password and history
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {
            "password_hash": new_hash,
            "password_history": json.dumps(password_history)
        }}
    )
    
    # Send notification to admin if user is teacher
    if current_user.role == 'teacher':
        notification = Notification(
            category="security",
            title="Password Changed",
            message=f"{current_user.name} has changed their password",
            from_user_id=current_user.id,
            from_user_name=current_user.name,
            metadata={"action": "password_change", "username": current_user.username}
        )
        notif_doc = notification.model_dump()
        notif_doc['timestamp'] = notif_doc['timestamp'].isoformat()
        notif_doc['metadata'] = json.dumps(notif_doc.get('metadata', {}))
        await db.notifications.insert_one(notif_doc)
    
    logger.info(f"User {current_user.username} changed their password")
    return {"message": "Password changed successfully"}

@api_router.post("/auth/reset-password/{user_id}")
async def reset_password(
    user_id: str,
    password_data: PasswordReset,
    current_user: User = Depends(get_current_user)
):
    """Reset password for a user (admin only)."""
    if current_user.role != 'admin':
        raise ForbiddenException(detail="Admin access required")
    
    # Find target user
    target_user = await db.users.find_one({"id": user_id})
    if not target_user:
        raise NotFoundException(resource="User", detail="User not found")
    
    # Validate new password
    if len(password_data.new_password) < 8:
        raise ValidationException(detail="New password must be at least 8 characters")
    
    if len(password_data.new_password) > 72:
        raise ValidationException(detail="Password too long (max 72 characters)")
    
    # Hash and update password
    new_hash = hash_password(password_data.new_password)
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"password_hash": new_hash}}
    )
    
    logger.info(f"Admin {current_user.username} reset password for user {target_user['username']}")
    return {"message": f"Password reset successfully for user {target_user['username']}"}

# ============ User Routes ============

@api_router.get("/users", response_model=List[User])
async def get_users(current_user: User = Depends(get_current_user)):
    """Get all users (admin only)."""
    if current_user.role != 'admin':
        raise ForbiddenException(detail="Admin access required")

    logger.info(f"Admin {current_user.username} requesting user list")
    cursor = await db.users.find({}, {"_id": 0, "password_hash": 0})
    users = await cursor.to_list(1000)
    for user in users:
        if isinstance(user.get('created_at'), str):
            user['created_at'] = datetime.fromisoformat(user['created_at'])
    return users

@api_router.post("/users", response_model=User)
async def create_user(user_data: UserCreate, current_user: User = Depends(get_current_user)):
    """Create a new user (admin only)."""
    if current_user.role != 'admin':
        raise ForbiddenException(detail="Admin access required")

    # Check if username exists
    exists = await db.users.find_one({"username": user_data.username})
    if exists:
        raise ConflictException(message="Username already exists", detail=f"User '{user_data.username}' is already registered")

    user = User(
        username=user_data.username,
        name=user_data.name,
        role=user_data.role,
        designation=user_data.designation
    )

    user_doc = user.model_dump()
    user_doc['created_at'] = user_doc['created_at'].isoformat()
    user_doc['password_hash'] = hash_password(user_data.password)

    await db.users.insert_one(user_doc)
    logger.info(f"User created: {user.username} ({user.designation or 'No designation'}) by {current_user.username}")
    return user

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")

    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    # Delete associated schedules
    await db.schedules.delete_many({"teacher_id": user_id})

    return {"message": "User deleted successfully"}

class DesignationUpdate(BaseModel):
    designation: str

@api_router.patch("/users/{user_id}/designation")
async def update_teacher_designation(
    user_id: str, 
    designation_data: DesignationUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update teacher designation (admin only)."""
    if current_user.role != 'admin':
        raise ForbiddenException(detail="Admin access required")
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"designation": designation_data.designation}}
    )
    
    logger.info(f"Designation updated for user {user_id} by {current_user.username}")
    return {"message": "Designation updated successfully"}

# ============ Schedule Routes ============

@api_router.get("/schedules", response_model=List[ScheduleEntry])
async def get_schedules(teacher_id: Optional[str] = None, current_user: User = Depends(get_current_user)):
    query = {}
    if current_user.role == 'teacher':
        query["teacher_id"] = current_user.id
    elif teacher_id:
        query["teacher_id"] = teacher_id

    cursor = await db.schedules.find(query, {"_id": 0})
    schedules = await cursor.to_list(1000)
    for schedule in schedules:
        if isinstance(schedule.get('updated_at'), str):
            schedule['updated_at'] = datetime.fromisoformat(schedule['updated_at'])

    return schedules

@api_router.post("/schedules", response_model=ScheduleEntry)
async def create_schedule(schedule_data: ScheduleCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")

    # Check for teacher double-booking (teacher already has class at this time)
    teacher_conflict = await db.schedules.find_one({
        "teacher_id": schedule_data.teacher_id,
        "day": schedule_data.day,
        "period": schedule_data.period
    })
    
    if teacher_conflict:
        raise ConflictException(
            detail=f"{schedule_data.teacher_name} already has a class on {schedule_data.day} period {schedule_data.period} ({teacher_conflict['subject']} with {teacher_conflict['class_name']})"
        )

    # Check for class double-booking (class already has a lesson at this time)
    class_conflict = await db.schedules.find_one({
        "day": schedule_data.day,
        "period": schedule_data.period,
        "class_name": schedule_data.class_name
    })

    if class_conflict:
        raise ConflictException(
            detail=f"{schedule_data.class_name} already has {class_conflict['subject']} with {class_conflict['teacher_name']} on {schedule_data.day} period {schedule_data.period}"
        )

    # Create schedule
    schedule = ScheduleEntry(**schedule_data.model_dump())
    schedule_doc = schedule.model_dump()
    schedule_doc['updated_at'] = schedule_doc['updated_at'].isoformat()

    await db.schedules.insert_one(schedule_doc)
    logger.info(f"Admin {current_user.username} created schedule: {schedule_data.teacher_name} - {schedule_data.day} P{schedule_data.period}")
    return schedule

@api_router.put("/schedules/{schedule_id}", response_model=ScheduleEntry)
async def update_schedule(schedule_id: str, update_data: ScheduleUpdate, current_user: User = Depends(get_current_user)):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")

    existing = await db.schedules.find_one({"id": schedule_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Schedule not found")

    # Log the change
    changes = []
    if update_data.subject and update_data.subject != existing.get('subject'):
        changes.append(f"Subject: {existing.get('subject')} → {update_data.subject}")
    if update_data.class_name and update_data.class_name != existing.get('class_name'):
        changes.append(f"Class: {existing.get('class_name')} → {update_data.class_name}")

    if changes:
        changelog = ChangeLog(
            schedule_id=schedule_id,
            teacher_id=existing['teacher_id'],
            teacher_name=existing['teacher_name'],
            day=existing['day'],
            period=existing['period'],
            old_value=existing.get('subject', '') + ' - ' + existing.get('class_name', ''),
            new_value=(update_data.subject or existing.get('subject', '')) + ' - ' + (update_data.class_name or existing.get('class_name', '')),
            changed_by=current_user.name
        )
        changelog_doc = changelog.model_dump()
        changelog_doc['timestamp'] = changelog_doc['timestamp'].isoformat()
        await db.changelogs.insert_one(changelog_doc)

    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()

    await db.schedules.update_one({"id": schedule_id}, {"$set": update_dict})

    updated = await db.schedules.find_one({"id": schedule_id}, {"_id": 0})
    if isinstance(updated.get('updated_at'), str):
        updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])

    return ScheduleEntry(**updated)

@api_router.delete("/schedules/{schedule_id}")
async def delete_schedule(schedule_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")

    result = await db.schedules.delete_one({"id": schedule_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Schedule not found")

    return {"message": "Schedule deleted successfully"}

# ============ Settings Routes ============

@api_router.get("/settings/break-period")
async def get_break_settings():
    settings = await db.settings.find_one({"id": "break_settings"}, {"_id": 0})
    if not settings:
        settings = Settings().model_dump()
        settings['updated_at'] = settings['updated_at'].isoformat()
        await db.settings.insert_one(settings)

    if isinstance(settings.get('updated_at'), str):
        settings['updated_at'] = datetime.fromisoformat(settings['updated_at'])

    return Settings(**settings)

@api_router.put("/settings/break-period")
async def update_break_settings(break_after: int, current_user: User = Depends(get_current_user)):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")

    if break_after not in [3, 4]:
        raise HTTPException(status_code=400, detail="Break can only be after period 3 or 4")

    await db.settings.update_one(
        {"id": "break_settings"},
        {"$set": {"break_after_period": break_after, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )

    return {"break_after_period": break_after}

@api_router.post("/schedules/bulk-upload")
async def bulk_upload_schedules(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Bulk upload schedules from CSV file (admin only)."""
    if current_user.role != 'admin':
        raise ForbiddenException(detail="Admin access required")
    
    if not file.filename.endswith('.csv'):
        raise ValidationException(detail="File must be a CSV")
    
    try:
        contents = await file.read()
        csv_data = csv.DictReader(io.StringIO(contents.decode('utf-8')))
        
        created_count = 0
        skipped_count = 0
        errors = []
        
        for idx, row in enumerate(csv_data, start=2):  # Start at 2 (row 1 is headers)
            try:
                # Validate required fields
                if not all(key in row for key in ['teacher_id', 'teacher_name', 'day', 'period', 'subject', 'class_name']):
                    errors.append(f"Row {idx}: Missing required fields")
                    skipped_count += 1
                    continue
                
                # Check for conflicts before inserting
                teacher_conflict = await db.schedules.find_one({
                    "teacher_id": row['teacher_id'],
                    "day": row['day'],
                    "period": int(row['period'])
                })
                
                class_conflict = await db.schedules.find_one({
                    "day": row['day'],
                    "period": int(row['period']),
                    "class_name": row['class_name']
                })
                
                if teacher_conflict or class_conflict:
                    errors.append(f"Row {idx}: Schedule conflict - slot already occupied")
                    skipped_count += 1
                    continue
                
                # Create schedule
                schedule = ScheduleEntry(
                    teacher_id=row['teacher_id'],
                    teacher_name=row['teacher_name'],
                    day=row['day'],
                    period=int(row['period']),
                    subject=row['subject'],
                    class_name=row['class_name']
                )
                schedule_doc = schedule.model_dump()
                schedule_doc['updated_at'] = schedule_doc['updated_at'].isoformat()
                await db.schedules.insert_one(schedule_doc)
                created_count += 1
                
            except Exception as e:
                errors.append(f"Row {idx}: {str(e)}")
                skipped_count += 1
        
        logger.info(f"Admin {current_user.username} bulk uploaded {created_count} schedules, skipped {skipped_count}")
        return {
            "message": f"Imported {created_count} schedules",
            "created": created_count,
            "skipped": skipped_count,
            "errors": errors if errors else None
        }
    
    except Exception as e:
        logger.error(f"Bulk upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process CSV file: {str(e)}")

@api_router.get("/schedules/export")
async def export_schedules(current_user: User = Depends(get_current_user)):
    """Export all schedules to CSV."""
    cursor = await db.schedules.find({}, {"_id": 0})
    schedules = await cursor.to_list(1000)
    
    # Convert to CSV
    output = io.StringIO()
    if schedules:
        fieldnames = ['id', 'teacher_id', 'teacher_name', 'day', 'period', 'subject', 'class_name', 'updated_at']
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        
        for schedule in schedules:
            # Convert datetime to string if needed
            if isinstance(schedule.get('updated_at'), datetime):
                schedule['updated_at'] = schedule['updated_at'].isoformat()
            writer.writerow({k: schedule.get(k, '') for k in fieldnames})
    
    logger.info(f"User {current_user.username} exported {len(schedules)} schedules")
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=schedules_export.csv"}
    )

@api_router.get("/schedules/template")
async def download_template(current_user: User = Depends(get_current_user)):
    """Download CSV template for bulk upload."""
    if current_user.role != 'admin':
        raise ForbiddenException(detail="Admin access required")
    
    output = io.StringIO()
    fieldnames = ['teacher_id', 'teacher_name', 'day', 'period', 'subject', 'class_name']
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    
    # Add example row
    writer.writerow({
        'teacher_id': 'teacher-id-here',
        'teacher_name': 'Teacher Name',
        'day': 'Monday',
        'period': '1',
        'subject': 'Mathematics',
        'class_name': 'Grade 10A'
    })
    
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=schedule_template.csv"}
    )

# ============ Changelog Routes ============

@api_router.get("/changelogs", response_model=List[ChangeLog])
async def get_changelogs(teacher_id: Optional[str] = None, current_user: User = Depends(get_current_user)):
    query = {}
    if current_user.role == 'teacher':
        query["teacher_id"] = current_user.id
    elif teacher_id:
        query["teacher_id"] = teacher_id

    cursor = await db.changelogs.find(query, {"_id": 0})
    changelogs = await cursor.sort("timestamp", -1).to_list(100)
    for log in changelogs:
        if isinstance(log.get('timestamp'), str):
            log['timestamp'] = datetime.fromisoformat(log['timestamp'])

    return changelogs

# ============ Demo Data Routes ============

@api_router.post("/demo/load-schedules")
async def load_demo_schedules_endpoint(current_user: User = Depends(get_current_user)):
    """Load comprehensive demo timetable data for all teachers (Admin only)"""
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")

    # Clear existing schedules
    await db.schedules.delete_many({})
    await db.changelogs.delete_many({})

    # Load demo data
    await load_demo_schedules()

    return {"message": "Demo schedules loaded successfully", "status": "success"}

@api_router.post("/demo/clear-schedules")
async def clear_all_schedules(current_user: User = Depends(get_current_user)):
    """Clear all schedules and changelogs (Admin only)"""
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")

    await db.schedules.delete_many({})
    await db.changelogs.delete_many({})

    return {"message": "All schedules cleared successfully", "status": "success"}

# ============ Notification Routes ============

@api_router.get("/notifications")
async def get_notifications(
    category: Optional[str] = None,
    unread_only: bool = False,
    current_user: User = Depends(get_current_user)
):
    """Get notifications for admin."""
    if current_user.role != 'admin':
        raise ForbiddenException(detail="Admin access required")
    
    query = {}
    if category:
        query["category"] = category
    if unread_only:
        query["read"] = 0
    
    cursor = await db.notifications.find(query, {"_id": 0})
    notifications = await cursor.sort("timestamp", -1).to_list(100)
    
    for notif in notifications:
        if isinstance(notif.get('timestamp'), str):
            notif['timestamp'] = datetime.fromisoformat(notif['timestamp'])
        if isinstance(notif.get('metadata'), str):
            notif['metadata'] = json.loads(notif.get('metadata', '{}'))
    
    return notifications

@api_router.patch("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_user)
):
    """Mark notification as read."""
    if current_user.role != 'admin':
        raise ForbiddenException(detail="Admin access required")
    
    await db.notifications.update_one(
        {"id": notification_id},
        {"$set": {"read": 1}}
    )
    
    return {"message": "Notification marked as read"}

@api_router.post("/notifications/mark-all-read")
async def mark_all_notifications_read(
    category: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Mark all notifications as read."""
    if current_user.role != 'admin':
        raise ForbiddenException(detail="Admin access required")
    
    query = {}
    if category:
        query["category"] = category
    
    await db.notifications.update_many(query, {"$set": {"read": 1}})
    
    return {"message": "All notifications marked as read"}

# ============ Schedule Change Request Routes ============

@api_router.post("/schedule-requests")
async def create_schedule_request(
    request_data: ScheduleChangeRequest,
    current_user: User = Depends(get_current_user)
):
    """Create a schedule change request (Teacher only)."""
    if current_user.role != 'teacher':
        raise ForbiddenException(detail="Teacher access required")
    
    # Create notification for admin
    message = f"{current_user.name} requests to change {request_data.day} Period {request_data.period}"
    if request_data.current_subject:
        message += f" from {request_data.current_subject} ({request_data.current_class})"
    message += f" to {request_data.requested_subject} ({request_data.requested_class})"
    message += f"\nReason: {request_data.reason}"
    
    notification = Notification(
        category="requests",
        title="Schedule Change Request",
        message=message,
        from_user_id=current_user.id,
        from_user_name=current_user.name,
        metadata={
            "type": "schedule_change",
            "day": request_data.day,
            "period": request_data.period,
            "current_subject": request_data.current_subject,
            "current_class": request_data.current_class,
            "requested_subject": request_data.requested_subject,
            "requested_class": request_data.requested_class,
            "reason": request_data.reason
        }
    )
    
    notif_doc = notification.model_dump()
    notif_doc['timestamp'] = notif_doc['timestamp'].isoformat()
    notif_doc['metadata'] = json.dumps(notif_doc.get('metadata', {}))
    await db.notifications.insert_one(notif_doc)
    
    logger.info(f"Teacher {current_user.username} created schedule change request")
    return {"message": "Schedule change request submitted successfully"}

# Include the router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=settings.cors_origins_list,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    """Close database connection on shutdown."""
    logger.info("Shutting down database connection")
    # SQLite connections are closed per-request, no global close needed
