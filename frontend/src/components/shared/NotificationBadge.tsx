import React from 'react';
import { useNotifications } from '../../hooks/useNotifications';

interface NotificationBadgeProps {
  className?: string;
  maxCount?: number;
}

const NotificationBadge: React.FC<NotificationBadgeProps> = ({ 
  className = '',
  maxCount = 9 
}) => {
  const { unreadCount } = useNotifications({ maxNotifications: 10, autoRefresh: true });

  if (unreadCount === 0) return null;

  return (
    <span className={`bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center animate-pulse ${className}`}>
      {unreadCount > maxCount ? `${maxCount}+` : unreadCount}
    </span>
  );
};

export default NotificationBadge;