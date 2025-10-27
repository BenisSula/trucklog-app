import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface SettingsState {
  // Appearance
  darkMode: boolean;
  theme: 'light' | 'dark' | 'auto';
  // HOS Settings
  hos: {
    autoBreakReminders: boolean;
    violationAlerts: boolean;
    cycleType: '70_8' | '60_7';
  };
  // Trip Settings
  trips: {
    autoSave: boolean;
    routeOptimization: boolean;
    fuelTracking: boolean;
  };
  // Privacy & Security
  privacy: {
    shareLocation: boolean;
    analytics: boolean;
    crashReporting: boolean;
  };
  // Language & Region
  language: string;
  timezone: string;
  units: 'metric' | 'imperial';
}

interface SettingsContextType {
  settings: SettingsState;
  updateSetting: (path: string, value: any) => void;
  resetSettings: () => void;
  exportSettings: () => string;
  importSettings: (settingsJson: string) => boolean;
}

const defaultSettings: SettingsState = {
  darkMode: false,
  theme: 'light',
  hos: {
    autoBreakReminders: true,
    violationAlerts: true,
    cycleType: '70_8',
  },
  trips: {
    autoSave: true,
    routeOptimization: true,
    fuelTracking: false,
  },
  privacy: {
    shareLocation: false,
    analytics: true,
    crashReporting: true,
  },
  language: 'en',
  timezone: 'America/New_York',
  units: 'imperial',
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('trucklog_settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...defaultSettings, ...parsed });
      } catch (error) {
        console.error('Failed to parse saved settings:', error);
      }
    }
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('trucklog_settings', JSON.stringify(settings));
  }, [settings]);

  // Apply dark mode to document
  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.darkMode]);

  const updateSetting = (path: string, value: any) => {
    setSettings(prev => {
      const newSettings = { ...prev };
      const keys = path.split('.');
      let current: any = newSettings;
      
      // Navigate to the parent of the target property
      for (let i = 0; i < keys.length - 1; i++) {
        if (current[keys[i]] === undefined) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      
      // Set the value
      current[keys[keys.length - 1]] = value;
      return newSettings;
    });
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    localStorage.removeItem('trucklog_settings');
  };

  const exportSettings = (): string => {
    return JSON.stringify(settings, null, 2);
  };

  const importSettings = (settingsJson: string): boolean => {
    try {
      const parsed = JSON.parse(settingsJson);
      setSettings({ ...defaultSettings, ...parsed });
      return true;
    } catch (error) {
      console.error('Failed to import settings:', error);
      return false;
    }
  };

  const value: SettingsContextType = {
    settings,
    updateSetting,
    resetSettings,
    exportSettings,
    importSettings,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};