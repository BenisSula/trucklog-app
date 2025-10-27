import React from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import NotificationBadge from './NotificationBadge';

interface NotificationLinkProps {
  className?: string;
  variant?: 'header' | 'sidebar';
}

const NotificationLink: React.FC<NotificationLinkProps> = ({ 
  className = '',
  variant = 'header'
}) => {
  const baseStyles = variant === 'header' 
    ? 'relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
    : 'relative';

  return (
    <Link
      to="/notifications"
      className={`${baseStyles} ${className}`}
      title="View notifications"
      aria-label="View notifications"
    >
      <div className="relative">
        <Bell className="h-6 w-6" />
        <NotificationBadge className="absolute -top-1 -right-1" />
      </div>
    </Link>
  );
};

export default NotificationLink;