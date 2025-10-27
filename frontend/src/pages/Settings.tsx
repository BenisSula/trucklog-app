import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings as SettingsIcon,
  Palette,
  Clock,
  Route,
  Shield,
  Globe,
  Download,
  Upload,
  RotateCcw,
  Save,
  Moon,
  Sun,
  Monitor,
  RefreshCw,
} from 'lucide-react';
import { ToggleTheme } from '../components/ToggleTheme';
import { useSettings } from '../contexts/SettingsContext';
import SettingsCard from '../components/settings/SettingsCard';
import ToggleSwitch from '../components/settings/ToggleSwitch';
import SelectField from '../components/settings/SelectField';
import NotificationSettings from '../components/settings/NotificationSettings';
import { ICON_STYLES, BUTTON_STYLES } from '../config/theme';
import { apiService } from '../services/api';
import toast from 'react-hot-toast';

const Settings: React.FC = () => {
  const { settings, updateSetting, resetSettings, exportSettings, importSettings } = useSettings();
  const [importData, setImportData] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Auto-sync settings with backend
  useEffect(() => {
    const syncSettings = async () => {
      try {
        setIsSyncing(true);
        // Sync settings with backend if needed
        await syncWithBackend();
        setLastSyncTime(new Date());
      } catch (error) {
        console.error('Settings sync failed:', error);
      } finally {
        setIsSyncing(false);
      }
    };

    // Auto-sync every 30 seconds
    const interval = setInterval(syncSettings, 30000);
    
    // Initial sync
    syncSettings();

    return () => clearInterval(interval);
  }, [settings, syncWithBackend]);

  // Handle theme changes
  useEffect(() => {
    if (settings.theme === 'auto') {
      // Follow system preference
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        updateSetting('darkMode', e.matches);
      };
      
      // Set initial value
      updateSetting('darkMode', mediaQuery.matches);
      
      // Listen for changes
      mediaQuery.addEventListener('change', handleChange);
      
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      // Manual theme selection
      updateSetting('darkMode', settings.theme === 'dark');
    }
  }, [settings.theme, updateSetting]);

  // Handle language changes
  const handleLanguageChange = (language: string) => {
    updateSetting('language', language);
    // You can add i18n integration here
    toast.success(`Language changed to ${languageOptions.find(opt => opt.value === language)?.label}`);
  };

  // Handle units change
  const handleUnitsChange = (units: string) => {
    updateSetting('units', units);
    toast.success(`Units changed to ${units === 'metric' ? 'Metric' : 'Imperial'}`);
  };

  const syncWithBackend = useCallback(async () => {
    try {
      // Sync driver profile settings with backend
      await apiService.updateDriverProfile({
        timezone: settings.timezone,
        cycle_type: settings.hos.cycleType,
      });
    } catch (error) {
      console.error('Backend sync failed:', error);
    }
  }, [settings.timezone, settings.hos.cycleType]);

  const handleRefresh = async () => {
    try {
      setIsLoading(true);
      await syncWithBackend();
      setLastSyncTime(new Date());
      toast.success('Settings refreshed successfully');
    } catch (error) {
      toast.error('Failed to refresh settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    try {
      const settingsJson = exportSettings();
      const blob = new Blob([settingsJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trucklog-settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('✅ Settings exported successfully');
    } catch (error) {
      toast.error('❌ Failed to export settings');
      console.error('Export error:', error);
    }
  };

  const handleImport = async () => {
    if (!importData.trim()) {
      toast.error('Please paste settings data');
      return;
    }
    
    try {
      const success = importSettings(importData);
      if (success) {
        toast.success('✅ Settings imported successfully');
        setShowImportModal(false);
        setImportData('');
        // Sync with backend after import
        await syncWithBackend();
        setLastSyncTime(new Date());
      } else {
        toast.error('❌ Invalid settings data format');
      }
    } catch (error) {
      toast.error('❌ Failed to import settings');
      console.error('Import error:', error);
    }
  };

  const handleReset = async () => {
    if (window.confirm('Are you sure you want to reset all settings to default? This action cannot be undone.')) {
      try {
        resetSettings();
        toast.success('✅ Settings reset to default');
        // Sync with backend after reset
        await syncWithBackend();
        setLastSyncTime(new Date());
      } catch (error) {
        toast.error('❌ Failed to reset settings');
        console.error('Reset error:', error);
      }
    }
  };

  // Format sync time
  const formatSyncTime = (date: Date): string => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  const themeOptions = [
    { value: 'light', label: 'Light', description: 'Always use light theme' },
    { value: 'dark', label: 'Dark', description: 'Always use dark theme' },
    { value: 'auto', label: 'Auto', description: 'Follow system preference' },
  ];

  const languageOptions = [
    { value: 'en', label: 'English (US)', description: 'English - United States' },
    { value: 'es', label: 'Español', description: 'Spanish' },
    { value: 'fr', label: 'Français', description: 'French' },
    { value: 'de', label: 'Deutsch', description: 'German' },
    { value: 'pt', label: 'Português', description: 'Portuguese' },
  ];

  const timezoneOptions = [
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
    { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' },
  ];

  const cycleOptions = [
    { value: '70_8', label: '70/8 Hour Cycle', description: '70 hours in 8 days' },
    { value: '60_7', label: '60/7 Hour Cycle', description: '60 hours in 7 days' },
  ];

  const unitsOptions = [
    { value: 'imperial', label: 'Imperial (miles, °F)', description: 'Miles, Fahrenheit, Gallons' },
    { value: 'metric', label: 'Metric (km, °C)', description: 'Kilometers, Celsius, Liters' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-4 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8">
          <div className="mb-4 sm:mb-0">
            <div className="flex items-center space-x-3 mb-2">
              <div className={ICON_STYLES.sectionHeader}>
                <SettingsIcon className={ICON_STYLES.sectionHeaderIcon} />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900">Settings</h1>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 mt-1 sm:mt-2">
              <p className="text-neutral-600">Customize your TruckLog experience and manage your preferences</p>
              {lastSyncTime && (
                <div className="flex items-center space-x-2 text-sm text-success-600 mt-1 sm:mt-0">
                  <div className={`w-2 h-2 bg-success-500 rounded-full ${isSyncing ? 'animate-pulse' : ''}`}></div>
                  <span>Synced: {formatSyncTime(lastSyncTime)}</span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className={`flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto ${BUTTON_STYLES.primary}`}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Settings Grid - 2 columns by 4 rows */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Row 1 - Appearance & HOS Settings */}
          <SettingsCard
            title="Appearance"
            description="Customize the look and feel of your application"
            icon={Palette}
          >
            <SelectField
              id="theme"
              label="Theme"
              description="Choose your preferred color scheme"
              value={settings.theme}
              options={themeOptions}
              onChange={(value) => {
                updateSetting('theme', value);
                toast.success(`Theme set to ${themeOptions.find(opt => opt.value === value)?.label}`);
              }}
              icon={settings.theme === 'light' ? Sun : settings.theme === 'dark' ? Moon : Monitor}
            />
            
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0 mr-4">
                <label className="block text-sm font-medium text-neutral-900">
                  Quick Theme Toggle
                </label>
                <p className="mt-1 text-sm text-neutral-500">
                  Instant theme switching with animation
                </p>
              </div>
              <ToggleTheme
                onToggle={(isDark) => {
                  updateSetting('darkMode', isDark);
                  updateSetting('theme', isDark ? 'dark' : 'light');
                  toast.success(`${isDark ? '🌙' : '☀️'} ${isDark ? 'Dark' : 'Light'} mode activated`);
                }}
                className="bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700"
              />
            </div>



            <ToggleSwitch
              id="darkMode"
              label="Manual Dark Mode Switch"
              description="Traditional toggle switch for dark mode"
              checked={settings.darkMode}
              onChange={(checked) => {
                updateSetting('darkMode', checked);
                updateSetting('theme', checked ? 'dark' : 'light');
                document.documentElement.classList.toggle('dark', checked);
                toast.success(`Dark mode ${checked ? 'enabled' : 'disabled'}`);
              }}
              disabled={settings.theme === 'auto'}
            />
          </SettingsCard>

          <SettingsCard
            title="Hours of Service (HOS)"
            description="Configure your HOS compliance and monitoring preferences"
            icon={Clock}
          >
            <SelectField
              id="hos-cycle"
              label="HOS Cycle Type"
              description="Select your applicable HOS cycle"
              value={settings.hos.cycleType}
              options={cycleOptions}
              onChange={(value) => {
                updateSetting('hos.cycleType', value);
                const cycleName = cycleOptions.find(opt => opt.value === value)?.label;
                toast.success(`HOS cycle changed to ${cycleName}`);
              }}
              icon={Clock}
            />
            <ToggleSwitch
              id="hos-break-reminders"
              label="Auto Break Reminders"
              description="Automatically remind you when breaks are required"
              checked={settings.hos.autoBreakReminders}
              onChange={(checked) => {
                updateSetting('hos.autoBreakReminders', checked);
                toast.success(`Break reminders ${checked ? 'enabled' : 'disabled'}`);
              }}
            />
            <ToggleSwitch
              id="hos-violation-alerts"
              label="Violation Alerts"
              description="Get alerts for potential HOS violations"
              checked={settings.hos.violationAlerts}
              onChange={(checked) => {
                updateSetting('hos.violationAlerts', checked);
                toast.success(`Violation alerts ${checked ? 'enabled' : 'disabled'}`);
              }}
            />
          </SettingsCard>

          {/* Row 2 - Trip Management & Privacy */}
          <SettingsCard
            title="Trip Management"
            description="Configure trip planning and tracking preferences"
            icon={Route}
          >
            <ToggleSwitch
              id="trips-auto-save"
              label="Auto-save Trips"
              description="Automatically save trip data as you enter it"
              checked={settings.trips.autoSave}
              onChange={(checked) => {
                updateSetting('trips.autoSave', checked);
                toast.success(`Auto-save ${checked ? '💾 enabled' : 'disabled'}`);
              }}
            />
            <ToggleSwitch
              id="trips-route-optimization"
              label="Route Optimization"
              description="Optimize routes for fuel efficiency and time"
              checked={settings.trips.routeOptimization}
              onChange={(checked) => {
                updateSetting('trips.routeOptimization', checked);
                toast.success(`Route optimization ${checked ? '🗺️ enabled' : 'disabled'}`);
              }}
            />
            <ToggleSwitch
              id="trips-fuel-tracking"
              label="Fuel Tracking"
              description="Track fuel consumption and costs"
              checked={settings.trips.fuelTracking}
              onChange={(checked) => {
                updateSetting('trips.fuelTracking', checked);
                toast.success(`Fuel tracking ${checked ? '⛽ enabled' : 'disabled'}`);
              }}
            />
          </SettingsCard>

          <SettingsCard
            title="Privacy & Security"
            description="Manage your privacy and security preferences"
            icon={Shield}
          >
            <ToggleSwitch
              id="privacy-share-location"
              label="Share Location"
              description="Allow location sharing for fleet management"
              checked={settings.privacy.shareLocation}
              onChange={(checked) => {
                updateSetting('privacy.shareLocation', checked);
                toast.success(`Location sharing ${checked ? '📍 enabled' : 'disabled'}`);
              }}
            />
            <ToggleSwitch
              id="privacy-analytics"
              label="Usage Analytics"
              description="Help improve the app by sharing anonymous usage data"
              checked={settings.privacy.analytics}
              onChange={(checked) => {
                updateSetting('privacy.analytics', checked);
                toast.success(`Analytics ${checked ? '📊 enabled' : 'disabled'}`);
              }}
            />
            <ToggleSwitch
              id="privacy-crash-reporting"
              label="Crash Reporting"
              description="Automatically report crashes to help fix issues"
              checked={settings.privacy.crashReporting}
              onChange={(checked) => {
                updateSetting('privacy.crashReporting', checked);
                toast.success(`Crash reporting ${checked ? '🐛 enabled' : 'disabled'}`);
              }}
            />
          </SettingsCard>

          {/* Row 3 - Language & Notifications */}
          <SettingsCard
            title="Language & Region"
            description="Set your language, timezone, and regional preferences"
            icon={Globe}
          >
            <SelectField
              id="language"
              label="Language"
              description="Choose your preferred language"
              value={settings.language}
              options={languageOptions}
              onChange={handleLanguageChange}
              icon={Globe}
            />
            <SelectField
              id="timezone"
              label="Timezone"
              description="Select your local timezone"
              value={settings.timezone}
              options={timezoneOptions}
              onChange={(value) => {
                updateSetting('timezone', value);
                const timezoneName = timezoneOptions.find(opt => opt.value === value)?.label;
                toast.success(`🕐 Timezone changed to ${timezoneName}`);
              }}
              icon={Clock}
            />
            <SelectField
              id="units"
              label="Units"
              description="Choose your preferred unit system"
              value={settings.units}
              options={unitsOptions}
              onChange={handleUnitsChange}
            />
          </SettingsCard>

          {/* Notification Settings - Full width component */}
          <div className="lg:col-span-2">
            <NotificationSettings 
              showTestButtons={true}
              onSettingsChange={(notificationSettings) => {
                // Optional: sync with main settings context if needed
                console.log('Notification settings changed:', notificationSettings);
              }}
            />
          </div>

          {/* Row 4 - Data Management (spans both columns) */}
          <div className="lg:col-span-2">
            <SettingsCard
              title="Data Management"
              description="Export, import, or reset your settings"
              icon={Save}
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={handleExport}
                  className={`inline-flex items-center justify-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 hover:scale-105 ${BUTTON_STYLES.secondary} border-2 border-transparent hover:border-primary-200`}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Settings
                </button>
                <button
                  type="button"
                  onClick={() => setShowImportModal(true)}
                  className={`inline-flex items-center justify-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 hover:scale-105 ${BUTTON_STYLES.secondary} border-2 border-transparent hover:border-primary-200`}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import Settings
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className={`inline-flex items-center justify-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 hover:scale-105 ${BUTTON_STYLES.danger} border-2 border-transparent hover:border-error-300`}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset to Default
                </button>
              </div>
            </SettingsCard>
          </div>
        </div>

        {/* Import Modal */}
        {showImportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-neutral-900 mb-4">
                Import Settings
              </h3>
              <p className="text-sm text-neutral-600 mb-4">
                Paste your exported settings JSON data below:
              </p>
              <textarea
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                placeholder="Paste settings JSON here..."
                className="w-full h-32 p-3 border border-neutral-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <div className="flex justify-end space-x-3 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowImportModal(false);
                    setImportData('');
                  }}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${BUTTON_STYLES.secondary}`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleImport}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${BUTTON_STYLES.primary}`}
                >
                  Import
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;