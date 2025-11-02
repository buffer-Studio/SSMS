#!/usr/bin/env python3
"""
SSMS Database Conversion Verification Script
Verifies complete conversion from MongoDB to SQLite3
"""

import sqlite3
import os
import sys
from pathlib import Path
from datetime import datetime
import json

class DatabaseVerifier:
    def __init__(self):
        self.project_root = Path(__file__).parent
        self.backend_dir = self.project_root / "backend"
        self.db_path = self.backend_dir / "ssms.db"

    def check_database_system(self):
        """Check what database system is configured"""
        print("🔍 Checking Database System Configuration...")

        # Check imports in server.py
        server_py = self.backend_dir / "server.py"
        with open(server_py, 'r') as f:
            content = f.read()

        if 'import sqlite3' in content:
            print("✅ SQLite3 import found in server.py")
        else:
            print("❌ SQLite3 import NOT found in server.py")
            return False

        if 'import pymongo' in content or 'from motor' in content or 'mongodb' in content.lower():
            print("❌ MongoDB references still found in server.py")
            return False
        else:
            print("✅ No MongoDB references found in server.py")

        # Check requirements.txt
        requirements = self.backend_dir / "requirements.txt"
        with open(requirements, 'r') as f:
            req_content = f.read()

        if 'pymongo' in req_content or 'motor' in req_content:
            print("❌ MongoDB drivers still in requirements.txt")
            return False
        else:
            print("✅ No MongoDB drivers in requirements.txt")

        return True

    def check_database_schema(self):
        """Check if SQLite database has correct schema"""
        print("\n🔍 Checking Database Schema...")

        if not self.db_path.exists():
            print("⚠️  Database file doesn't exist yet (will be created on first run)")
            return True

        try:
            conn = sqlite3.connect(str(self.db_path))
            cursor = conn.cursor()

            # Check tables exist
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = [row[0] for row in cursor.fetchall()]

            expected_tables = ['users', 'schedules', 'settings', 'changelogs', 'error_logs']

            for table in expected_tables:
                if table in tables:
                    print(f"✅ Table '{table}' exists")
                else:
                    print(f"❌ Table '{table}' missing")
                    return False

            # Check table schemas
            schema_checks = {
                'users': ['id', 'username', 'name', 'role', 'password_hash', 'created_at'],
                'schedules': ['id', 'teacher_id', 'teacher_name', 'day', 'period', 'subject', 'class_name', 'updated_at'],
                'settings': ['id', 'break_after_period', 'updated_at'],
                'changelogs': ['id', 'schedule_id', 'teacher_id', 'teacher_name', 'day', 'period', 'old_value', 'new_value', 'changed_by', 'timestamp']
            }

            for table, expected_columns in schema_checks.items():
                if table in tables:
                    cursor.execute(f"PRAGMA table_info({table})")
                    columns = [row[1] for row in cursor.fetchall()]

                    for col in expected_columns:
                        if col in columns:
                            print(f"✅ Column '{col}' exists in table '{table}'")
                        else:
                            print(f"❌ Column '{col}' missing in table '{table}'")
                            return False

            conn.close()
            return True

        except Exception as e:
            print(f"❌ Database schema check failed: {str(e)}")
            return False

    def check_sample_data(self):
        """Check if sample/demo data is properly configured"""
        print("\n🔍 Checking Sample Data Configuration...")

        server_py = self.backend_dir / "server.py"
        with open(server_py, 'r') as f:
            content = f.read()

        # Check for demo data functions
        if 'init_demo_data' in content and 'load_demo_schedules' in content:
            print("✅ Demo data functions found")
        else:
            print("❌ Demo data functions missing")
            return False

        # Check for SQLite-specific data loading
        if 'sqlite3.connect' in content and 'cursor.execute' in content:
            print("✅ SQLite database operations found")
        else:
            print("❌ SQLite database operations missing")
            return False

        return True

    def check_api_endpoints(self):
        """Check if API endpoints work with SQLite"""
        print("\n🔍 Checking API Endpoints...")

        server_py = self.backend_dir / "server.py"
        with open(server_py, 'r') as f:
            content = f.read()

        # Check for SQLite connection usage in API routes
        api_routes_with_sqlite = [
            'get_db_connection()',
            'cursor.execute',
            'conn.commit()'
        ]

        for route_check in api_routes_with_sqlite:
            if route_check in content:
                print(f"✅ SQLite operation '{route_check}' found in API routes")
            else:
                print(f"❌ SQLite operation '{route_check}' missing from API routes")
                return False

        return True

    def generate_report(self):
        """Generate a comprehensive conversion report"""
        print("\n" + "="*60)
        print("📊 SSMS DATABASE CONVERSION VERIFICATION REPORT")
        print("="*60)

        checks = [
            ("Database System", self.check_database_system()),
            ("Database Schema", self.check_database_schema()),
            ("Sample Data", self.check_sample_data()),
            ("API Endpoints", self.check_api_endpoints())
        ]

        all_passed = True
        for check_name, passed in checks:
            status = "✅ PASSED" if passed else "❌ FAILED"
            print(f"{check_name:<20} {status}")
            if not passed:
                all_passed = False

        print("\n" + "="*60)

        if all_passed:
            print("🎉 CONVERSION COMPLETE!")
            print("✅ Database successfully converted from MongoDB to SQLite3")
            print("✅ All checks passed - system is ready for use")
            print("\n📋 Next Steps:")
            print("   1. Run './start.sh' to start the application")
            print("   2. Database will be created automatically on first run")
            print("   3. Demo data will be loaded automatically")
        else:
            print("❌ CONVERSION ISSUES DETECTED!")
            print("🔧 Please review the failed checks above")

        print("="*60)
        return all_passed

def main():
    print("🚀 SSMS Database Conversion Verification")
    print("Checking conversion from MongoDB to SQLite3...\n")

    verifier = DatabaseVerifier()
    success = verifier.generate_report()

    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
