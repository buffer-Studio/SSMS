from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from sqlalchemy import Column, String, Integer, DateTime, select, delete
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# SQLite connection
database_url = os.environ['DATABASE_URL']
engine = create_async_engine(database_url, echo=True)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def create_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

class Base(DeclarativeBase):
    pass

class UserTable(Base):
    __tablename__ = 'users'
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.now(timezone.utc))

class ScheduleTable(Base):
    __tablename__ = 'schedules'
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    teacher_id = Column(String, nullable=False)
    teacher_name = Column(String, nullable=False)
    day = Column(String, nullable=False)
    period = Column(Integer, nullable=False)
    subject = Column(String, nullable=False)
    class_name = Column(String, nullable=False)
    updated_at = Column(DateTime, default=datetime.now(timezone.utc))

class SettingsTable(Base):
    __tablename__ = 'settings'
    id = Column(String, primary_key=True, default="break_settings")
    break_after_period = Column(Integer, default=3)
    updated_at = Column(DateTime, default=datetime.now(timezone.utc))

class ChangelogTable(Base):
    __tablename__ = 'changelogs'
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    schedule_id = Column(String, nullable=False)
    teacher_id = Column(String, nullable=False)
    teacher_name = Column(String, nullable=False)
    day = Column(String, nullable=False)
    period = Column(Integer, nullable=False)
    old_value = Column(String, nullable=False)
    new_value = Column(String, nullable=False)
    changed_by = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.now(timezone.utc))

# Security setup
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

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

async def get_db():
    async with async_session() as session:
        yield session

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), session: AsyncSession = Depends(get_db)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")

        stmt = select(UserTable).where(UserTable.id == user_id)
        result = await session.execute(stmt)
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")

        return User(id=user.id, username=user.username, name=user.name, role=user.role, created_at=user.created_at)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============ Initialize Demo Data ============

@app.on_event("startup")
async def startup_event():
    await create_tables()
    async with async_session() as session:
        await init_demo_data(session)

# ============ Auth Routes ============

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin, session: AsyncSession = Depends(get_db)):
    stmt = select(UserTable).where(UserTable.username == credentials.username)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    user_obj = User(id=user.id, username=user.username, name=user.name, role=user.role, created_at=user.created_at)
    token = create_token(user.id, user.username, user.role)

    return TokenResponse(token=token, user=user_obj)

@api_router.get("/auth/verify")
async def verify_token(current_user: User = Depends(get_current_user)):
    return {"valid": True, "user": current_user}

# ============ User Routes ============

@api_router.get("/users", response_model=List[User])
async def get_users(current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")

    stmt = select(UserTable).where(UserTable.role != 'admin')
    result = await session.execute(stmt)
    users = result.scalars().all()
    return [User(id=user.id, username=user.username, name=user.name, role=user.role, created_at=user.created_at) for user in users]

@api_router.post("/users", response_model=User)
async def create_user(user_data: UserCreate, current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")

    # Check if username exists
    stmt = select(UserTable).where(UserTable.username == user_data.username)
    result = await session.execute(stmt)
    exists = result.scalar_one_or_none()
    if exists:
        raise HTTPException(status_code=400, detail="Username already exists")

    user = UserTable(
        username=user_data.username,
        name=user_data.name,
        role=user_data.role,
        password_hash=hash_password(user_data.password)
    )

    session.add(user)
    await session.commit()
    await session.refresh(user)
    return User(id=user.id, username=user.username, name=user.name, role=user.role, created_at=user.created_at)

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")

    stmt = select(UserTable).where(UserTable.id == user_id)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Delete associated schedules
    await session.execute(delete(ScheduleTable).where(ScheduleTable.teacher_id == user_id))
    await session.delete(user)
    await session.commit()
    return {"message": "User deleted successfully"}

# ============ Schedule Routes ============

@api_router.get("/schedules", response_model=List[ScheduleEntry])
async def get_schedules(teacher_id: Optional[str] = None, current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    query = select(ScheduleTable)
    if current_user.role == 'teacher':
        query = query.where(ScheduleTable.teacher_id == current_user.id)
    elif teacher_id:
        query = query.where(ScheduleTable.teacher_id == teacher_id)

    result = await session.execute(query)
    schedules = result.scalars().all()
    return [ScheduleEntry(
        id=s.id,
        teacher_id=s.teacher_id,
        teacher_name=s.teacher_name,
        day=s.day,
        period=s.period,
        subject=s.subject,
        class_name=s.class_name,
        updated_at=s.updated_at
    ) for s in schedules]

@api_router.post("/schedules", response_model=ScheduleEntry)
async def create_schedule(schedule_data: ScheduleCreate, current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")

    # Check for conflicts
    stmt = select(ScheduleTable).where(
        ScheduleTable.day == schedule_data.day,
        ScheduleTable.period == schedule_data.period,
        ScheduleTable.class_name == schedule_data.class_name
    )
    result = await session.execute(stmt)
    conflict = result.scalar_one_or_none()

    if conflict:
        raise HTTPException(status_code=400, detail="Schedule conflict: This class already has a lesson at this time")

    schedule = ScheduleTable(**schedule_data.model_dump())
    session.add(schedule)
    await session.commit()
    await session.refresh(schedule)
    return ScheduleEntry(
        id=schedule.id,
        teacher_id=schedule.teacher_id,
        teacher_name=schedule.teacher_name,
        day=schedule.day,
        period=schedule.period,
        subject=schedule.subject,
        class_name=schedule.class_name,
        updated_at=schedule.updated_at
    )

@api_router.put("/schedules/{schedule_id}", response_model=ScheduleEntry)
async def update_schedule(schedule_id: str, update_data: ScheduleUpdate, current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")

    stmt = select(ScheduleTable).where(ScheduleTable.id == schedule_id)
    result = await session.execute(stmt)
    existing = result.scalar_one_or_none()
    if not existing:
        raise HTTPException(status_code=404, detail="Schedule not found")

    # Log the change
    changes = []
    if update_data.subject and update_data.subject != existing.subject:
        changes.append(f"Subject: {existing.subject} → {update_data.subject}")
    if update_data.class_name and update_data.class_name != existing.class_name:
        changes.append(f"Class: {existing.class_name} → {update_data.class_name}")

    if changes:
        changelog = ChangelogTable(
            schedule_id=schedule_id,
            teacher_id=existing.teacher_id,
            teacher_name=existing.teacher_name,
            day=existing.day,
            period=existing.period,
            old_value=existing.subject + ' - ' + existing.class_name,
            new_value=(update_data.subject or existing.subject) + ' - ' + (update_data.class_name or existing.class_name),
            changed_by=current_user.name
        )
        session.add(changelog)

    # Update
    if update_data.subject:
        existing.subject = update_data.subject
    if update_data.class_name:
        existing.class_name = update_data.class_name
    existing.updated_at = datetime.now(timezone.utc)

    await session.commit()
    return ScheduleEntry(
        id=existing.id,
        teacher_id=existing.teacher_id,
        teacher_name=existing.teacher_name,
        day=existing.day,
        period=existing.period,
        subject=existing.subject,
        class_name=existing.class_name,
        updated_at=existing.updated_at
    )

@api_router.delete("/schedules/{schedule_id}")
async def delete_schedule(schedule_id: str, current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")

    stmt = select(ScheduleTable).where(ScheduleTable.id == schedule_id)
    result = await session.execute(stmt)
    schedule = result.scalar_one_or_none()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    await session.delete(schedule)
    await session.commit()
    return {"message": "Schedule deleted successfully"}

# ============ Settings Routes ============

@api_router.get("/settings/break-period")
async def get_break_settings(session: AsyncSession = Depends(get_db)):
    stmt = select(SettingsTable).where(SettingsTable.id == "break_settings")
    result = await session.execute(stmt)
    settings = result.scalar_one_or_none()
    if not settings:
        settings = SettingsTable()
        session.add(settings)
        await session.commit()
        await session.refresh(settings)

    return Settings(
        id=settings.id,
        break_after_period=settings.break_after_period,
        updated_at=settings.updated_at
    )

@api_router.put("/settings/break-period")
async def update_break_settings(break_after: int, current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")

    if break_after not in [3, 4]:
        raise HTTPException(status_code=400, detail="Break can only be after period 3 or 4")

    stmt = select(SettingsTable).where(SettingsTable.id == "break_settings")
    result = await session.execute(stmt)
    settings = result.scalar_one_or_none()
    if settings:
        settings.break_after_period = break_after
        settings.updated_at = datetime.now(timezone.utc)
    else:
        settings = SettingsTable(break_after_period=break_after)
        session.add(settings)

    await session.commit()
    await session.refresh(settings)
    return {"break_after_period": break_after}

# ============ Changelog Routes ============

@api_router.get("/changelogs", response_model=List[ChangeLog])
async def get_changelogs(teacher_id: Optional[str] = None, current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    query = select(ChangelogTable)
    if current_user.role == 'teacher':
        query = query.where(ChangelogTable.teacher_id == current_user.id)
    elif teacher_id:
        query = query.where(ChangelogTable.teacher_id == teacher_id)

    query = query.order_by(ChangelogTable.timestamp.desc())
    result = await session.execute(query)
    changelogs = result.scalars().all()
    return [ChangeLog(
        id=log.id,
        schedule_id=log.schedule_id,
        teacher_id=log.teacher_id,
        teacher_name=log.teacher_name,
        day=log.day,
        period=log.period,
        old_value=log.old_value,
        new_value=log.new_value,
        changed_by=log.changed_by,
        timestamp=log.timestamp
    ) for log in changelogs]

# ============ Demo Data Routes ============

@api_router.post("/demo/load-schedules")
async def load_demo_schedules_endpoint(current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    """Load comprehensive demo timetable data for all teachers (Admin only)"""
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")

    # Clear existing schedules
    await session.execute(delete(ScheduleTable))
    await session.execute(delete(ChangelogTable))

    # Load demo data
    teacher_ids = {}
    stmt = select(UserTable).where(UserTable.role == "teacher")
    result = await session.execute(stmt)
    teachers = result.scalars().all()
    for teacher in teachers:
        teacher_ids[teacher.name] = teacher.id

    await load_demo_schedules(session, teacher_ids)
    await session.commit()

    return {"message": "Demo schedules loaded successfully", "status": "success"}

@api_router.post("/demo/clear-schedules")
async def clear_all_schedules(current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    """Clear all schedules and changelogs (Admin only)"""
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")

    await session.execute(delete(ScheduleTable))
    await session.execute(delete(ChangelogTable))
    await session.commit()

    return {"message": "All schedules cleared successfully", "status": "success"}

async def init_demo_data(session: AsyncSession):
    # Check if admin exists
    stmt = select(UserTable).where(UserTable.username == "admin123")
    result = await session.execute(stmt)
    admin = result.scalar_one_or_none()
    if not admin:
        admin_user = UserTable(
            username="admin123",
            name="Administrator",
            role="admin",
            password_hash=hash_password("password123")
        )
        session.add(admin_user)
        await session.commit()
        await session.refresh(admin_user)
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
        stmt = select(UserTable).where(UserTable.username == teacher["username"])
        result = await session.execute(stmt)
        exists = result.scalar_one_or_none()
        if not exists:
            user = UserTable(
                username=teacher["username"],
                name=teacher["name"],
                role="teacher",
                password_hash=hash_password(teacher["password"])
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)
            teacher_ids[teacher["name"]] = user.id
            logger.info(f"Teacher {teacher['name']} created")
        else:
            teacher_ids[teacher["name"]] = exists.id

    # Initialize settings
    stmt = select(SettingsTable).where(SettingsTable.id == "break_settings")
    result = await session.execute(stmt)
    settings = result.scalar_one_or_none()
    if not settings:
        settings = SettingsTable()
        session.add(settings)
        await session.commit()
        await session.refresh(settings)
        logger.info("Settings initialized")

    # Load demo schedules if none exist
    stmt = select(ScheduleTable).limit(1)
    result = await session.execute(stmt)
    schedule_exists = result.scalar_one_or_none()
    if not schedule_exists:
        await load_demo_schedules(session, teacher_ids)
        logger.info("Demo schedules loaded")

async def load_demo_schedules(session: AsyncSession, teacher_ids: dict):
    """Load comprehensive demo timetable data for all teachers"""

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
    for teacher_name, schedules in demo_schedules.items():
        if teacher_name in teacher_ids:
            teacher_id = teacher_ids[teacher_name]
            for schedule_data in schedules:
                schedule = ScheduleTable(
                    teacher_id=teacher_id,
                    teacher_name=teacher_name,
                    day=schedule_data["day"],
                    period=schedule_data["period"],
                    subject=schedule_data["subject"],
                    class_name=schedule_data["class_name"]
                )
                session.add(schedule)
    await session.commit()

# Include the router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    await engine.dispose()
