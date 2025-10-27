import { useState, useEffect, useCallback } from 'react';
import notificationService, { NotificationData } from '../services/notification';

interface UseNotificationsOptions {
  maxNotifications?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const useNotifications = (options: UseNotificationsOptions = {}) => {
  const { 
    maxNotifications = 10, 
    autoRefresh = true, 
    refreshInterval = 30000 // 30 seconds
  } = options;

  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Load from backend first
      await notificationService.loadFromBackend();
      
      // Get all notifications
      const allNotifications = notificationService.getAll();
      // Ensure we always have an array
      const notificationsArray = Array.isArray(allNotifications) ? allNotifications : [];
      setNotifications(notificationsArray.slice(-maxNotifications));
      setUnreadCount(notificationService.getUnread().length);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      // Set empty arrays on error
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [maxNotifications]);

  const markAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      await loadNotifications(); // Refresh after marking as read
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const dismiss = (id: string) => {
    notificationService.dismiss(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const dismissAll = () => {
    notificationService.dismissAll();
    setNotifications([]);
    setUnreadCount(0);
  };

  const clearByCategory = (category: string) => {
    notificationService.clearByCategory(category);
    setNotifications(prev => prev.filter(n => n.category !== category));
  };

  // Load notifications on mount
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Listen for new notifications
  useEffect(() => {
    const handleNewNotification = () => {
      loadNotifications();
    };

    window.addEventListener('notification', handleNewNotification);
    return () => window.removeEventListener('notification', handleNewNotification);
  }, [loadNotifications]);

  // Auto-refresh notifications
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(loadNotifications, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, loadNotifications]);

  return {
    notifications,
    unreadCount,
    isLoading,
    loadNotifications,
    markAsRead,
    dismiss,
    dismissAll,
    clearByCategory,
  };
};