import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

interface AuthRedirectProps {
  redirectTo?: string;
  children: React.ReactNode;
}

const AuthRedirect: React.FC<AuthRedirectProps> = ({ 
  redirectTo = '/', 
  children 
}) => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate(redirectTo);
    }
  }, [isAuthenticated, isLoading, navigate, redirectTo]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <LoadingSpinner size="lg" text="Checking authentication..." />
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <LoadingSpinner size="md" text="Redirecting..." />
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthRedirect;


