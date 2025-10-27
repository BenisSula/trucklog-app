import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import './App.css';
import 'leaflet/dist/leaflet.css';

// Contexts
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { SidebarProvider, useSidebar } from './contexts/SidebarContext';
import { SettingsProvider } from './contexts/SettingsContext';

// Components
import Header from './components/Header';
import Sidebar from './components/Sidebar';

// Pages - Direct imports for simplicity
import Dashboard from './pages/Dashboard';
import TripPlanner from './pages/TripPlanner';
import LogSheets from './pages/LogSheets';
import Tracking from './pages/Tracking';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Register from './pages/Register';

// Create a client
const queryClient = new QueryClient();

// Loading Component
const LoadingSpinner: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
);

// Auth Guard Component
const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Layout for authenticated pages
const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isCollapsed } = useSidebar();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className={`flex-1 mt-16 p-6 min-h-screen transition-all duration-300 ease-in-out ${
          isCollapsed ? 'lg:ml-16 ml-0' : 'lg:ml-64 ml-0'
        }`}>
          <div className="transition-opacity duration-200">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

// Auth Layout for login/register pages
const AuthLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
};

// Main App Routes - Simplified Direct Approach
const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Auth Routes */}
      <Route path="/login" element={
        <AuthLayout>
          <Login />
        </AuthLayout>
      } />
      <Route path="/register" element={
        <AuthLayout>
          <Register />
        </AuthLayout>
      } />
      
      {/* Protected Routes - Direct mapping */}
      <Route path="/" element={
        <AuthGuard>
          <MainLayout>
            <Dashboard />
          </MainLayout>
        </AuthGuard>
      } />
      <Route path="/trips" element={
        <AuthGuard>
          <MainLayout>
            <TripPlanner />
          </MainLayout>
        </AuthGuard>
      } />
      {/* Keep notifications route for header notification center */}
      <Route path="/notifications" element={
        <AuthGuard>
          <MainLayout>
            <Notifications />
          </MainLayout>
        </AuthGuard>
      } />
      <Route path="/logs" element={
        <AuthGuard>
          <MainLayout>
            <LogSheets />
          </MainLayout>
        </AuthGuard>
      } />
      <Route path="/tracking" element={
        <AuthGuard>
          <MainLayout>
            <Tracking />
          </MainLayout>
        </AuthGuard>
      } />
      <Route path="/profile" element={
        <AuthGuard>
          <MainLayout>
            <Profile />
          </MainLayout>
        </AuthGuard>
      } />
      <Route path="/settings" element={
        <AuthGuard>
          <MainLayout>
            <Settings />
          </MainLayout>
        </AuthGuard>
      } />
      
      {/* Catch all - redirect to dashboard */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SettingsProvider>
          <WebSocketProvider>
            <SidebarProvider>
              <Router>
                <AppRoutes />
                <Toaster position="top-right" />
              </Router>
            </SidebarProvider>
          </WebSocketProvider>
        </SettingsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;