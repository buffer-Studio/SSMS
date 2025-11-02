from fastapi import FastAPI, APIRouter, HTTPException, Depends, Response, Request, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext
import sqlite3
import json
from contextlib import contextmanager
import time
from collections import defaultdict
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# SQLite database setup
DATABASE_PATH = ROOT_DIR / "ssms.db"

@contextmanager
def get_db_connection():
    """Context manager for SQLite database connections"""
    conn = sqlite3.connect(DATABASE_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row  # Enable column access by name
    try:
        yield conn
    finally:
        conn.close()

# Custom Rate Limiting (Python 3.14 compatible)
class SimpleRateLimiter:
    def __init__(self):
        self.requests = defaultdict(list)
        self.max_requests = 30
        self.window_seconds = 60
        self.login_max_requests = 5

    def is_allowed(self, key: str, is_login: bool = False) -> bool:
        now = time.time()
        max_req = self.login_max_requests if is_login else self.max_requests

        # Clean old requests
        self.requests[key] = [req_time for req_time in self.requests[key]
                             if now - req_time < self.window_seconds]

        if len(self.requests[key]) >= max_req:
            return False

        self.requests[key].append(now)
        return True

# Global rate limiter instance
rate_limiter = SimpleRateLimiter()

# Security setup
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

def init_database():
    """Initialize SQLite database and create tables"""
    with get_db_connection() as conn:
        cursor = conn.cursor()

        # Create users table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                role TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)

        # Create schedules table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS schedules (
                id TEXT PRIMARY KEY,
                teacher_id TEXT NOT NULL,
                teacher_name TEXT NOT NULL,
                day TEXT NOT NULL,
                period INTEGER NOT NULL,
                subject TEXT NOT NULL,
                class_name TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (teacher_id) REFERENCES users (id)
            )
        """)

        # Create settings table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS settings (
                id TEXT PRIMARY KEY,
                break_after_period INTEGER NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)

        # Create changelogs table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS changelogs (
                id TEXT PRIMARY KEY,
                schedule_id TEXT NOT NULL,
                teacher_id TEXT NOT NULL,
                teacher_name TEXT NOT NULL,
                day TEXT NOT NULL,
                period INTEGER NOT NULL,
                old_value TEXT NOT NULL,
                new_value TEXT NOT NULL,
                changed_by TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                FOREIGN KEY (schedule_id) REFERENCES schedules (id),
                FOREIGN KEY (teacher_id) REFERENCES users (id)
            )
        """)

        # Create indexes for performance
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_schedules_teacher
            ON schedules(teacher_id)
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_schedules_day_period
            ON schedules(day, period)
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_users_username
            ON users(username)
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_changelogs_teacher
            ON changelogs(teacher_id, timestamp)
        """)

        conn.commit()

# ============ Models ============

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    name: str
    role: str  # 'admin' or 'teacher'
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    username: str
    password: str
    name: str
    role: str = 'teacher'

class UserLogin(BaseModel):
    username: str
    password: str

class PasswordChange(BaseModel):
    old_password: str
    new_password: str

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
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_token(user_id: str, username: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "username": username,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=7)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(request: Request):
    try:
        # Get token from httpOnly cookie first
        token = request.cookies.get("access_token")

        # If no cookie token, check Authorization header
        if not token:
            auth_header = request.headers.get("authorization")
            if auth_header and auth_header.startswith("Bearer "):
                token = auth_header[7:]  # Remove "Bearer " prefix

        if not token:
            raise HTTPException(status_code=401, detail="Not authenticated")

        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")

        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
            user_row = cursor.fetchone()

            if not user_row:
                raise HTTPException(status_code=401, detail="User not found")

            # Convert row to dict and handle datetime
            user_data = dict(user_row)
            if isinstance(user_data.get('created_at'), str):
                user_data['created_at'] = datetime.fromisoformat(user_data['created_at'])

            return User(**user_data)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============ Initialize Demo Data ============

async def init_demo_data():
    with get_db_connection() as conn:
        cursor = conn.cursor()

        # Check if admin exists
        cursor.execute("SELECT COUNT(*) FROM users WHERE username = ?", ("admin123",))
        admin_exists = cursor.fetchone()[0] > 0

        if not admin_exists:
            admin_user = User(
                username="admin123",
                name="Administrator",
                role="admin"
            )
            admin_doc = admin_user.model_dump()
            admin_doc['created_at'] = admin_doc['created_at'].isoformat()
            admin_doc['password_hash'] = hash_password("password123")

            cursor.execute("""
                INSERT INTO users (id, username, name, role, password_hash, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                admin_doc['id'],
                admin_doc['username'],
                admin_doc['name'],
                admin_doc['role'],
                admin_doc['password_hash'],
                admin_doc['created_at']
            ))
            logger.info("Admin user created")

        # Create demo teachers
        demo_teachers = [
            {"username": "t_sagnik", "name": "Sagnik Sir", "password": "pass123"},
            {"username": "t_nadeem", "name": "Nadeem Sir", "password": "pass123"},
            {"username": "t_prinshu", "name": "Prinshu Sir", "password": "pass123"},
            {"username": "t_abhishek", "name": "Abhishek Sir", "password": "pass123"},
        ]

        teacher_ids = {}
        for teacher in demo_teachers:
            cursor.execute("SELECT id FROM users WHERE username = ?", (teacher["username"],))
            existing = cursor.fetchone()
            if not existing:
                user = User(
                    username=teacher["username"],
                    name=teacher["name"],
                    role="teacher"
                )
                user_doc = user.model_dump()
                user_doc['created_at'] = user_doc['created_at'].isoformat()
                user_doc['password_hash'] = hash_password(teacher["password"])

                cursor.execute("""
                    INSERT INTO users (id, username, name, role, password_hash, created_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    user_doc['id'],
                    user_doc['username'],
                    user_doc['name'],
                    user_doc['role'],
                    user_doc['password_hash'],
                    user_doc['created_at']
                ))
                teacher_ids[teacher["username"]] = user.id
                logger.info(f"Teacher {teacher['name']} created")
            else:
                teacher_ids[teacher["username"]] = existing[0]

        # Initialize settings
        cursor.execute("SELECT COUNT(*) FROM settings WHERE id = ?", ("break_settings",))
        settings_exists = cursor.fetchone()[0] > 0

        if not settings_exists:
            settings = Settings()
            settings_doc = settings.model_dump()
            settings_doc['updated_at'] = settings_doc['updated_at'].isoformat()

            cursor.execute("""
                INSERT INTO settings (id, break_after_period, updated_at)
                VALUES (?, ?, ?)
            """, (
                settings_doc['id'],
                settings_doc['break_after_period'],
                settings_doc['updated_at']
            ))
            logger.info("Settings initialized")

        # Load demo schedules if none exist
        cursor.execute("SELECT COUNT(*) FROM schedules")
        schedule_count = cursor.fetchone()[0]

        if schedule_count == 0:
            await load_demo_schedules()
            logger.info("Demo schedules loaded")

        conn.commit()

async def load_demo_schedules():
    """Load comprehensive demo timetable data for all teachers"""

    with get_db_connection() as conn:
        cursor = conn.cursor()

        # Get all teachers
        cursor.execute("SELECT * FROM users WHERE role = ?", ("teacher",))
        teachers = [dict(row) for row in cursor.fetchall()]

        # Demo schedule templates - realistic school subjects
        demo_schedules = {
            "Sagnik Sir": [
                # Monday - Maths and Physics focus
                {"day": "Monday", "period": 1, "subject": "Mathematics", "class_name": "Grade 10A"},
                {"day": "Monday", "period": 2, "subject": "Mathematics", "class_name": "Grade 10B"},
                {"day": "Monday", "period": 3, "subject": "Physics", "class_name": "Grade 11A"},
                {"day": "Monday", "period": 4, "subject": "Physics", "class_name": "Grade 11B"},
                {"day": "Monday", "period": 5, "subject": "Mathematics", "class_name": "Grade 9A"},
                {"day": "Monday", "period": 6, "subject": "Mathematics", "class_name": "Grade 9B"},
                {"day": "Monday", "period": 7, "subject": "Physics", "class_name": "Grade 12A"},
                {"day": "Monday", "period": 8, "subject": "Physics", "class_name": "Grade 12B"},
                # Tuesday - Maths and Physics focus
                {"day": "Tuesday", "period": 1, "subject": "Mathematics", "class_name": "Grade 11A"},
                {"day": "Tuesday", "period": 2, "subject": "Mathematics", "class_name": "Grade 11B"},
                {"day": "Tuesday", "period": 4, "subject": "Physics", "class_name": "Grade 10A"},
                {"day": "Tuesday", "period": 5, "subject": "Physics", "class_name": "Grade 10B"},
                {"day": "Tuesday", "period": 6, "subject": "Mathematics", "class_name": "Grade 12A"},
                {"day": "Tuesday", "period": 7, "subject": "Mathematics", "class_name": "Grade 12B"},
                {"day": "Tuesday", "period": 8, "subject": "Physics", "class_name": "Grade 9A"},
                # Wednesday - Maths and Physics focus
                {"day": "Wednesday", "period": 1, "subject": "Mathematics", "class_name": "Grade 10A"},
                {"day": "Wednesday", "period": 2, "subject": "Physics", "class_name": "Grade 11A"},
                {"day": "Wednesday", "period": 4, "subject": "Mathematics", "class_name": "Grade 9B"},
                {"day": "Wednesday", "period": 5, "subject": "Physics", "class_name": "Grade 12A"},
                {"day": "Wednesday", "period": 6, "subject": "Mathematics", "class_name": "Grade 10B"},
                {"day": "Wednesday", "period": 7, "subject": "Physics", "class_name": "Grade 11B"},
                {"day": "Wednesday", "period": 8, "subject": "Mathematics", "class_name": "Grade 9A"},
                # Thursday - Maths and Physics focus
                {"day": "Thursday", "period": 1, "subject": "Physics", "class_name": "Grade 10A"},
                {"day": "Thursday", "period": 2, "subject": "Mathematics", "class_name": "Grade 11A"},
                {"day": "Thursday", "period": 4, "subject": "Physics", "class_name": "Grade 9B"},
                {"day": "Thursday", "period": 5, "subject": "Mathematics", "class_name": "Grade 12A"},
                {"day": "Thursday", "period": 6, "subject": "Physics", "class_name": "Grade 10B"},
                {"day": "Thursday", "period": 7, "subject": "Mathematics", "class_name": "Grade 11B"},
                {"day": "Thursday", "period": 8, "subject": "Physics", "class_name": "Grade 12B"},
                # Friday - Maths and Physics focus
                {"day": "Friday", "period": 1, "subject": "Mathematics", "class_name": "Grade 10A"},
                {"day": "Friday", "period": 2, "subject": "Physics", "class_name": "Grade 11A"},
                {"day": "Friday", "period": 4, "subject": "Mathematics", "class_name": "Grade 9A"},
                {"day": "Friday", "period": 5, "subject": "Physics", "class_name": "Grade 12A"},
                {"day": "Friday", "period": 6, "subject": "Mathematics", "class_name": "Grade 10B"},
                {"day": "Friday", "period": 7, "subject": "Physics", "class_name": "Grade 11B"},
                {"day": "Friday", "period": 8, "subject": "Mathematics", "class_name": "Grade 9B"},
            ],
            "Nadeem Sir": [
                # Monday - Computer Science and Lab Sessions
                {"day": "Monday", "period": 1, "subject": "Computer Science", "class_name": "Grade 10A"},
                {"day": "Monday", "period": 2, "subject": "Computer Science", "class_name": "Grade 10B"},
                {"day": "Monday", "period": 3, "subject": "Lab Session", "class_name": "Grade 11A"},
                {"day": "Monday", "period": 4, "subject": "Lab Session", "class_name": "Grade 11B"},
                {"day": "Monday", "period": 5, "subject": "Computer Science", "class_name": "Grade 9A"},
                {"day": "Monday", "period": 6, "subject": "Computer Science", "class_name": "Grade 9B"},
                {"day": "Monday", "period": 7, "subject": "Lab Session", "class_name": "Grade 12A"},
                {"day": "Monday", "period": 8, "subject": "Lab Session", "class_name": "Grade 12B"},
                # Tuesday - Computer Science and Lab Sessions
                {"day": "Tuesday", "period": 1, "subject": "Computer Science", "class_name": "Grade 11A"},
                {"day": "Tuesday", "period": 2, "subject": "Computer Science", "class_name": "Grade 11B"},
                {"day": "Tuesday", "period": 4, "subject": "Lab Session", "class_name": "Grade 10A"},
                {"day": "Tuesday", "period": 5, "subject": "Lab Session", "class_name": "Grade 10B"},
                {"day": "Tuesday", "period": 6, "subject": "Computer Science", "class_name": "Grade 12A"},
                {"day": "Tuesday", "period": 7, "subject": "Computer Science", "class_name": "Grade 12B"},
                {"day": "Tuesday", "period": 8, "subject": "Lab Session", "class_name": "Grade 9A"},
                # Wednesday - Computer Science and Lab Sessions
                {"day": "Wednesday", "period": 1, "subject": "Computer Science", "class_name": "Grade 10A"},
                {"day": "Wednesday", "period": 2, "subject": "Lab Session", "class_name": "Grade 11A"},
                {"day": "Wednesday", "period": 4, "subject": "Computer Science", "class_name": "Grade 9B"},
                {"day": "Wednesday", "period": 5, "subject": "Lab Session", "class_name": "Grade 12A"},
                {"day": "Wednesday", "period": 6, "subject": "Computer Science", "class_name": "Grade 10B"},
                {"day": "Wednesday", "period": 7, "subject": "Lab Session", "class_name": "Grade 11B"},
                {"day": "Wednesday", "period": 8, "subject": "Computer Science", "class_name": "Grade 9A"},
                # Thursday - Computer Science and Lab Sessions
                {"day": "Thursday", "period": 1, "subject": "Lab Session", "class_name": "Grade 10A"},
                {"day": "Thursday", "period": 2, "subject": "Computer Science", "class_name": "Grade 11A"},
                {"day": "Thursday", "period": 4, "subject": "Lab Session", "class_name": "Grade 9B"},
                {"day": "Thursday", "period": 5, "subject": "Computer Science", "class_name": "Grade 12A"},
                {"day": "Thursday", "period": 6, "subject": "Lab Session", "class_name": "Grade 10B"},
                {"day": "Thursday", "period": 7, "subject": "Computer Science", "class_name": "Grade 11B"},
                {"day": "Thursday", "period": 8, "subject": "Lab Session", "class_name": "Grade 12B"},
                # Friday - Computer Science and Lab Sessions
                {"day": "Friday", "period": 1, "subject": "Computer Science", "class_name": "Grade 10A"},
                {"day": "Friday", "period": 2, "subject": "Lab Session", "class_name": "Grade 11A"},
                {"day": "Friday", "period": 4, "subject": "Computer Science", "class_name": "Grade 9A"},
                {"day": "Friday", "period": 5, "subject": "Lab Session", "class_name": "Grade 12A"},
                {"day": "Friday", "period": 6, "subject": "Computer Science", "class_name": "Grade 10B"},
                {"day": "Friday", "period": 7, "subject": "Lab Session", "class_name": "Grade 11B"},
                {"day": "Friday", "period": 8, "subject": "Computer Science", "class_name": "Grade 9B"},
            ],
            "Prinshu Sir": [
                # Monday - Maths, Physics, and Physics Lab
                {"day": "Monday", "period": 1, "subject": "Mathematics", "class_name": "Grade 10A"},
                {"day": "Monday", "period": 2, "subject": "Physics", "class_name": "Grade 10B"},
                {"day": "Monday", "period": 3, "subject": "Physics Lab", "class_name": "Grade 11A"},
                {"day": "Monday", "period": 4, "subject": "Mathematics", "class_name": "Grade 11B"},
                {"day": "Monday", "period": 5, "subject": "Physics", "class_name": "Grade 9A"},
                {"day": "Monday", "period": 6, "subject": "Mathematics", "class_name": "Grade 9B"},
                {"day": "Monday", "period": 7, "subject": "Physics Lab", "class_name": "Grade 12A"},
                {"day": "Monday", "period": 8, "subject": "Physics", "class_name": "Grade 12B"},
                # Tuesday - Maths, Physics, and Physics Lab
                {"day": "Tuesday", "period": 1, "subject": "Mathematics", "class_name": "Grade 11A"},
                {"day": "Tuesday", "period": 2, "subject": "Physics", "class_name": "Grade 11B"},
                {"day": "Tuesday", "period": 4, "subject": "Physics Lab", "class_name": "Grade 10A"},
                {"day": "Tuesday", "period": 5, "subject": "Mathematics", "class_name": "Grade 10B"},
                {"day": "Tuesday", "period": 6, "subject": "Physics", "class_name": "Grade 12A"},
                {"day": "Tuesday", "period": 7, "subject": "Mathematics", "class_name": "Grade 12B"},
                {"day": "Tuesday", "period": 8, "subject": "Physics Lab", "class_name": "Grade 9A"},
                # Wednesday - Maths, Physics, and Physics Lab
                {"day": "Wednesday", "period": 1, "subject": "Mathematics", "class_name": "Grade 10A"},
                {"day": "Wednesday", "period": 2, "subject": "Physics Lab", "class_name": "Grade 11A"},
                {"day": "Wednesday", "period": 4, "subject": "Physics", "class_name": "Grade 9B"},
                {"day": "Wednesday", "period": 5, "subject": "Mathematics", "class_name": "Grade 12A"},
                {"day": "Wednesday", "period": 6, "subject": "Physics Lab", "class_name": "Grade 10B"},
                {"day": "Wednesday", "period": 7, "subject": "Physics", "class_name": "Grade 11B"},
                {"day": "Wednesday", "period": 8, "subject": "Mathematics", "class_name": "Grade 9A"},
                # Thursday - Maths, Physics, and Physics Lab
                {"day": "Thursday", "period": 1, "subject": "Physics", "class_name": "Grade 10A"},
                {"day": "Thursday", "period": 2, "subject": "Mathematics", "class_name": "Grade 11A"},
                {"day": "Thursday", "period": 4, "subject": "Physics Lab", "class_name": "Grade 9B"},
                {"day": "Thursday", "period": 5, "subject": "Physics", "class_name": "Grade 12A"},
                {"day": "Thursday", "period": 6, "subject": "Mathematics", "class_name": "Grade 10B"},
                {"day": "Thursday", "period": 7, "subject": "Physics Lab", "class_name": "Grade 11B"},
                {"day": "Thursday", "period": 8, "subject": "Physics", "class_name": "Grade 12B"},
                # Friday - Maths, Physics, and Physics Lab
                {"day": "Friday", "period": 1, "subject": "Mathematics", "class_name": "Grade 10A"},
                {"day": "Friday", "period": 2, "subject": "Physics Lab", "class_name": "Grade 11A"},
                {"day": "Friday", "period": 4, "subject": "Physics", "class_name": "Grade 9A"},
                {"day": "Friday", "period": 5, "subject": "Mathematics", "class_name": "Grade 12A"},
                {"day": "Friday", "period": 6, "subject": "Physics Lab", "class_name": "Grade 10B"},
                {"day": "Friday", "period": 7, "subject": "Physics", "class_name": "Grade 11B"},
                {"day": "Friday", "period": 8, "subject": "Mathematics", "class_name": "Grade 9B"},
            ],
            "Abhishek Sir": [
                # Monday - English, Grammar, Drama, Accounts, Commerce
                {"day": "Monday", "period": 1, "subject": "English", "class_name": "Grade 10A"},
                {"day": "Monday", "period": 2, "subject": "Grammar", "class_name": "Grade 10B"},
                {"day": "Monday", "period": 3, "subject": "Drama", "class_name": "Grade 11A"},
                {"day": "Monday", "period": 4, "subject": "Accounts", "class_name": "Grade 11B"},
                {"day": "Monday", "period": 5, "subject": "Commerce", "class_name": "Grade 9A"},
                {"day": "Monday", "period": 6, "subject": "English", "class_name": "Grade 9B"},
                {"day": "Monday", "period": 7, "subject": "Grammar", "class_name": "Grade 12A"},
                {"day": "Monday", "period": 8, "subject": "Drama", "class_name": "Grade 12B"},
                # Tuesday - English, Grammar, Drama, Accounts, Commerce
                {"day": "Tuesday", "period": 1, "subject": "Accounts", "class_name": "Grade 11A"},
                {"day": "Tuesday", "period": 2, "subject": "Commerce", "class_name": "Grade 11B"},
                {"day": "Tuesday", "period": 4, "subject": "English", "class_name": "Grade 10A"},
                {"day": "Tuesday", "period": 5, "subject": "Grammar", "class_name": "Grade 10B"},
                {"day": "Tuesday", "period": 6, "subject": "Drama", "class_name": "Grade 12A"},
                {"day": "Tuesday", "period": 7, "subject": "Accounts", "class_name": "Grade 12B"},
                {"day": "Tuesday", "period": 8, "subject": "Commerce", "class_name": "Grade 9A"},
                # Wednesday - English, Grammar, Drama, Accounts, Commerce
                {"day": "Wednesday", "period": 1, "subject": "English", "class_name": "Grade 10A"},
                {"day": "Wednesday", "period": 2, "subject": "Drama", "class_name": "Grade 11A"},
                {"day": "Wednesday", "period": 4, "subject": "Grammar", "class_name": "Grade 9B"},
                {"day": "Wednesday", "period": 5, "subject": "Accounts", "class_name": "Grade 12A"},
                {"day": "Wednesday", "period": 6, "subject": "Commerce", "class_name": "Grade 10B"},
                {"day": "Wednesday", "period": 7, "subject": "English", "class_name": "Grade 11B"},
                {"day": "Wednesday", "period": 8, "subject": "Drama", "class_name": "Grade 9A"},
                # Thursday - English, Grammar, Drama, Accounts, Commerce
                {"day": "Thursday", "period": 1, "subject": "Grammar", "class_name": "Grade 10A"},
                {"day": "Thursday", "period": 2, "subject": "Accounts", "class_name": "Grade 11A"},
                {"day": "Thursday", "period": 4, "subject": "Commerce", "class_name": "Grade 9B"},
                {"day": "Thursday", "period": 5, "subject": "English", "class_name": "Grade 12A"},
                {"day": "Thursday", "period": 6, "subject": "Drama", "class_name": "Grade 10B"},
                {"day": "Thursday", "period": 7, "subject": "Grammar", "class_name": "Grade 11B"},
                {"day": "Thursday", "period": 8, "subject": "Accounts", "class_name": "Grade 12B"},
                # Friday - English, Grammar, Drama, Accounts, Commerce
                {"day": "Friday", "period": 1, "subject": "English", "class_name": "Grade 10A"},
                {"day": "Friday", "period": 2, "subject": "Drama", "class_name": "Grade 11A"},
                {"day": "Friday", "period": 4, "subject": "Commerce", "class_name": "Grade 9A"},
                {"day": "Friday", "period": 5, "subject": "Grammar", "class_name": "Grade 12A"},
                {"day": "Friday", "period": 6, "subject": "Accounts", "class_name": "Grade 10B"},
                {"day": "Friday", "period": 7, "subject": "English", "class_name": "Grade 11B"},
                {"day": "Friday", "period": 8, "subject": "Drama", "class_name": "Grade 9B"},
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

                    cursor.execute("""
                        INSERT INTO schedules (id, teacher_id, teacher_name, day, period, subject, class_name, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        schedule_doc['id'],
                        schedule_doc['teacher_id'],
                        schedule_doc['teacher_name'],
                        schedule_doc['day'],
                        schedule_doc['period'],
                        schedule_doc['subject'],
                        schedule_doc['class_name'],
                        schedule_doc['updated_at']
                    ))

        conn.commit()

@app.on_event("startup")
async def startup_event():
    # Initialize database tables first
    init_database()
    # Then initialize demo data
    await init_demo_data()

import re
import html

# ============ Security Functions ============

def sanitize_input(text: str) -> str:
    """Sanitize user input to prevent XSS and injection attacks"""
    if not text:
        return text

    # Remove potentially dangerous characters
    text = re.sub(r'[<>]', '', text)

    # Escape HTML entities
    text = html.escape(text)

    # Remove SQL injection patterns (basic)
    text = re.sub(r'(--|#|/\*|\*/)', '', text)

    # Trim and limit length
    text = text.strip()
    if len(text) > 200:  # Reasonable max length
        text = text[:200]

    return text

def validate_username(username: str) -> bool:
    """Validate username format"""
    if not username or len(username) < 3 or len(username) > 50:
        return False
    # Only allow alphanumeric, underscore, and hyphen
    return bool(re.match(r'^[a-zA-Z0-9_-]+$', username))

def validate_password(password: str) -> bool:
    """Validate password strength"""
    if not password or len(password) < 6:
        return False
    return True

# ============ Rate Limiting ============

async def rate_limit_middleware(request: Request, call_next):
    """Custom rate limiting middleware"""
    client_ip = request.client.host if request.client else request.headers.get('x-forwarded-for', 'unknown')

    # Stricter limits for login endpoint
    is_login = request.url.path == '/api/auth/login'

    if not rate_limiter.is_allowed(client_ip, is_login):
        return JSONResponse(
            status_code=429,
            content={"detail": "Too many requests. Please slow down."}
        )

    response = await call_next(request)
    return response

# Add rate limiting middleware
app.middleware("http")(rate_limit_middleware)

# ============ Auth Routes ============

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(request: Request, credentials: UserLogin, response: Response):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE username = ?", (credentials.username,))
        user_row = cursor.fetchone()

        if not user_row or not verify_password(credentials.password, user_row['password_hash']):
            raise HTTPException(status_code=401, detail="Invalid username or password")

        # Convert row to dict and handle datetime
        user_data = dict(user_row)
        if isinstance(user_data.get('created_at'), str):
            user_data['created_at'] = datetime.fromisoformat(user_data['created_at'])

        user = User(**{k: v for k, v in user_data.items() if k != 'password_hash'})
        token = create_token(user.id, user.username, user.role)

        # Set httpOnly cookie for secure token storage
        response.set_cookie(
            key="access_token",
            value=token,
            httponly=True,
            secure=False,  # Set to True in production with HTTPS
            samesite="lax",
            max_age=7*24*60*60  # 7 days
        )

        return TokenResponse(token=token, user=user)

@api_router.get("/auth/verify")
async def verify_token(current_user: User = Depends(get_current_user)):
    return {"valid": True, "user": current_user}

@api_router.post("/auth/logout")
async def logout(response: Response):
    """Clear the authentication cookie"""
    response.delete_cookie(
        key="access_token",
        httponly=True,
        secure=False,  # Set to True in production with HTTPS
        samesite="lax"
    )
    return {"message": "Logged out successfully"}

# ============ User Routes ============

@api_router.get("/users", response_model=List[User])
async def get_users(current_user: User = Depends(get_current_user)):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, username, name, role, created_at FROM users")
        users_data = cursor.fetchall()

        users = []
        for user_data in users_data:
            user_dict = dict(user_data)
            if isinstance(user_dict.get('created_at'), str):
                user_dict['created_at'] = datetime.fromisoformat(user_dict['created_at'])
            users.append(User(**user_dict))

        return users

@api_router.post("/users", response_model=User)
async def create_user(user_data: UserCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")

    # Validate and sanitize inputs
    username = sanitize_input(user_data.username)
    name = sanitize_input(user_data.name)

    if not validate_username(username):
        raise HTTPException(status_code=400, detail="Invalid username format")

    if not validate_password(user_data.password):
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    with get_db_connection() as conn:
        cursor = conn.cursor()

        # Check if username exists
        cursor.execute("SELECT COUNT(*) FROM users WHERE username = ?", (username,))
        if cursor.fetchone()[0] > 0:
            raise HTTPException(status_code=400, detail="Username already exists")

        user = User(
            username=username,
            name=name,
            role=user_data.role
        )

        user_doc = user.model_dump()
        user_doc['created_at'] = user_doc['created_at'].isoformat()
        user_doc['password_hash'] = hash_password(user_data.password)

        cursor.execute("""
            INSERT INTO users (id, username, name, role, password_hash, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            user_doc['id'],
            user_doc['username'],
            user_doc['name'],
            user_doc['role'],
            user_doc['password_hash'],
            user_doc['created_at']
        ))

        conn.commit()
        return user

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")

    with get_db_connection() as conn:
        cursor = conn.cursor()

        # Check if user exists
        cursor.execute("SELECT COUNT(*) FROM users WHERE id = ?", (user_id,))
        if cursor.fetchone()[0] == 0:
            raise HTTPException(status_code=404, detail="User not found")

        # Delete associated schedules and changelogs
        cursor.execute("DELETE FROM changelogs WHERE teacher_id = ?", (user_id,))
        cursor.execute("DELETE FROM schedules WHERE teacher_id = ?", (user_id,))
        cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))

        conn.commit()

        return {"message": "User deleted successfully"}

@api_router.post("/users/change-password")
async def change_password(password_data: PasswordChange, current_user: User = Depends(get_current_user)):
    """Allow users to change their own password"""
    with get_db_connection() as conn:
        cursor = conn.cursor()

        # Get current user data including password hash
        cursor.execute("SELECT password_hash FROM users WHERE id = ?", (current_user.id,))
        user_row = cursor.fetchone()

        if not user_row:
            raise HTTPException(status_code=404, detail="User not found")

        # Verify old password
        if not verify_password(password_data.old_password, user_row['password_hash']):
            raise HTTPException(status_code=400, detail="Current password is incorrect")

        # Hash new password and update
        new_hash = hash_password(password_data.new_password)
        cursor.execute(
            "UPDATE users SET password_hash = ? WHERE id = ?",
            (new_hash, current_user.id)
        )

        conn.commit()

        return {"message": "Password changed successfully"}

@api_router.post("/users/{user_id}/reset-password")
async def reset_password(user_id: str, new_password: str, current_user: User = Depends(get_current_user)):
    """Allow admins to reset other users' passwords"""
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")

    with get_db_connection() as conn:
        cursor = conn.cursor()

        # Check if user exists
        cursor.execute("SELECT COUNT(*) FROM users WHERE id = ?", (user_id,))
        if cursor.fetchone()[0] == 0:
            raise HTTPException(status_code=404, detail="User not found")

        # Hash new password and update
        new_hash = hash_password(new_password)
        cursor.execute(
            "UPDATE users SET password_hash = ? WHERE id = ?",
            (new_hash, user_id)
        )

        conn.commit()

        return {"message": "Password reset successfully"}

# ============ Schedule Routes ============

@api_router.get("/schedules", response_model=List[ScheduleEntry])
async def get_schedules(teacher_id: Optional[str] = None, current_user: User = Depends(get_current_user)):
    with get_db_connection() as conn:
        cursor = conn.cursor()

        # Build query based on user role and filters
        query_parts = []
        params = []

        if current_user.role == 'teacher':
            query_parts.append("teacher_id = ?")
            params.append(current_user.id)
        elif teacher_id:
            query_parts.append("teacher_id = ?")
            params.append(teacher_id)

        query = "SELECT * FROM schedules"
        if query_parts:
            query += " WHERE " + " AND ".join(query_parts)

        cursor.execute(query, params)
        schedules_data = cursor.fetchall()

        schedules = []
        for schedule_data in schedules_data:
            schedule_dict = dict(schedule_data)
            if isinstance(schedule_dict.get('updated_at'), str):
                schedule_dict['updated_at'] = datetime.fromisoformat(schedule_dict['updated_at'])
            schedules.append(ScheduleEntry(**schedule_dict))

        return schedules

@api_router.post("/schedules", response_model=ScheduleEntry)
async def create_schedule(schedule_data: ScheduleCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")

    # Sanitize inputs
    subject = sanitize_input(schedule_data.subject)
    class_name = sanitize_input(schedule_data.class_name)

    with get_db_connection() as conn:
        cursor = conn.cursor()

        # Check for class conflicts - same class, same time
        cursor.execute("""
            SELECT COUNT(*) FROM schedules
            WHERE day = ? AND period = ? AND class_name = ?
        """, (schedule_data.day, schedule_data.period, class_name))

        if cursor.fetchone()[0] > 0:
            raise HTTPException(status_code=400, detail="Schedule conflict: This class already has a lesson at this time")

        # Check for teacher conflicts - same teacher, same time
        cursor.execute("""
            SELECT COUNT(*) FROM schedules
            WHERE day = ? AND period = ? AND teacher_id = ?
        """, (schedule_data.day, schedule_data.period, schedule_data.teacher_id))

        if cursor.fetchone()[0] > 0:
            raise HTTPException(status_code=400, detail=f"Schedule conflict: {schedule_data.teacher_name} already has a class at this time")

        schedule = ScheduleEntry(
            teacher_id=schedule_data.teacher_id,
            teacher_name=sanitize_input(schedule_data.teacher_name),
            day=schedule_data.day,
            period=schedule_data.period,
            subject=subject,
            class_name=class_name
        )
        schedule_doc = schedule.model_dump()
        schedule_doc['updated_at'] = schedule_doc['updated_at'].isoformat()

        cursor.execute("""
            INSERT INTO schedules (id, teacher_id, teacher_name, day, period, subject, class_name, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            schedule_doc['id'],
            schedule_doc['teacher_id'],
            schedule_doc['teacher_name'],
            schedule_doc['day'],
            schedule_doc['period'],
            schedule_doc['subject'],
            schedule_doc['class_name'],
            schedule_doc['updated_at']
        ))

        conn.commit()
        return schedule

@api_router.put("/schedules/{schedule_id}", response_model=ScheduleEntry)
async def update_schedule(schedule_id: str, update_data: ScheduleUpdate, current_user: User = Depends(get_current_user)):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")

    with get_db_connection() as conn:
        cursor = conn.cursor()

        # Get existing schedule
        cursor.execute("SELECT * FROM schedules WHERE id = ?", (schedule_id,))
        existing_row = cursor.fetchone()

        if not existing_row:
            raise HTTPException(status_code=404, detail="Schedule not found")

        existing = dict(existing_row)

        # Determine final values (use existing if not provided in update)
        final_subject = update_data.subject if update_data.subject is not None else existing['subject']
        final_class_name = update_data.class_name if update_data.class_name is not None else existing['class_name']

        # Sanitize inputs
        final_subject = sanitize_input(final_subject)
        final_class_name = sanitize_input(final_class_name)

        # Only check for conflicts if subject or class_name is being changed
        if update_data.subject is not None or update_data.class_name is not None:
            # Check for class conflicts - same class, same time (excluding current schedule)
            cursor.execute("""
                SELECT COUNT(*) FROM schedules
                WHERE day = ? AND period = ? AND class_name = ? AND id != ?
            """, (existing['day'], existing['period'], final_class_name, schedule_id))

            if cursor.fetchone()[0] > 0:
                raise HTTPException(status_code=400, detail="Schedule conflict: This class already has a lesson at this time")

            # Check for teacher conflicts - same teacher, same time (excluding current schedule)
            cursor.execute("""
                SELECT COUNT(*) FROM schedules
                WHERE day = ? AND period = ? AND teacher_id = ? AND id != ?
            """, (existing['day'], existing['period'], existing['teacher_id'], schedule_id))

            if cursor.fetchone()[0] > 0:
                raise HTTPException(status_code=400, detail=f"Schedule conflict: {existing['teacher_name']} already has a class at this time")

        # Log the change if there are updates
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
                new_value=final_subject + ' - ' + final_class_name,
                changed_by=current_user.name
            )
            changelog_doc = changelog.model_dump()
            changelog_doc['timestamp'] = changelog_doc['timestamp'].isoformat()

            cursor.execute("""
                INSERT INTO changelogs (id, schedule_id, teacher_id, teacher_name, day, period, old_value, new_value, changed_by, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                changelog_doc['id'],
                changelog_doc['schedule_id'],
                changelog_doc['teacher_id'],
                changelog_doc['teacher_name'],
                changelog_doc['day'],
                changelog_doc['period'],
                changelog_doc['old_value'],
                changelog_doc['new_value'],
                changelog_doc['changed_by'],
                changelog_doc['timestamp']
            ))

        # Update schedule
        update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
        update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()

        set_parts = [f"{k} = ?" for k in update_dict.keys()]
        values = list(update_dict.values()) + [schedule_id]

        cursor.execute(f"""
            UPDATE schedules
            SET {', '.join(set_parts)}
            WHERE id = ?
        """, values)

        # Get updated schedule
        cursor.execute("SELECT * FROM schedules WHERE id = ?", (schedule_id,))
        updated_row = cursor.fetchone()
        updated = dict(updated_row)

        conn.commit()

        if isinstance(updated.get('updated_at'), str):
            updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])

        return ScheduleEntry(**updated)

@api_router.delete("/schedules/{schedule_id}")
async def delete_schedule(schedule_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")

    with get_db_connection() as conn:
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) FROM schedules WHERE id = ?", (schedule_id,))
        if cursor.fetchone()[0] == 0:
            raise HTTPException(status_code=404, detail="Schedule not found")

        cursor.execute("DELETE FROM schedules WHERE id = ?", (schedule_id,))
        conn.commit()

        return {"message": "Schedule deleted successfully"}

# ============ Settings Routes ============

@api_router.get("/settings/break-period")
async def get_break_settings():
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM settings WHERE id = ?", ("break_settings",))
        settings_row = cursor.fetchone()

        if not settings_row:
            # Create default settings
            settings = Settings()
            settings_doc = settings.model_dump()
            settings_doc['updated_at'] = settings_doc['updated_at'].isoformat()

            cursor.execute("""
                INSERT INTO settings (id, break_after_period, updated_at)
                VALUES (?, ?, ?)
            """, (
                settings_doc['id'],
                settings_doc['break_after_period'],
                settings_doc['updated_at']
            ))
            conn.commit()
        else:
            settings_doc = dict(settings_row)

        if isinstance(settings_doc.get('updated_at'), str):
            settings_doc['updated_at'] = datetime.fromisoformat(settings_doc['updated_at'])

        return Settings(**settings_doc)

@api_router.put("/settings/break-period")
async def update_break_settings(break_after: int, current_user: User = Depends(get_current_user)):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")

    if break_after not in [3, 4]:
        raise HTTPException(status_code=400, detail="Break can only be after period 3 or 4")

    with get_db_connection() as conn:
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE settings
            SET break_after_period = ?, updated_at = ?
            WHERE id = ?
        """, (
            break_after,
            datetime.now(timezone.utc).isoformat(),
            "break_settings"
        ))

        conn.commit()

        return {"break_after_period": break_after}

# ============ Changelog Routes ============

@api_router.get("/changelogs", response_model=List[ChangeLog])
async def get_changelogs(teacher_id: Optional[str] = None, current_user: User = Depends(get_current_user)):
    with get_db_connection() as conn:
        cursor = conn.cursor()

        # Build query based on user role and filters
        query_parts = []
        params = []

        if current_user.role == 'teacher':
            query_parts.append("teacher_id = ?")
            params.append(current_user.id)
        elif teacher_id:
            query_parts.append("teacher_id = ?")
            params.append(teacher_id)

        query = "SELECT * FROM changelogs"
        if query_parts:
            query += " WHERE " + " AND ".join(query_parts)

        query += " ORDER BY timestamp DESC LIMIT 100"

        cursor.execute(query, params)
        changelogs_data = cursor.fetchall()

        changelogs = []
        for log_data in changelogs_data:
            log_dict = dict(log_data)
            if isinstance(log_dict.get('timestamp'), str):
                log_dict['timestamp'] = datetime.fromisoformat(log_dict['timestamp'])
            changelogs.append(ChangeLog(**log_dict))

        return changelogs

import csv
import io
from typing import List, Dict

# ============ Bulk Import/Export Routes ============

@api_router.post("/bulk/import-schedules")
async def import_schedules_csv(file: bytes = File(...), current_user: User = Depends(get_current_user)):
    """Import schedules from CSV file (Admin only)"""
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")

    try:
        # Parse CSV content
        content = file.decode('utf-8')
        csv_reader = csv.DictReader(io.StringIO(content))

        imported_count = 0
        errors = []

        with get_db_connection() as conn:
            cursor = conn.cursor()

            # Get all teachers for validation
            cursor.execute("SELECT id, name FROM users WHERE role = ?", ("teacher",))
            teachers = {row['name']: row['id'] for row in cursor.fetchall()}

            for row_num, row in enumerate(csv_reader, start=2):
                try:
                    # Validate required fields
                    teacher_name = sanitize_input(row.get('teacher_name', '').strip())
                    day = sanitize_input(row.get('day', '').strip())
                    period_str = row.get('period', '').strip()
                    subject = sanitize_input(row.get('subject', '').strip())
                    class_name = sanitize_input(row.get('class_name', '').strip())

                    if not all([teacher_name, day, period_str, subject, class_name]):
                        errors.append(f"Row {row_num}: Missing required fields")
                        continue

                    # Validate teacher exists
                    if teacher_name not in teachers:
                        errors.append(f"Row {row_num}: Teacher '{teacher_name}' not found")
                        continue

                    # Validate period
                    try:
                        period = int(period_str)
                        if period < 1 or period > 8:
                            raise ValueError()
                    except ValueError:
                        errors.append(f"Row {row_num}: Invalid period '{period_str}'")
                        continue

                    # Validate day
                    valid_days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
                    if day not in valid_days:
                        errors.append(f"Row {row_num}: Invalid day '{day}'")
                        continue

                    # Check for conflicts
                    cursor.execute("""
                        SELECT COUNT(*) FROM schedules
                        WHERE day = ? AND period = ? AND class_name = ?
                    """, (day, period, class_name))

                    if cursor.fetchone()[0] > 0:
                        errors.append(f"Row {row_num}: Class conflict for {class_name} at {day} P{period}")
                        continue

                    cursor.execute("""
                        SELECT COUNT(*) FROM schedules
                        WHERE day = ? AND period = ? AND teacher_id = ?
                    """, (day, period, teachers[teacher_name]))

                    if cursor.fetchone()[0] > 0:
                        errors.append(f"Row {row_num}: Teacher conflict for {teacher_name} at {day} P{period}")
                        continue

                    # Create schedule entry
                    schedule = ScheduleEntry(
                        teacher_id=teachers[teacher_name],
                        teacher_name=teacher_name,
                        day=day,
                        period=period,
                        subject=subject,
                        class_name=class_name
                    )

                    schedule_doc = schedule.model_dump()
                    schedule_doc['updated_at'] = schedule_doc['updated_at'].isoformat()

                    cursor.execute("""
                        INSERT INTO schedules (id, teacher_id, teacher_name, day, period, subject, class_name, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        schedule_doc['id'],
                        schedule_doc['teacher_id'],
                        schedule_doc['teacher_name'],
                        schedule_doc['day'],
                        schedule_doc['period'],
                        schedule_doc['subject'],
                        schedule_doc['class_name'],
                        schedule_doc['updated_at']
                    ))

                    imported_count += 1

                except Exception as e:
                    errors.append(f"Row {row_num}: {str(e)}")

            conn.commit()

        return {
            "message": f"Imported {imported_count} schedules successfully",
            "imported_count": imported_count,
            "errors": errors[:10]  # Limit error messages
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Import failed: {str(e)}")

@api_router.get("/bulk/export-schedules")
async def export_schedules_csv(current_user: User = Depends(get_current_user)):
    """Export all schedules to CSV (Admin only)"""
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT teacher_name, day, period, subject, class_name, updated_at
            FROM schedules
            ORDER BY day, period, teacher_name
        """)

        schedules = cursor.fetchall()

        # Create CSV content
        output = io.StringIO()
        writer = csv.writer(output)

        # Write header
        writer.writerow(['teacher_name', 'day', 'period', 'subject', 'class_name', 'updated_at'])

        # Write data
        for schedule in schedules:
            writer.writerow([
                schedule['teacher_name'],
                schedule['day'],
                schedule['period'],
                schedule['subject'],
                schedule['class_name'],
                schedule['updated_at']
            ])

        csv_content = output.getvalue()
        output.close()

        return Response(
            content=csv_content,
            media_type='text/csv',
            headers={
                'Content-Disposition': 'attachment; filename="schedules_export.csv"'
            }
        )

# ============ Error Logging Routes ============

@api_router.post("/error-logs")
async def log_frontend_error(
    error_data: dict,
    request: Request
):
    """Log frontend errors for debugging and monitoring"""
    try:
        # Get client IP and other request info
        client_ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "unknown")

        # Log to server logs
        logger.warning(f"Frontend Error from {client_ip}: {error_data}")

        # Store error in database (optional - create error_logs table if needed)
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS error_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    error TEXT NOT NULL,
                    context TEXT,
                    timestamp TEXT NOT NULL,
                    user_agent TEXT,
                    url TEXT,
                    client_ip TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ''')

            cursor.execute('''
                INSERT INTO error_logs (error, context, timestamp, user_agent, url, client_ip)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                error_data.get('error', ''),
                error_data.get('context', ''),
                error_data.get('timestamp', ''),
                error_data.get('userAgent', ''),
                error_data.get('url', ''),
                client_ip
            ))

            conn.commit()

        return {"status": "logged"}

    except Exception as e:
        logger.error(f"Failed to log error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to log error")

# ============ Performance Monitoring Routes ============

@app.middleware("http")
async def performance_monitoring(request: Request, call_next):
    """Middleware to track API performance metrics"""
    start_time = time.time()

    response = await call_next(request)

    # Calculate response time
    process_time = time.time() - start_time

    # Log slow requests (>500ms)
    if process_time > 0.5:
        logger.warning(f"Slow request: {request.method} {request.url.path} took {process_time:.2f}s")

    # Add performance headers
    response.headers["X-Process-Time"] = str(process_time)
    response.headers["X-API-Version"] = "1.0.0"

    return response

@api_router.get("/performance/metrics")
async def get_performance_metrics(current_user: User = Depends(get_current_user)):
    """Get performance metrics (Admin only)"""
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")

    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()

            # Get API usage statistics
            cursor.execute('''
                SELECT
                    COUNT(*) as total_requests,
                    AVG(CASE WHEN created_at >= datetime('now', '-1 hour') THEN 1 ELSE 0 END) as requests_per_hour,
                    COUNT(DISTINCT CASE WHEN created_at >= datetime('now', '-24 hours') THEN client_ip END) as unique_users_24h
                FROM error_logs
                WHERE created_at >= datetime('now', '-30 days')
            ''')

            stats = cursor.fetchone()

            # Get error rates
            cursor.execute('''
                SELECT
                    COUNT(*) as total_errors,
                    COUNT(CASE WHEN created_at >= datetime('now', '-24 hours') THEN 1 END) as errors_24h
                FROM error_logs
                WHERE created_at >= datetime('now', '-7 days')
            ''')

            errors = cursor.fetchone()

            return {
                "api_metrics": {
                    "total_requests": stats[0] if stats else 0,
                    "requests_per_hour": stats[1] if stats else 0,
                    "unique_users_24h": stats[2] if stats else 0,
                    "error_rate": (errors[1] / max(errors[0], 1)) * 100 if errors and errors[0] > 0 else 0
                },
                "system_info": {
                    "uptime": "N/A",  # Would need to track server start time
                    "memory_usage": "N/A",  # Would need system monitoring
                    "cpu_usage": "N/A"
                }
            }

    except Exception as e:
        logger.error(f"Failed to get performance metrics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve metrics")

# ============ Demo Data Routes ============

@api_router.post("/demo/load-schedules")
async def load_demo_schedules_endpoint(current_user: User = Depends(get_current_user)):
    """Load comprehensive demo timetable data for all teachers (Admin only)"""
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")

    with get_db_connection() as conn:
        cursor = conn.cursor()

        # Clear existing schedules and changelogs
        cursor.execute("DELETE FROM schedules")
        cursor.execute("DELETE FROM changelogs")

        # Load demo data
        await load_demo_schedules()

        conn.commit()

    return {"message": "Demo schedules loaded successfully", "status": "success"}

@api_router.post("/demo/clear-schedules")
async def clear_all_schedules(current_user: User = Depends(get_current_user)):
    """Clear all schedules and changelogs (Admin only)"""
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")

    with get_db_connection() as conn:
        cursor = conn.cursor()

        cursor.execute("DELETE FROM schedules")
        cursor.execute("DELETE FROM changelogs")

        conn.commit()

    return {"message": "All schedules cleared successfully", "status": "success"}

# Add security headers middleware
# class SecurityHeadersMiddleware(BaseHTTPMiddleware):
#     async def dispatch(self, request, call_next):
#         response = await call_next(request)

#         # Security headers (relaxed for development)
#         response.headers['X-Content-Type-Options'] = 'nosniff'
#         response.headers['X-Frame-Options'] = 'DENY'
#         response.headers['X-XSS-Protection'] = '1; mode=block'
#         response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'

#         # Temporarily disable CSP for development to resolve navigation issues
#         # response.headers['Content-Security-Policy'] = csp

#         return response

# Include the router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add security middleware AFTER CORS
# app.add_middleware(SecurityHeadersMiddleware)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    # Initialize database tables
    init_database()

    # Initialize demo data
    await init_demo_data()

@app.on_event("shutdown")
async def shutdown_db_client():
    # SQLite connections are automatically closed when context managers exit
    # No explicit cleanup needed for file-based SQLite
    pass
