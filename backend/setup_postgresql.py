#!/usr/bin/env python3
"""
PostgreSQL Setup Script for TruckLog App

This script helps set up PostgreSQL for the TruckLog application.
Run this script to create the database and user if they don't exist.
"""

import sys
import subprocess
import psycopg2
from psycopg2 import sql
from decouple import config

def run_command(command, description):
    """Run a command and return success status"""
    print(f"🔄 {description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed: {e.stderr}")
        return False

def check_postgresql_installed():
    """Check if PostgreSQL is installed"""
    print("🔍 Checking PostgreSQL installation...")
    try:
        result = subprocess.run(['psql', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ PostgreSQL found: {result.stdout.strip()}")
            return True
        else:
            print("❌ PostgreSQL not found")
            return False
    except FileNotFoundError:
        print("❌ PostgreSQL not found in PATH")
        return False

def create_database_and_user():
    """Create database and user for the application"""
    db_name = config('DB_NAME', default='trucklog_db')
    db_user = config('DB_USER', default='postgres')
    db_password = config('DB_PASSWORD', default='password')
    db_host = config('DB_HOST', default='localhost')
    db_port = config('DB_PORT', default='5432')
    
    print(f"🔧 Setting up database: {db_name}")
    print(f"🔧 Database user: {db_user}")
    print(f"🔧 Database host: {db_host}:{db_port}")
    
    try:
        # Connect to PostgreSQL as superuser
        conn = psycopg2.connect(
            host=db_host,
            port=db_port,
            user='postgres',  # Connect as postgres superuser
            password=db_password
        )
        conn.autocommit = True
        cursor = conn.cursor()
        
        # Check if database exists
        cursor.execute(
            "SELECT 1 FROM pg_database WHERE datname = %s",
            (db_name,)
        )
        
        if cursor.fetchone():
            print(f"✅ Database '{db_name}' already exists")
        else:
            # Create database
            cursor.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(db_name)))
            print(f"✅ Database '{db_name}' created successfully")
        
        # Check if user exists
        cursor.execute(
            "SELECT 1 FROM pg_roles WHERE rolname = %s",
            (db_user,)
        )
        
        if cursor.fetchone():
            print(f"✅ User '{db_user}' already exists")
        else:
            # Create user
            cursor.execute(
                sql.SQL("CREATE USER {} WITH PASSWORD %s").format(sql.Identifier(db_user)),
                (db_password,)
            )
            print(f"✅ User '{db_user}' created successfully")
        
        # Grant privileges
        cursor.execute(
            sql.SQL("GRANT ALL PRIVILEGES ON DATABASE {} TO {}").format(
                sql.Identifier(db_name),
                sql.Identifier(db_user)
            )
        )
        print(f"✅ Privileges granted to user '{db_user}' on database '{db_name}'")
        
        cursor.close()
        conn.close()
        return True
        
    except psycopg2.Error as e:
        print(f"❌ Database setup failed: {e}")
        return False

def test_connection():
    """Test database connection"""
    print("🧪 Testing database connection...")
    try:
        conn = psycopg2.connect(
            host=config('DB_HOST', default='localhost'),
            port=config('DB_PORT', default='5432'),
            database=config('DB_NAME', default='trucklog_db'),
            user=config('DB_USER', default='postgres'),
            password=config('DB_PASSWORD', default='password')
        )
        cursor = conn.cursor()
        cursor.execute("SELECT version();")
        version = cursor.fetchone()[0]
        print(f"✅ Database connection successful!")
        print(f"📊 PostgreSQL version: {version}")
        cursor.close()
        conn.close()
        return True
    except psycopg2.Error as e:
        print(f"❌ Database connection failed: {e}")
        return False

def main():
    """Main setup function"""
    print("🚛 TruckLog PostgreSQL Setup")
    print("=" * 40)
    
    # Check if PostgreSQL is installed
    if not check_postgresql_installed():
        print("\n📋 To install PostgreSQL:")
        print("   Windows: Download from https://www.postgresql.org/download/windows/")
        print("   macOS: brew install postgresql")
        print("   Ubuntu: sudo apt-get install postgresql postgresql-contrib")
        return False
    
    # Create database and user
    if not create_database_and_user():
        print("\n❌ Failed to create database and user")
        return False
    
    # Test connection
    if not test_connection():
        print("\n❌ Failed to connect to database")
        return False
    
    print("\n🎉 PostgreSQL setup completed successfully!")
    print("\n📋 Next steps:")
    print("   1. Run: python manage.py migrate")
    print("   2. Run: python manage.py createsuperuser")
    print("   3. Run: python manage.py runserver")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)



