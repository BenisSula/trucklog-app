# TruckLog - Fleet Management System

A comprehensive fleet management system for trucking companies and drivers, featuring Hours of Service (HOS) tracking, trip planning, compliance monitoring, and real-time notifications.

## Features

### 🚛 Core Functionality
- **Hours of Service (HOS) Tracking** - Automated compliance monitoring
- **Trip Planning & Management** - Route optimization and planning
- **Real-time Dashboard** - Live tracking and status updates
- **Log Sheets Management** - Digital logbook with compliance checks
- **Notification System** - Real-time alerts and updates

### 🔐 Authentication & User Management
- JWT-based authentication
- User registration and profile management
- Driver profile management with CDL tracking
- Role-based access control

### 📊 Compliance & Reporting
- Automated HOS violation detection
- Compliance status monitoring
- Export capabilities (CSV, Excel, PDF)
- Audit logging

### 🗺️ Location & Mapping
- Interactive maps with real-time tracking
- Location management for terminals and stops
- Route planning and optimization

## Tech Stack

### Backend
- **Django 5.2** - Web framework
- **Django REST Framework** - API development
- **PostgreSQL** - Primary database
- **Redis** - Caching and WebSocket support
- **Celery** - Background task processing
- **JWT** - Authentication tokens

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **React Router** - Navigation
- **Axios** - HTTP client
- **React Hook Form** - Form management

### Real-time Features
- **WebSockets** - Live updates
- **Django Channels** - WebSocket support
- **Redis** - Message broker

## Project Structure

```
trucklog-app/
├── backend/                 # Django backend
│   ├── trucklog_backend/   # Main Django project
│   ├── user_management/    # User & authentication
│   ├── log_sheets/        # HOS logging & compliance
│   ├── trip_planner/      # Trip management
│   ├── core_utils/        # Shared utilities
│   └── requirements.txt   # Python dependencies
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── contexts/      # React contexts
│   │   ├── services/      # API services
│   │   └── config/        # Configuration files
│   └── package.json       # Node dependencies
└── README.md
```

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 13+
- Redis (optional, for real-time features)

### Backend Setup

1. **Create virtual environment**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Environment configuration**
   ```bash
   cp env.example .env
   # Edit .env with your database and other settings
   ```

4. **Database setup**
   ```bash
   python manage.py migrate
   python manage.py createsuperuser
   ```

5. **Run development server**
   ```bash
   python manage.py runserver
   ```

### Frontend Setup

1. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Environment configuration**
   ```bash
   # Create .env.local file
   REACT_APP_API_URL=http://localhost:8000/api
   ```

3. **Run development server**
   ```bash
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/users/register/` - User registration
- `POST /api/users/auth/token/` - Login (JWT)
- `POST /api/users/auth/token/refresh/` - Refresh token
- `GET /api/users/profile/` - Get user profile

### HOS & Logging
- `GET /api/logs/log-entries/` - Get log entries
- `POST /api/logs/log-entries/` - Create log entry
- `GET /api/logs/daily-logs/` - Get daily logs
- `GET /api/logs/hos-status/` - Get HOS compliance status

### Trip Management
- `GET /api/trips/trips/` - Get trips
- `POST /api/trips/trips/` - Create trip
- `POST /api/trips/plan-route/` - Plan route
- `GET /api/trips/locations/` - Get locations

## Development

### Running Tests
```bash
# Backend tests
cd backend
python manage.py test

# Frontend tests
cd frontend
npm test
```

### Code Quality
```bash
# Backend linting
cd backend
flake8 .

# Frontend linting
cd frontend
npm run lint
```

## Deployment

### Production Environment Variables
```bash
# Backend (.env)
DEBUG=False
SECRET_KEY=your-secret-key
DATABASE_URL=postgresql://user:pass@host:port/dbname
REDIS_URL=redis://localhost:6379/0

# Frontend (.env.production)
REACT_APP_API_URL=https://your-api-domain.com/api
```

### Docker Support
```bash
# Build and run with Docker Compose
docker-compose up --build
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, email support@trucklog.com or create an issue in this repository.

## Roadmap

- [ ] Mobile app development
- [ ] Advanced analytics dashboard
- [ ] Integration with ELD devices
- [ ] Multi-language support
- [ ] Advanced reporting features
- [ ] Fleet management tools