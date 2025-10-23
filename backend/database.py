"""
Database adapter using SQLite for the SSMS application.
Provides async interface for database operations.
"""
import sqlite3
import json
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from pathlib import Path

logger = logging.getLogger(__name__)

class SQLiteAdapter:
    """SQLite adapter that provides async interface."""
    
    def __init__(self, db_path: str = "ssms_database.db"):
        self.db_path = Path(__file__).parent / db_path
        self.init_db()
    
    def init_db(self):
        """Initialize SQLite database with tables."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Users table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                name TEXT NOT NULL,
                role TEXT NOT NULL,
                designation TEXT,
                created_at TEXT NOT NULL,
                password_history TEXT DEFAULT '[]'
            )
        """)
        
        # Add designation column if it doesn't exist (for existing databases)
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN designation TEXT")
            logger.info("✓ Added designation column to users table")
        except sqlite3.OperationalError as e:
            logger.info(f"• designation column: {e}")
        
        # Add password_history column if it doesn't exist (for existing databases)
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN password_history TEXT DEFAULT '[]'")
            logger.info("✓ Added password_history column to users table")
        except sqlite3.OperationalError as e:
            logger.info(f"• password_history column: {e}")
        
        # Schedules table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS schedules (
                id TEXT PRIMARY KEY,
                teacher_id TEXT NOT NULL,
                teacher_name TEXT NOT NULL,
                day TEXT NOT NULL,
                period INTEGER NOT NULL,
                subject TEXT NOT NULL,
                class_name TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        
        # Settings table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS settings (
                id TEXT PRIMARY KEY,
                break_after_period INTEGER NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        
        # Changelogs table
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
                timestamp TEXT NOT NULL
            )
        """)
        
        # Notifications table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS notifications (
                id TEXT PRIMARY KEY,
                category TEXT NOT NULL,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                from_user_id TEXT NOT NULL,
                from_user_name TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                read INTEGER DEFAULT 0,
                metadata TEXT
            )
        """)
        
        # Create indexes for performance
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_users_username 
            ON users(username)
        """)
        
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_schedules_teacher 
            ON schedules(teacher_id)
        """)
        
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_schedules_day_period 
            ON schedules(day, period)
        """)
        
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_schedules_class 
            ON schedules(class_name)
        """)
        
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_changelogs_teacher 
            ON changelogs(teacher_id)
        """)
        
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_changelogs_timestamp 
            ON changelogs(timestamp DESC)
        """)
        
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_notifications_category 
            ON notifications(category, timestamp DESC)
        """)
        
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_notifications_read 
            ON notifications(read, timestamp DESC)
        """)
        
        conn.commit()
        conn.close()
    
    def get_connection(self):
        """Get database connection."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    async def command(self, cmd: str):
        """Ping command for health check."""
        return {"ok": 1}
    
    def get_collection(self, name: str):
        """Get collection adapter."""
        return SQLiteCollection(self, name)

class SQLiteCollection:
    """Collection adapter for SQLite."""
    
    def __init__(self, adapter: SQLiteAdapter, table_name: str):
        self.adapter = adapter
        self.table_name = table_name
    
    async def find_one(self, query: Dict, projection: Optional[Dict] = None):
        """Find one document."""
        conn = self.adapter.get_connection()
        cursor = conn.cursor()
        
        where_clause = " AND ".join([f"{k} = ?" for k in query.keys()])
        sql = f"SELECT * FROM {self.table_name}"
        if where_clause:
            sql += f" WHERE {where_clause}"
        sql += " LIMIT 1"
        
        cursor.execute(sql, list(query.values()))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return dict(row)
        return None
    
    async def find(self, query: Dict = None, projection: Optional[Dict] = None):
        """Find documents."""
        return SQLiteCursor(self.adapter, self.table_name, query or {})
    
    async def insert_one(self, document: Dict):
        """Insert one document."""
        conn = self.adapter.get_connection()
        cursor = conn.cursor()
        
        columns = ", ".join(document.keys())
        placeholders = ", ".join(["?" for _ in document])
        sql = f"INSERT INTO {self.table_name} ({columns}) VALUES ({placeholders})"
        
        cursor.execute(sql, list(document.values()))
        conn.commit()
        conn.close()
        return type('obj', (object,), {'inserted_id': document.get('id')})
    
    async def update_one(self, query: Dict, update: Dict, upsert: bool = False):
        """Update one document."""
        conn = self.adapter.get_connection()
        cursor = conn.cursor()
        
        set_values = update.get("$set", {})
        
        if upsert:
            # Check if exists
            where_clause = " AND ".join([f"{k} = ?" for k in query.keys()])
            cursor.execute(f"SELECT COUNT(*) FROM {self.table_name} WHERE {where_clause}", list(query.values()))
            exists = cursor.fetchone()[0] > 0
            
            if not exists:
                # Insert instead
                all_values = {**query, **set_values}
                columns = ", ".join(all_values.keys())
                placeholders = ", ".join(["?" for _ in all_values])
                sql = f"INSERT INTO {self.table_name} ({columns}) VALUES ({placeholders})"
                cursor.execute(sql, list(all_values.values()))
                conn.commit()
                conn.close()
                return
        
        set_clause = ", ".join([f"{k} = ?" for k in set_values.keys()])
        where_clause = " AND ".join([f"{k} = ?" for k in query.keys()])
        
        sql = f"UPDATE {self.table_name} SET {set_clause} WHERE {where_clause}"
        cursor.execute(sql, list(set_values.values()) + list(query.values()))
        conn.commit()
        conn.close()
    
    async def update_many(self, query: Dict, update: Dict):
        """Update multiple documents."""
        conn = self.adapter.get_connection()
        cursor = conn.cursor()
        
        set_values = update.get("$set", {})
        set_clause = ", ".join([f"{k} = ?" for k in set_values.keys()])
        
        if query:
            where_clause = " AND ".join([f"{k} = ?" for k in query.keys()])
            sql = f"UPDATE {self.table_name} SET {set_clause} WHERE {where_clause}"
            cursor.execute(sql, list(set_values.values()) + list(query.values()))
        else:
            # Update all if no query provided
            sql = f"UPDATE {self.table_name} SET {set_clause}"
            cursor.execute(sql, list(set_values.values()))
        
        modified_count = cursor.rowcount
        conn.commit()
        conn.close()
        
        return type('obj', (object,), {'modified_count': modified_count})
    
    async def delete_one(self, query: Dict):
        """Delete one document."""
        conn = self.adapter.get_connection()
        cursor = conn.cursor()
        
        if query:
            where_clause = " AND ".join([f"{k} = ?" for k in query.keys()])
            sql = f"DELETE FROM {self.table_name} WHERE {where_clause}"
            cursor.execute(sql, list(query.values()))
        else:
            # Delete all if no query provided
            sql = f"DELETE FROM {self.table_name}"
            cursor.execute(sql)
        
        deleted_count = cursor.rowcount
        conn.commit()
        conn.close()
        
        return type('obj', (object,), {'deleted_count': deleted_count})
    
    async def delete_many(self, query: Dict):
        """Delete multiple documents."""
        return await self.delete_one(query)
    
    async def count_documents(self, query: Dict = None):
        """Count documents."""
        conn = self.adapter.get_connection()
        cursor = conn.cursor()
        
        sql = f"SELECT COUNT(*) FROM {self.table_name}"
        if query:
            where_clause = " AND ".join([f"{k} = ?" for k in query.keys()])
            sql += f" WHERE {where_clause}"
            cursor.execute(sql, list(query.values()))
        else:
            cursor.execute(sql)
        
        count = cursor.fetchone()[0]
        conn.close()
        return count

class SQLiteCursor:
    """Cursor adapter for SQLite."""
    
    def __init__(self, adapter: SQLiteAdapter, table_name: str, query: Dict):
        self.adapter = adapter
        self.table_name = table_name
        self.query = query
        self._limit = None
        self._sort_field = None
        self._sort_direction = None
    
    def sort(self, field: str, direction: int = 1):
        """Sort results."""
        self._sort_field = field
        self._sort_direction = "ASC" if direction == 1 else "DESC"
        return self
    
    def limit(self, count: int):
        """Limit results."""
        self._limit = count
        return self
    
    async def to_list(self, length: int = None):
        """Convert cursor to list."""
        conn = self.adapter.get_connection()
        cursor = conn.cursor()
        
        sql = f"SELECT * FROM {self.table_name}"
        values = []
        
        if self.query:
            where_clause = " AND ".join([f"{k} = ?" for k in self.query.keys()])
            sql += f" WHERE {where_clause}"
            values = list(self.query.values())
        
        if self._sort_field:
            sql += f" ORDER BY {self._sort_field} {self._sort_direction or 'ASC'}"
        
        if self._limit:
            sql += f" LIMIT {self._limit}"
        elif length:
            sql += f" LIMIT {length}"
        
        cursor.execute(sql, values)
        rows = cursor.fetchall()
        conn.close()
        
        return [dict(row) for row in rows]

# Create SQLite database instance
db_adapter = SQLiteAdapter()

class DatabaseProxy:
    """Proxy to provide collection-like interface for SQLite."""
    
    def __getattribute__(self, name):
        if name in ['command', '__class__', '__dict__']:
            return object.__getattribute__(self, name)
        return db_adapter.get_collection(name)
    
    def __getitem__(self, name):
        return db_adapter.get_collection(name)
    
    async def command(self, cmd: str):
        return await db_adapter.command(cmd)

# Export database interface
db = DatabaseProxy()
client = type('obj', (object,), {
    'close': lambda: None,
    '__getitem__': lambda self, name: db
})()
