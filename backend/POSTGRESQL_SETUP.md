# PostgreSQL Setup Guide for TruckLog App

This guide ensures PostgreSQL is properly configured as the default and only database engine for the TruckLog application.

## 🚨 Important Notice

**SQLite is no longer supported.** This application requires PostgreSQL for all environments (development, staging, production).

## 📋 Prerequisites

- PostgreSQL 15+ installed and running
- Python 3.12+ with psycopg2-binary installed
- Environment variables configured

## 🛠️ Setup Steps

### 1. Install PostgreSQL

#### Windows
1. Download PostgreSQL from https://www.postgresql.org/download/windows/
2. Run the installer and follow the setup wizard
3. Remember the password you set for the `postgres` user

#### macOS
```bash
brew install postgresql
brew services start postgresql
```

#### Ubuntu/Debian
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2. Configure Environment Variables

Copy the environment template and update with your PostgreSQL credentials:

```bash
cp env.local .env
```

Edit `.env` with your PostgreSQL settings:

```env
# PostgreSQL Database Configuration (REQUIRED)
DB_NAME=trucklog_db
DB_USER=postgres
DB_PASSWORD=your-secure-password
DB_HOST=localhost
DB_PORT=5432
```

### 3. Run the Setup Script

The application includes an automated setup script:

```bash
python setup_postgresql.py
```

This script will:
- ✅ Check if PostgreSQL is installed
- ✅ Create the `trucklog_db` database
- ✅ Create the database user (if needed)
- ✅ Grant necessary privileges
- ✅ Test the connection

### 4. Run Database Migrations

```bash
python manage.py migrate
```

### 5. Create a Superuser

```bash
python manage.py createsuperuser
```

### 6. Start the Application

```bash
python manage.py runserver
```

## 🐳 Using Docker (Recommended)

The easiest way to get started is with Docker Compose:

```bash
# Start all services including PostgreSQL
docker-compose up -d

# Run migrations
docker-compose exec backend python manage.py migrate

# Create superuser
docker-compose exec backend python manage.py createsuperuser
```

## 🔧 Troubleshooting

### Connection Refused Error

If you see "connection refused" errors:

1. **Check if PostgreSQL is running:**
   ```bash
   # Windows
   services.msc  # Look for PostgreSQL service
   
   # macOS
   brew services list | grep postgresql
   
   # Linux
   sudo systemctl status postgresql
   ```

2. **Start PostgreSQL:**
   ```bash
   # Windows: Start the PostgreSQL service in Services
   # macOS
   brew services start postgresql
   
   # Linux
   sudo systemctl start postgresql
   ```

### Authentication Failed

If you get authentication errors:

1. **Check your password in `.env`**
2. **Reset PostgreSQL password:**
   ```bash
   # Connect as postgres user
   psql -U postgres
   
   # Change password
   ALTER USER postgres PASSWORD 'your-new-password';
   ```

### Database Does Not Exist

If the database doesn't exist:

1. **Run the setup script:**
   ```bash
   python setup_postgresql.py
   ```

2. **Or create manually:**
   ```bash
   psql -U postgres
   CREATE DATABASE trucklog_db;
   CREATE USER your_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE trucklog_db TO your_user;
   ```

## 🔒 Security Best Practices

1. **Use strong passwords** for database users
2. **Don't commit `.env` files** to version control
3. **Use environment-specific credentials** for different environments
4. **Enable SSL** for production connections
5. **Regularly update PostgreSQL** to the latest version

## 📊 Database Schema

The application uses the following main tables:
- `user_management_user` - User accounts
- `trip_planner_trip` - Trip planning data
- `log_sheets_logentry` - Driver log entries
- `core_utils_auditlog` - System audit logs

## 🚀 Production Deployment

For production deployment:

1. **Use a managed PostgreSQL service** (AWS RDS, Google Cloud SQL, etc.)
2. **Configure connection pooling** (PgBouncer)
3. **Set up automated backups**
4. **Monitor database performance**
5. **Use SSL connections**

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Verify your PostgreSQL installation
3. Ensure all environment variables are correct
4. Check the application logs for detailed error messages

---

**Remember:** This application requires PostgreSQL and will not work with SQLite or other database engines.
