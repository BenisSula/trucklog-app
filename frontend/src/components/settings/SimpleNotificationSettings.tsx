import React, { useState, useEffect } from 'react';
import { Bell, AlertTriangle, CheckCircle } from 'lucide-react';
import notificationService from '../../services/notification';
import { BUTTON_STYLES } from '../../config/theme';
import toast from 'react-hot-toast';

interface SimpleNotificationSettingsProps {
  className?: string;
}

const SimpleNotificationSettings: React.FC<SimpleNotificationSettingsProps> = ({
  className = ''
}) => {
  const [settings, setSettings] = useState({
    soundEnabled: true,
    vibrationEnabled: true,
    browserNotificationsEnabled: false,
    notificationPermission: 'default' as NotificationPermission,
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const notificationSettings = notificationService.getSettings();
    const permission = 'Notification' in window ? Notification.permission : 'denied';
    
    setSettings({
      soundEnabled: notificationSettings.soundEnabled,
      vibrationEnabled: notificationSettings.vibrationEnabled,
      browserNotificationsEnabled: notificationSettings.browserNotificationsEnabled,
      notificationPermission: permission,
    });
  }, []);

  const updateSetting = (key: string, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    
    if (key === 'soundEnabled') {
      notificationService.setSoundEnabled(value);
    } else if (key === 'vibrationEnabled') {
      notificationService.setVibrationEnabled(value);
    } else if (key === 'browserNotificationsEnabled') {
      notificationService.setBrowserNotificationsEnabled(value);
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

  return (
    <div className={`p-6 ${className}`}>
      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-medium text-neutral-900 mb-4">Basic Settings</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-neutral-900">
                  Sound Notifications
                </label>
                <p className="text-sm text-neutral-500">Play sound when notifications arrive</p>
              </div>
              <button
                onClick={() => updateSetting('soundEnabled', !settings.soundEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.soundEnabled ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.soundEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-neutral-900">
                  Vibration
                </label>
                <p className="text-sm text-neutral-500">Vibrate device for important notifications</p>
              </div>
              <button
                onClick={() => updateSetting('vibrationEnabled', !settings.vibrationEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.vibrationEnabled ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.vibrationEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0 mr-4">
                <label className="block text-sm font-medium text-neutral-900">
                  Browser Notifications
                </label>
                <p className="mt-1 text-sm text-neutral-500">
                  Show notifications even when the app is not active
                </p>
                {settings.notificationPermission === 'denied' && (
                  <p className="mt-1 text-sm text-red-600">
                    Permission denied. Please enable in browser settings.
                  </p>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {settings.notificationPermission === 'granted' ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : settings.notificationPermission === 'denied' ? (
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                ) : null}
                <button
                  onClick={requestNotificationPermission}
                  disabled={settings.notificationPermission === 'granted'}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    settings.notificationPermission === 'granted'
                      ? 'bg-green-100 text-green-800 cursor-not-allowed'
                      : `${BUTTON_STYLES.primary} focus:outline-none focus:ring-2 focus:ring-offset-2`
                  }`}
                >
                  {settings.notificationPermission === 'granted' ? 'Enabled' : 'Enable'}
                </button>
              </div>
            </div>
          </div>
        </div>

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
              className="px-3 py-2 text-sm rounded-md transition-colors text-white bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2"
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
      </div>
    </div>
  );
};

export default SimpleNotificationSettings;