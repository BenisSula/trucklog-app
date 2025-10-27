import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import SettingsCard from './SettingsCard';
import ToggleSwitch from './ToggleSwitch';
import SelectField from './SelectField';
import notificationService from '../../services/notification';
import { BUTTON_STYLES, FORM_STYLES } from '../../config/theme';
import toast from 'react-hot-toast';

interface NotificationSettingsData {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  browserNotificationsEnabled: boolean;
  notificationPermission: NotificationPermission;
  autoMarkAsRead: boolean;
  showPreview: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  priorityFilter: 'all' | 'high' | 'urgent';
  maxNotifications: number;
  autoRefresh: boolean;
  refreshInterval: number;
}

interface NotificationSettingsProps {
  className?: string;
  showTestButtons?: boolean;
  onSettingsChange?: (settings: NotificationSettingsData) => void;
  showCard?: boolean;
}

const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  className = '',
  showTestButtons = true,
  onSettingsChange,
  showCard = true
}) => {
  const [settings, setSettings] = useState<NotificationSettingsData>({
    soundEnabled: true,
    vibrationEnabled: true,
    browserNotificationsEnabled: false,
    notificationPermission: 'default',
    autoMarkAsRead: false,
    showPreview: true,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
    priorityFilter: 'all',
    maxNotifications: 50,
    autoRefresh: true,
    refreshInterval: 30000,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  // Notify parent of changes
  useEffect(() => {
    if (onSettingsChange) {
      onSettingsChange(settings);
    }
  }, [settings, onSettingsChange]);

  const loadSettings = async () => {
    try {
      const notificationSettings = notificationService.getSettings();
      const permission = 'Notification' in window ? Notification.permission : 'denied';
      
      setSettings({
        soundEnabled: notificationSettings.soundEnabled,
        vibrationEnabled: notificationSettings.vibrationEnabled,
        browserNotificationsEnabled: notificationSettings.browserNotificationsEnabled,
        notificationPermission: permission,
        autoMarkAsRead: notificationSettings.autoMarkAsRead || false,
        showPreview: notificationSettings.showPreview !== false,
        quietHoursEnabled: notificationSettings.quietHoursEnabled || false,
        quietHoursStart: notificationSettings.quietHoursStart || '22:00',
        quietHoursEnd: notificationSettings.quietHoursEnd || '07:00',
        priorityFilter: notificationSettings.priorityFilter || 'all',
        maxNotifications: notificationSettings.maxNotifications || 50,
        autoRefresh: notificationSettings.autoRefresh !== false,
        refreshInterval: notificationSettings.refreshInterval || 30000,
      });
    } catch (error) {
      console.error('Failed to load notification settings:', error);
      toast.error('Failed to load notification settings');
    }
  };

  const updateSetting = <K extends keyof NotificationSettingsData>(
    key: K, 
    value: NotificationSettingsData[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasUnsavedChanges(true);

    // Apply setting immediately for certain settings
    if (key === 'soundEnabled') {
      notificationService.setSoundEnabled(value as boolean);
    } else if (key === 'vibrationEnabled') {
      notificationService.setVibrationEnabled(value as boolean);
    } else if (key === 'browserNotificationsEnabled') {
      notificationService.setBrowserNotificationsEnabled(value as boolean);
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Browser notifications are not supported');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setSettings(prev => ({ 
        ...prev, 
        notificationPermission: permission,
        browserNotificationsEnabled: permission === 'granted'
      }));
      
      if (permission === 'granted') {
        notificationService.setBrowserNotificationsEnabled(true);
        toast.success('Browser notifications enabled');
      } else {
        toast.error('Browser notifications denied');
      }
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      toast.error('Failed to request notification permission');
    }
  };

  const saveSettings = async () => {
    try {
      setIsLoading(true);
      
      // Save to notification service
      notificationService.updateSettings({
        soundEnabled: settings.soundEnabled,
        vibrationEnabled: settings.vibrationEnabled,
        browserNotificationsEnabled: settings.browserNotificationsEnabled,
        autoMarkAsRead: settings.autoMarkAsRead,
        showPreview: settings.showPreview,
        quietHoursEnabled: settings.quietHoursEnabled,
        quietHoursStart: settings.quietHoursStart,
        quietHoursEnd: settings.quietHoursEnd,
        priorityFilter: settings.priorityFilter,
        maxNotifications: settings.maxNotifications,
        autoRefresh: settings.autoRefresh,
        refreshInterval: settings.refreshInterval,
      });

      setHasUnsavedChanges(false);
      toast.success('Notification settings saved');
    } catch (error) {
      console.error('Failed to save notification settings:', error);
      toast.error('Failed to save notification settings');
    } finally {
      setIsLoading(false);
    }
  };

  const resetSettings = () => {
    setSettings({
      soundEnabled: true,
      vibrationEnabled: true,
      browserNotificationsEnabled: false,
      notificationPermission: settings.notificationPermission,
      autoMarkAsRead: false,
      showPreview: true,
      quietHoursEnabled: false,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
      priorityFilter: 'all',
      maxNotifications: 50,
      autoRefresh: true,
      refreshInterval: 30000,
    });
    setHasUnsavedChanges(true);
    toast.success('Settings reset to defaults');
  };

  const testNotification = (type: 'info' | 'success' | 'warning' | 'error') => {
    const messages = {
      info: { title: 'Test Info', message: 'This is a test information notification' },
      success: { title: 'Test Success', message: 'This is a test success notification' },
      warning: { title: 'Test Warning', message: 'This is a test warning notification' },
      error: { title: 'Test Error', message: 'This is a test error notification' },
    };

    notificationService.show({
      ...messages[type],
      type,
      priority: type === 'error' ? 'urgent' : 'normal',
      sound: settings.soundEnabled,
      vibration: settings.vibrationEnabled,
    });
  };

  const priorityOptions = [
    { value: 'all', label: 'All Notifications' },
    { value: 'high', label: 'High Priority Only' },
    { value: 'urgent', label: 'Urgent Only' },
  ];

  const refreshIntervalOptions = [
    { value: '10000', label: '10 seconds' },
    { value: '30000', label: '30 seconds' },
    { value: '60000', label: '1 minute' },
    { value: '300000', label: '5 minutes' },
  ];

  const maxNotificationOptions = [
    { value: '25', label: '25 notifications' },
    { value: '50', label: '50 notifications' },
    { value: '100', label: '100 notifications' },
    { value: '200', label: '200 notifications' },
  ];

  const settingsContent = (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-medium text-neutral-900 mb-4">Basic Settings</h4>
        <div className="space-y-4">
          <ToggleSwitch
            id="sound-enabled"
            label="Sound Notifications"
            description="Play sound when notifications arrive"
            checked={settings.soundEnabled}
            onChange={(checked) => updateSetting('soundEnabled', checked)}
          />

          <ToggleSwitch
            id="vibration-enabled"
            label="Vibration"
            description="Vibrate device for important notifications"
            checked={settings.vibrationEnabled}
            onChange={(checked) => updateSetting('vibrationEnabled', checked)}
          />

          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0 mr-4">
              <label className="block text-sm font-medium text-neutral-900">
                Browser Notifications
              </label>
              <p className="mt-1 text-sm text-neutral-500">
                Show notifications even when the app is not active
              </p>
              {settings.notificationPermission === 'denied' && (
                <p className="mt-1 text-sm text-error-600">
                  Permission denied. Please enable in browser settings.
                </p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {settings.notificationPermission === 'granted' ? (
                <CheckCircle className="h-5 w-5 text-success-600" />
              ) : settings.notificationPermission === 'denied' ? (
                <AlertTriangle className="h-5 w-5 text-error-600" />
              ) : null}
              <button
                onClick={requestNotificationPermission}
                disabled={settings.notificationPermission === 'granted'}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  settings.notificationPermission === 'granted'
                    ? 'bg-success-100 text-success-800 cursor-not-allowed'
                    : `${BUTTON_STYLES.primary} focus:outline-none focus:ring-2 focus:ring-offset-2`
                }`}
              >
                {settings.notificationPermission === 'granted' ? 'Enabled' : 'Enable'}
              </button>
            </div>
          </div>

          <ToggleSwitch
            id="show-preview"
            label="Show Preview"
            description="Display notification content in previews"
            checked={settings.showPreview}
            onChange={(checked) => updateSetting('showPreview', checked)}
          />

          <ToggleSwitch
            id="auto-mark-read"
            label="Auto Mark as Read"
            description="Automatically mark notifications as read when viewed"
            checked={settings.autoMarkAsRead}
            onChange={(checked) => updateSetting('autoMarkAsRead', checked)}
          />
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-neutral-900 mb-4">Advanced Settings</h4>
        <div className="space-y-4">
          <div>
            <ToggleSwitch
              id="quiet-hours"
              label="Quiet Hours"
              description="Reduce notifications during specified hours"
              checked={settings.quietHoursEnabled}
              onChange={(checked) => updateSetting('quietHoursEnabled', checked)}
            />
            
            {settings.quietHoursEnabled && (
              <div className="mt-3 ml-6 grid grid-cols-2 gap-4">
                <div>
                  <label className={FORM_STYLES.label}>Start Time</label>
                  <input
                    type="time"
                    value={settings.quietHoursStart}
                    onChange={(e) => updateSetting('quietHoursStart', e.target.value)}
                    className={FORM_STYLES.input}
                  />
                </div>
                <div>
                  <label className={FORM_STYLES.label}>End Time</label>
                  <input
                    type="time"
                    value={settings.quietHoursEnd}
                    onChange={(e) => updateSetting('quietHoursEnd', e.target.value)}
                    className={FORM_STYLES.input}
                  />
                </div>
              </div>
            )}
          </div>

          <SelectField
            id="priority-filter"
            label="Priority Filter"
            description="Choose which notifications to show"
            value={settings.priorityFilter}
            onChange={(value) => updateSetting('priorityFilter', value as any)}
            options={priorityOptions}
          />

          <SelectField
            id="max-notifications"
            label="Maximum Notifications"
            description="Limit the number of stored notifications"
            value={settings.maxNotifications.toString()}
            onChange={(value) => updateSetting('maxNotifications', parseInt(value))}
            options={maxNotificationOptions}
          />

          <div>
            <ToggleSwitch
              id="auto-refresh"
              label="Auto Refresh"
              description="Automatically check for new notifications"
              checked={settings.autoRefresh}
              onChange={(checked) => updateSetting('autoRefresh', checked)}
            />
            
            {settings.autoRefresh && (
              <div className="mt-3 ml-6">
                <SelectField
                  id="refresh-interval"
                  label="Refresh Interval"
                  value={settings.refreshInterval.toString()}
                  onChange={(value) => updateSetting('refreshInterval', parseInt(value))}
                  options={refreshIntervalOptions}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {showTestButtons && (
        <div>
          <h4 className="text-sm font-medium text-neutral-900 mb-4">Test Notifications</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              onClick={() => testNotification('info')}
              className={`px-3 py-2 text-sm rounded-md transition-colors ${BUTTON_STYLES.primary} focus:outline-none focus:ring-2 focus:ring-offset-2`}
            >
              Test Info
            </button>
            <button
              onClick={() => testNotification('success')}
              className={`px-3 py-2 text-sm rounded-md transition-colors ${BUTTON_STYLES.success} focus:outline-none focus:ring-2 focus:ring-offset-2`}
            >
              Test Success
            </button>
            <button
              onClick={() => testNotification('warning')}
              className="px-3 py-2 text-sm rounded-md transition-colors text-white bg-accent-600 hover:bg-accent-700 focus:ring-accent-500 focus:outline-none focus:ring-2 focus:ring-offset-2"
            >
              Test Warning
            </button>
            <button
              onClick={() => testNotification('error')}
              className={`px-3 py-2 text-sm rounded-md transition-colors ${BUTTON_STYLES.danger} focus:outline-none focus:ring-2 focus:ring-offset-2`}
            >
              Test Error
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-6 border-t border-neutral-200">
        <button
          onClick={resetSettings}
          className={`px-4 py-2 text-sm rounded-md transition-colors ${BUTTON_STYLES.secondary} focus:outline-none focus:ring-2 focus:ring-offset-2`}
        >
          Reset to Defaults
        </button>
        
        <div className="flex items-center space-x-3">
          {hasUnsavedChanges && (
            <span className="text-sm text-accent-600">Unsaved changes</span>
          )}
          <button
            onClick={saveSettings}
            disabled={isLoading || !hasUnsavedChanges}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${BUTTON_STYLES.primary} focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isLoading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className={className}>
      {showCard ? (
        <SettingsCard
          title="Notification Settings"
          description="Configure how you receive and manage notifications"
          icon={Bell}
        >
          {settingsContent}
        </SettingsCard>
      ) : (
        <div className="p-6">
          {settingsContent}
        </div>
      )}
    </div>
  );
};

export default NotificationSettings;