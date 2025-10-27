# Deployment Guide

## Vercel Deployment (Frontend Only)

### Prerequisites
- Vercel account
- GitHub repository connected to Vercel

### Steps

1. **Connect Repository to Vercel**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository `trucklog-app`

2. **Configure Build Settings**
   - **Framework Preset**: Create React App
   - **Root Directory**: Leave empty (we handle this in vercel.json)
   - **Build Command**: `cd frontend && npm run build`
   - **Output Directory**: `frontend/build`
   - **Install Command**: `cd frontend && npm install`

3. **Environment Variables**
   Add the following environment variable in Vercel:
   - `REACT_APP_API_URL`: Your backend API URL (e.g., `https://your-backend.herokuapp.com/api`)

4. **Deploy**
   - Click "Deploy"
   - Vercel will automatically build and deploy your app

### Configuration Files

The following files have been created to handle deployment:

- `vercel.json` - Main Vercel configuration
- `frontend/vercel.json` - Frontend-specific configuration
- `frontend/public/_redirects` - Fallback for client-side routing

### Troubleshooting

#### 404 Errors on Page Refresh
- ✅ Fixed with `vercel.json` configuration
- All routes now redirect to `index.html` for client-side routing

#### Build Errors
- Check that all dependencies are in `package.json`
- Ensure TypeScript errors are resolved
- Verify environment variables are set correctly

#### API Connection Issues
- Ensure `REACT_APP_API_URL` is set correctly
- Check CORS settings on your backend
- Verify backend is deployed and accessible

## Backend Deployment Options

### Option 1: Heroku
1. Create Heroku app
2. Add PostgreSQL addon
3. Set environment variables
4. Deploy Django backend

### Option 2: Railway
1. Connect GitHub repository
2. Select backend folder
3. Configure environment variables
4. Deploy

### Option 3: DigitalOcean App Platform
1. Create new app
2. Connect repository
3. Configure build settings
4. Set environment variables

## Environment Variables for Backend

```bash
DEBUG=False
SECRET_KEY=your-secret-key
DATABASE_URL=postgresql://user:pass@host:port/dbname
ALLOWED_HOSTS=your-domain.com,your-vercel-app.vercel.app
CORS_ALLOWED_ORIGINS=https://your-vercel-app.vercel.app
```

## Full Stack Deployment

For a complete deployment:

1. **Deploy Backend** (Heroku/Railway/DigitalOcean)
2. **Get Backend URL** (e.g., `https://your-app.herokuapp.com`)
3. **Deploy Frontend** (Vercel) with `REACT_APP_API_URL=https://your-app.herokuapp.com/api`
4. **Update Backend CORS** to allow your Vercel domain

## Custom Domain

To use a custom domain:

1. **Vercel**: Add domain in project settings
2. **Backend**: Update `ALLOWED_HOSTS` and `CORS_ALLOWED_ORIGINS`
3. **DNS**: Point domain to Vercel

## Monitoring

- **Vercel Analytics**: Enable in project settings
- **Error Tracking**: Consider Sentry integration
- **Performance**: Monitor Core Web Vitals