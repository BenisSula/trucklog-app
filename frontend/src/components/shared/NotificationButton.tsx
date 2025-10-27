import React, { useState, useRef, useEffect } from 'react';
import { Bell, X, Check, AlertTriangle, Info, CheckCircle, Settings, Volume2, Vibrate, Smartphone, Search } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { useConnectionStatus } from '../../hooks/useConnectionStatus';
import notificationService, { NotificationData } from '../../services/notification';

interface NotificationButtonProps {
  variant?: 'header' | 'sidebar';
  showLabel?: boolean;
  className?: string;
  maxNotifications?: number;
  showSettings?: boolean;
  enableFiltering?: boolean;
  enableSearch?: boolean;
}

const NotificationButton: React.FC<NotificationButtonProps> = ({
  variant = 'header',
  showLabel = false,
  className = '',
  maxNotifications = 10,
  showSettings = true,
  enableFiltering = true,
  enableSearch = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'urgent' | 'hos_compliance' | 'trip_management'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    soundEnabled: true,
    vibrationEnabled: true,
    showBrowserNotifications: true
  });

  const { isConnected } = useWebSocket();
  const { statusColor } = useConnectionStatus();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    dismiss,
    dismissAll,
    clearByCategory,
  } = useNotifications({ maxNotifications });

  // Load notification settings
  useEffect(() => {
    const settings = notificationService.getSettings();
    setNotificationSettings({
      soundEnabled: settings.soundEnabled,
      vibrationEnabled: settings.vibrationEnabled,
      showBrowserNotifications: settings.browserNotificationsEnabled && settings.notificationPermission === 'granted'
    });
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowSettingsPanel(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setShowSettingsPanel(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Filter notifications based on current filter and search
  const filteredNotifications = notifications.filter(notification => {
    // Apply filter
    if (filter === 'unread') {
      const unreadNotifications = notificationService.getUnread();
      return unreadNotifications.some(unread => unread.id === notification.id);
    }
    if (filter === 'urgent') {
      return notification.priority === 'urgent' || notification.priority === 'high';
    }
    if (filter === 'hos_compliance') {
      return notification.category === 'hos_compliance' || notification.type === 'hos_violation';
    }
    if (filter === 'trip_management') {
      return notification.category === 'trip_management' || notification.type === 'trip_update';
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        notification.title.toLowerCase().includes(query) ||
        notification.message.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'info':
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getNotificationBgColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'border-l-red-500';
      case 'high': return 'border-l-orange-500';
      case 'normal': return 'border-l-blue-500';
      case 'low': return 'border-l-gray-400';
      default: return 'border-l-gray-400';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'Urgent';
      case 'high': return 'High';
      case 'normal': return 'Normal';
      case 'low': return 'Low';
      default: return 'Normal';
    }
  };

  const handleSettingsChange = (setting: keyof typeof notificationSettings, value: boolean) => {
    setNotificationSettings(prev => ({ ...prev, [setting]: value }));
    
    if (setting === 'soundEnabled') {
      notificationService.setSoundEnabled(value);
    } else if (setting === 'vibrationEnabled') {
      notificationService.setVibrationEnabled(value);
    } else if (setting === 'showBrowserNotifications') {
      notificationService.setBrowserNotificationsEnabled(value);
    }
  };

  // Button styles based on variant
  const buttonStyles = variant === 'sidebar' 
    ? `flex items-center ${showLabel ? 'space-x-3 px-3' : 'justify-center px-2'} py-3 rounded-lg text-sm font-medium transition-colors text-gray-600 hover:bg-gray-50 hover:text-gray-900 w-full`
    : 'relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2';

  const dropdownPosition = variant === 'sidebar' ? 'left-0 ml-2' : 'right-0';

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Notification Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={buttonStyles}
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
        title={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
        {...(isOpen ? { 'aria-expanded': 'true' } : { 'aria-expanded': 'false' })}
      >
        <div className="relative">
          <Bell className="h-5 w-5 flex-shrink-0" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
        {showLabel && <span>Notifications</span>}
      </button>

      {/* Connection Status Indicator for header variant */}
      {variant === 'header' && !isConnected && (
        <div className={`absolute -top-1 -left-1 w-3 h-3 rounded-full border-2 border-white ${
          statusColor === 'red' ? 'bg-red-500' : 
          statusColor === 'yellow' ? 'bg-yellow-500' : 
          'bg-gray-500'
        }`}></div>
      )}

      {/* Notification Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          
          {/* Dropdown */}
          <div className={`absolute ${dropdownPosition} mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-20 max-h-96 overflow-hidden`}>
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
              <div className="flex items-center space-x-2">
                {showSettings && (
                  <button
                    onClick={() => setShowSettingsPanel(!showSettingsPanel)}
                    className="text-gray-400 hover:text-gray-600 p-1 rounded"
                    title="Notification settings"
                    aria-label="Notification settings"
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={dismissAll}
                    className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
                  >
                    Clear all
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
                  title="Close notifications"
                  aria-label="Close notifications"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Settings Panel */}
            {showSettingsPanel && (
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Notification Settings</h4>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={notificationSettings.soundEnabled}
                      onChange={(e) => handleSettingsChange('soundEnabled', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <Volume2 className="h-4 w-4" />
                    <span>Sound notifications</span>
                  </label>
                  <label className="flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={notificationSettings.vibrationEnabled}
                      onChange={(e) => handleSettingsChange('vibrationEnabled', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <Vibrate className="h-4 w-4" />
                    <span>Vibration</span>
                  </label>
                  <label className="flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={notificationSettings.showBrowserNotifications}
                      onChange={(e) => handleSettingsChange('showBrowserNotifications', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <Smartphone className="h-4 w-4" />
                    <span>Browser notifications</span>
                  </label>
                </div>
              </div>
            )}

            {/* Filters and Search */}
            {(enableFiltering || enableSearch) && (
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                {enableFiltering && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {[
                      { key: 'all', label: 'All' },
                      { key: 'unread', label: 'Unread' },
                      { key: 'urgent', label: 'Urgent' },
                      { key: 'hos_compliance', label: 'HOS' },
                      { key: 'trip_management', label: 'Trips' }
                    ].map(filterOption => (
                      <button
                        key={filterOption.key}
                        onClick={() => setFilter(filterOption.key as any)}
                        className={`px-2 py-1 text-xs rounded-full transition-colors ${
                          filter === filterOption.key
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {filterOption.label}
                      </button>
                    ))}
                  </div>
                )}
                {enableSearch && (
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search notifications..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Notifications List */}
            <div className="max-h-80 overflow-y-auto">
              {isLoading ? (
                <div className="px-4 py-8 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm">Loading notifications...</p>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500">
                  <Bell className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">
                    {searchQuery || filter !== 'all' 
                      ? 'No notifications match your filter' 
                      : 'No notifications'
                    }
                  </p>
                  {(searchQuery || filter !== 'all') && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setFilter('all');
                      }}
                      className="mt-2 text-xs text-blue-600 hover:text-blue-800"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`px-4 py-3 hover:bg-gray-50 transition-colors border-l-4 ${getNotificationBgColor(notification.type)} ${getPriorityColor(notification.priority || 'normal')}`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {notification.title}
                                </p>
                                {notification.priority && notification.priority !== 'normal' && (
                                  <span className={`text-xs px-2 py-1 rounded-full ${
                                    notification.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                                    notification.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {getPriorityText(notification.priority)}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                {notification.message}
                              </p>
                              {notification.timestamp && (
                                <p className="text-xs text-gray-400 mt-1">
                                  {new Date(notification.timestamp).toLocaleString()}
                                </p>
                              )}
                              {notification.action && (
                                <button
                                  onClick={notification.action.callback}
                                  className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium focus:outline-none focus:underline"
                                >
                                  {notification.action.label}
                                </button>
                              )}
                            </div>
                            <div className="flex items-center space-x-1 ml-2">
                              <button
                                onClick={() => markAsRead(notification.id!)}
                                className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
                                title="Mark as read"
                                aria-label="Mark notification as read"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => dismiss(notification.id!)}
                                className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
                                title="Dismiss"
                                aria-label="Dismiss notification"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {filteredNotifications.length > 0 && (
              <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''}
                    {filter !== 'all' && ` (filtered)`}
                  </p>
                  <div className="flex items-center space-x-2">
                    {filter === 'hos_compliance' && (
                      <button
                        onClick={() => clearByCategory('hos_compliance')}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Clear HOS
                      </button>
                    )}
                    {filter === 'trip_management' && (
                      <button
                        onClick={() => clearByCategory('trip_management')}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Clear Trips
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationButton;