import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCircle,
  AlertTriangle,
  Info,
  Filter,
  Search,
  RefreshCw,
  Trash2,
  Eye,
  Settings,
  ChevronUp
} from 'lucide-react';
import { apiService } from '../services/api';
import { toast } from 'react-hot-toast';
import NotificationSettings from '../components/settings/NotificationSettings';
import { CARD_STYLES, BUTTON_STYLES } from '../config/theme';

interface Notification {
  id: number;
  title: string;
  message: string;
  notification_type: 'info' | 'success' | 'warning' | 'error' | 'hos_violation' | 'trip_update' | 'maintenance' | 'document' | 'system';
  notification_type_display: string;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
  data: any;
  channels: string[];
  priority: number;
  expires_at: string | null;
  action_url: string | null;
  related_object_type: string | null;
  related_object_id: number | null;
}

const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNotifications, setSelectedNotifications] = useState<number[]>([]);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await apiService.getNotifications();
      // Ensure data is always an array
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      toast.error('Failed to load notifications');
      // Set empty array on error
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: number) => {
    try {
      await apiService.markNotificationRead(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n)
      );
      toast.success('Notification marked as read');
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      toast.error('Failed to mark notification as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiService.markAllNotificationsRead();
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      toast.error('Failed to mark all notifications as read');
    }
  };

  const deleteNotification = async (id: number) => {
    try {
      // Note: This would need a delete endpoint in the backend
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Failed to delete notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const toggleSelection = (id: number) => {
    setSelectedNotifications(prev =>
      prev.includes(id)
        ? prev.filter(nId => nId !== id)
        : [...prev, id]
    );
  };

  const selectAll = () => {
    const visibleIds = filteredNotifications.map(n => n.id);
    setSelectedNotifications(visibleIds);
  };

  const clearSelection = () => {
    setSelectedNotifications([]);
  };

  const bulkMarkAsRead = async () => {
    try {
      await Promise.all(
        selectedNotifications.map(id => apiService.markNotificationRead(id))
      );
      setNotifications(prev =>
        prev.map(n =>
          selectedNotifications.includes(n.id)
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n
        )
      );
      setSelectedNotifications([]);
      toast.success(`${selectedNotifications.length} notifications marked as read`);
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
      toast.error('Failed to mark notifications as read');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
      case 'hos_violation':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'info':
      case 'trip_update':
      case 'maintenance':
      case 'document':
      case 'system':
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getNotificationBgColor = (type: string, isRead: boolean) => {
    const baseColor = isRead ? 'bg-gray-50' : 'bg-white';
    const borderColor = (() => {
      switch (type) {
        case 'success': return 'border-l-green-500';
        case 'error':
        case 'hos_violation': return 'border-l-red-500';
        case 'warning': return 'border-l-yellow-500';
        case 'info':
        case 'trip_update':
        case 'maintenance':
        case 'document':
        case 'system':
        default: return 'border-l-blue-500';
      }
    })();

    return `${baseColor} ${borderColor} border-l-4`;
  };

  const getPriorityBadge = (priority: number) => {
    if (priority >= 3) {
      return <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">Urgent</span>;
    } else if (priority >= 2) {
      return <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full">High</span>;
    } else if (priority >= 1) {
      return <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">Normal</span>;
    }
    return <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">Low</span>;
  };

  const filteredNotifications = notifications.filter(notification => {
    // Apply read/unread filter
    if (filter === 'read' && !notification.is_read) return false;
    if (filter === 'unread' && notification.is_read) return false;

    // Apply type filter
    if (typeFilter !== 'all' && notification.notification_type !== typeFilter) return false;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        notification.title.toLowerCase().includes(query) ||
        notification.message.toLowerCase().includes(query) ||
        notification.notification_type_display.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const notificationTypes = Array.from(new Set(notifications.map(n => n.notification_type)));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Loading notifications...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8">
          <div className="mb-4 sm:mb-0">
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 bg-primary-100 rounded-lg">
                <Bell className="h-8 w-8 text-primary-600" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900">Notifications</h1>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 mt-1 sm:mt-2">
              <p className="text-neutral-600">Manage and configure your notification preferences</p>
              <div className="flex items-center space-x-2 text-sm text-success-600 mt-1 sm:mt-0">
                <div className="w-2 h-2 bg-success-500 rounded-full"></div>
                <span>{notifications.length} total, {unreadCount} unread</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-lg transition-colors ${showSettings
                ? 'text-primary-600 bg-primary-100'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                }`}
              title="Toggle notification settings"
            >
              <Settings className="h-5 w-5" />
            </button>
            <button
              onClick={loadNotifications}
              className={`flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors ${BUTTON_STYLES.primary} flex-1 sm:flex-initial`}
              title="Refresh notifications"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className={`px-4 py-2 rounded-lg transition-colors ${BUTTON_STYLES.success} whitespace-nowrap`}
              >
                Mark All Read
              </button>
            )}
          </div>
        </div>

        {/* Two Column Layout for Filters and Settings */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
          {/* Filters and Search Card */}
          <div className={`${CARD_STYLES.base} ${CARD_STYLES.padding}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-neutral-900 flex items-center">
                <div className="p-2 bg-primary-100 rounded-lg mr-3">
                  <Filter className="h-5 w-5 text-primary-600" />
                </div>
                Filters & Search
              </h3>
            </div>

            <div className="space-y-4">
              {/* Read/Unread Filter */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Status Filter</label>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as any)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="all">All Notifications</option>
                  <option value="unread">Unread Only</option>
                  <option value="read">Read Only</option>
                </select>
              </div>

              {/* Type Filter */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Type Filter</label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="all">All Types</option>
                  {notificationTypes.map(type => (
                    <option key={type} value={type}>
                      {type.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="Search notifications..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              {/* Bulk Actions */}
              {selectedNotifications.length > 0 && (
                <div className="pt-4 border-t border-neutral-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-600">
                      {selectedNotifications.length} notification{selectedNotifications.length !== 1 ? 's' : ''} selected
                    </span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={bulkMarkAsRead}
                        className={`px-3 py-1 text-sm rounded-md transition-colors ${BUTTON_STYLES.primary}`}
                      >
                        Mark as Read
                      </button>
                      <button
                        onClick={clearSelection}
                        className={`px-3 py-1 text-sm rounded-md transition-colors ${BUTTON_STYLES.secondary}`}
                      >
                        Clear Selection
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Settings Card */}
          <div className={`${CARD_STYLES.base} ${CARD_STYLES.padding}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-neutral-900 flex items-center">
                <div className="p-2 bg-primary-100 rounded-lg mr-3">
                  <Settings className="h-5 w-5 text-primary-600" />
                </div>
                Quick Settings
              </h3>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 rounded-lg transition-colors ${showSettings
                  ? 'text-primary-600 bg-primary-100'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                  }`}
                title="Toggle detailed settings"
              >
                <ChevronUp className={`h-4 w-4 transition-transform ${showSettings ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {showSettings ? (
              <div className="space-y-4">
                <NotificationSettings
                  showTestButtons={false}
                  showCard={false}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center py-8">
                  <Settings className="h-12 w-12 mx-auto mb-3 text-neutral-300" />
                  <p className="text-neutral-500 text-sm">Click the toggle above to access notification settings</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-2">
          {filteredNotifications.length === 0 ? (
            <div className={`${CARD_STYLES.base} ${CARD_STYLES.padding} text-center`}>
              <Bell className="h-12 w-12 mx-auto mb-4 text-neutral-300" />
              <h3 className="text-lg font-medium text-neutral-900 mb-2">No notifications found</h3>
              <p className="text-neutral-600">
                {searchQuery || filter !== 'all' || typeFilter !== 'all'
                  ? 'Try adjusting your filters or search query'
                  : 'You have no notifications at this time'
                }
              </p>
            </div>
          ) : (
            <>
              {/* Select All */}
              <div className="flex items-center justify-between mb-2">
                <button
                  onClick={selectedNotifications.length === filteredNotifications.length ? clearSelection : selectAll}
                  className="text-sm text-primary-600 hover:text-primary-800 font-medium"
                >
                  {selectedNotifications.length === filteredNotifications.length ? 'Deselect All' : 'Select All'}
                </button>
                <span className="text-sm text-neutral-500">
                  {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''}
                </span>
              </div>

              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`${getNotificationBgColor(notification.notification_type, notification.is_read)} 
                  ${CARD_STYLES.base} ${CARD_STYLES.padding} hover:shadow-md transition-shadow`}
                >
                  <div className="flex items-start space-x-3">
                    {/* Selection Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedNotifications.includes(notification.id)}
                      onChange={() => toggleSelection(notification.id)}
                      className="mt-1 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                    />

                    {/* Icon */}
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.notification_type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className={`text-sm font-medium ${notification.is_read ? 'text-gray-700' : 'text-gray-900'}`}>
                              {notification.title}
                            </h3>
                            {notification.priority > 0 && getPriorityBadge(notification.priority)}
                            {!notification.is_read && (
                              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            )}
                          </div>
                          <p className={`text-sm ${notification.is_read ? 'text-gray-500' : 'text-gray-700'} mb-2`}>
                            {notification.message}
                          </p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span>{notification.notification_type_display}</span>
                            <span>{new Date(notification.created_at).toLocaleString()}</span>
                            {notification.read_at && (
                              <span>Read: {new Date(notification.read_at).toLocaleString()}</span>
                            )}
                          </div>
                          {notification.action_url && (
                            <a
                              href={notification.action_url}
                              className="inline-block mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                            >
                              View Details →
                            </a>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center space-x-1 ml-4">
                          {!notification.is_read && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="p-1 text-gray-400 hover:text-blue-600 rounded"
                              title="Mark as read"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotification(notification.id)}
                            className="p-1 text-gray-400 hover:text-red-600 rounded"
                            title="Delete notification"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notifications;