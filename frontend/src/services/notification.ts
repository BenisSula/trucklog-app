/**
 * Notification Service
 * Manages real-time notifications and alerts
 */

import toast from 'react-hot-toast';

export interface NotificationData {
  id?: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'hos_violation' | 'trip_update' | 'maintenance' | 'document' | 'system';
  duration?: number;
  action?: {
    label: string;
    callback: () => void;
  };
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  category?: string;
  timestamp?: string;
  persistent?: boolean;
  sound?: boolean;
  vibration?: boolean;
}

export interface NotificationOptions {
  duration?: number;
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  action?: {
    label: string;
    callback: () => void;
  };
}

class NotificationService {
  private notifications = new Map<string, NotificationData>();
  private maxNotifications = 50;
  private soundEnabled = true;
  private vibrationEnabled = true;
  private browserNotificationsEnabled = true;
  private notificationPermission = 'default';
  private autoMarkAsRead = false;
  private showPreview = true;
  private quietHoursEnabled = false;
  private quietHoursStart = '22:00';
  private quietHoursEnd = '07:00';
  private priorityFilter: 'all' | 'high' | 'urgent' = 'all';
  private autoRefresh = true;
  private refreshInterval = 30000;
  private connectionStatusTimeout: NodeJS.Timeout | null = null;
  private readonly SETTINGS_KEY = 'trucklog_notification_settings';

  constructor() {
    this.loadSettings();
    this.requestNotificationPermission();
    this.setupAudioContext();
  }

  /**
   * Request notification permission for browser notifications
   */
  private async requestNotificationPermission(): Promise<void> {
    if ('Notification' in window) {
      this.notificationPermission = await Notification.requestPermission();
    }
  }

  /**
   * Setup audio context for notification sounds
   */
  private setupAudioContext(): void {
    // Audio context will be created when first sound is played
  }

  /**
   * Play notification sound
   */
  private playSound(type: string): void {
    if (!this.soundEnabled) return;

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Different frequencies for different notification types
      const frequencies = {
        success: 800,
        error: 400,
        warning: 600,
        info: 500
      };

      oscillator.frequency.setValueAtTime(frequencies[type as keyof typeof frequencies] || 500, audioContext.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.warn('Could not play notification sound:', error);
    }
  }

  /**
   * Trigger device vibration
   */
  private triggerVibration(pattern: number[] = [200, 100, 200]): void {
    if (!this.vibrationEnabled || !navigator.vibrate) return;

    try {
      navigator.vibrate(pattern);
    } catch (error) {
      console.warn('Could not trigger vibration:', error);
    }
  }

  /**
   * Show browser notification
   */
  private showBrowserNotification(notification: NotificationData): void {
    if (!this.browserNotificationsEnabled || this.notificationPermission !== 'granted') return;

    try {
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: '/logo192.png',
        badge: '/logo192.png',
        tag: notification.id,
        requireInteraction: notification.persistent || notification.priority === 'urgent',
        silent: !notification.sound
      });

      browserNotification.onclick = () => {
        window.focus();
        browserNotification.close();
        if (notification.action) {
          notification.action.callback();
        }
      };

      // Auto-close after duration
      if (notification.duration && notification.duration > 0) {
        setTimeout(() => {
          browserNotification.close();
        }, notification.duration);
      }
    } catch (error) {
      console.warn('Could not show browser notification:', error);
    }
  }

  /**
   * Show a notification with enhanced features
   */
  show(notification: NotificationData, options: NotificationOptions = {}): string {
    const id = notification.id || this.generateId();
    const duration = notification.duration || options.duration || this.getDefaultDuration(notification.type);
    const timestamp = new Date().toISOString();
    
    // Enhanced notification data
    const enhancedNotification: NotificationData = {
      ...notification,
      id,
      timestamp,
      priority: notification.priority || 'normal',
      category: notification.category || 'general',
      persistent: notification.persistent || notification.priority === 'urgent',
      sound: notification.sound !== false,
      vibration: notification.vibration !== false
    };
    
    // Store notification
    this.notifications.set(id, enhancedNotification);
    this.cleanupOldNotifications();

    // Sync with backend if this is a new notification (not from backend)
    if (!notification.id?.toString().startsWith('backend-')) {
      this.syncToBackend(enhancedNotification);
    }

    // Play sound and vibration for high priority notifications
    if (enhancedNotification.priority === 'high' || enhancedNotification.priority === 'urgent') {
      this.playSound(notification.type);
      this.triggerVibration(enhancedNotification.priority === 'urgent' ? [300, 100, 300, 100, 300] : [200, 100, 200]);
    }

    // Show browser notification for important alerts
    if (enhancedNotification.priority === 'urgent' || enhancedNotification.persistent) {
      this.showBrowserNotification(enhancedNotification);
    }

    // Show toast notification
    const toastOptions = {
      duration: enhancedNotification.persistent ? Infinity : duration,
      position: options.position || 'top-right',
      id,
    };

    switch (notification.type) {
      case 'success':
        toast.success(notification.message, toastOptions);
        break;
      case 'error':
        toast.error(notification.message, toastOptions);
        break;
      case 'warning':
        toast(notification.message, {
          ...toastOptions,
          icon: '⚠️',
        });
        break;
      case 'info':
      default:
        toast(notification.message, {
          ...toastOptions,
          icon: 'ℹ️',
        });
        break;
    }

    // Add action button if provided
    if (notification.action) {
      setTimeout(() => {
        const toastElement = document.querySelector(`[data-toast-id="${id}"]`);
        if (toastElement) {
          const actionButton = document.createElement('button');
          actionButton.textContent = notification.action!.label;
          actionButton.className = 'ml-2 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700';
          actionButton.onclick = notification.action!.callback;
          toastElement.appendChild(actionButton);
        }
      }, 100);
    }

    return id;
  }

  /**
   * Show HOS violation alert with enhanced features
   */
  showHOSViolation(violation: any): string {
    const severity = violation.severity || 'medium';
    const isUrgent = severity === 'critical' || violation.requires_immediate_action;
    
    return this.show({
      id: `hos-violation-${violation.violation_id || violation.id}`,
      title: `HOS Violation Alert - ${severity.toUpperCase()}`,
      message: violation.description || 'Hours of Service violation detected',
      type: isUrgent ? 'error' : 'warning',
      priority: isUrgent ? 'urgent' : 'high',
      category: 'hos_compliance',
      duration: 0, // Persistent until dismissed
      persistent: isUrgent,
      sound: true,
      vibration: true,
      action: {
        label: 'View Details',
        callback: () => {
          window.location.href = '/logs#violations';
        }
      }
    });
  }

  /**
   * Show trip update notification with enhanced features
   */
  showTripUpdate(trip: any): string {
    const statusEmojis = {
      'planned': '📋',
      'in_progress': '🚛',
      'completed': '✅',
      'cancelled': '❌'
    };

    const statusMessages = {
      'planned': 'Trip planned and ready',
      'in_progress': 'Trip is now in progress',
      'completed': 'Trip completed successfully',
      'cancelled': 'Trip has been cancelled'
    };

    const isImportant = trip.status === 'completed' || trip.status === 'cancelled';
    
    return this.show({
      id: `trip-update-${trip.trip_id || trip.id}`,
      title: `Trip Update ${statusEmojis[trip.status as keyof typeof statusEmojis] || '📋'}`,
      message: `${statusMessages[trip.status as keyof typeof statusMessages] || 'Trip status updated'}: "${trip.trip_name}"`,
      type: isImportant ? 'success' : 'info',
      priority: isImportant ? 'high' : 'normal',
      category: 'trip_management',
      action: {
        label: 'View Trip',
        callback: () => {
          window.location.href = '/trips';
        }
      }
    });
  }

  /**
   * Show compliance update
   */
  showComplianceUpdate(update: any): string {
    const message = update.can_drive 
      ? 'You can now drive - HOS compliance restored'
      : 'HOS compliance issue - driving not allowed';
    
    return this.show({
      id: `compliance-update-${Date.now()}`,
      title: 'HOS Status Update',
      message,
      type: update.can_drive ? 'success' : 'warning',
      duration: 5000
    });
  }

  /**
   * Show connection status notification with debouncing (disabled)
   */
  showConnectionStatus(isConnected: boolean): void {
    // Connection status notifications disabled to reduce noise
    return;
  }

  /**
   * Dismiss a notification
   */
  dismiss(id: string): void {
    toast.dismiss(id);
    this.notifications.delete(id);
  }

  /**
   * Dismiss all notifications
   */
  dismissAll(): void {
    toast.dismiss();
    this.notifications.clear();
  }

  /**
   * Get all notifications
   */
  getAll(): NotificationData[] {
    return Array.from(this.notifications.values());
  }

  /**
   * Get notification by ID
   */
  getById(id: string): NotificationData | undefined {
    return this.notifications.get(id);
  }

  /**
   * Clear old notifications
   */
  private cleanupOldNotifications(): void {
    if (this.notifications.size > this.maxNotifications) {
      const entries = Array.from(this.notifications.entries());
      const toRemove = entries.slice(0, entries.length - this.maxNotifications);
      toRemove.forEach(([id]) => {
        this.notifications.delete(id);
        toast.dismiss(id);
      });
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `notification-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Show real-time HOS status update
   */
  showHOSStatusUpdate(hosData: any): string {
    const canDrive = hosData.can_drive;
    const hoursAvailable = hosData.hours_available || 0;
    const isApproachingLimit = hoursAvailable < 2;
    
    return this.show({
      id: `hos-status-${Date.now()}`,
      title: canDrive ? 'HOS Status: Can Drive' : 'HOS Status: Cannot Drive',
      message: canDrive 
        ? `You have ${hoursAvailable.toFixed(1)} hours available for driving`
        : 'You must take a break before driving again',
      type: canDrive ? (isApproachingLimit ? 'warning' : 'success') : 'error',
      priority: isApproachingLimit ? 'high' : 'normal',
      category: 'hos_status',
      duration: isApproachingLimit ? 0 : 5000,
      persistent: isApproachingLimit,
      action: {
        label: 'View HOS Details',
        callback: () => {
          window.location.href = '/logs#hos-status';
        }
      }
    });
  }

  /**
   * Show trip delay alert
   */
  showTripDelayAlert(trip: any, delay: any): string {
    return this.show({
      id: `trip-delay-${trip.trip_id || trip.id}`,
      title: 'Trip Delay Alert',
      message: `Trip "${trip.trip_name}" is delayed by ${delay.duration || 'unknown time'}. Reason: ${delay.reason || 'Traffic conditions'}`,
      type: 'warning',
      priority: 'high',
      category: 'trip_management',
      action: {
        label: 'View Trip',
        callback: () => {
          window.location.href = '/trips';
        }
      }
    });
  }

  /**
   * Show maintenance reminder
   */
  showMaintenanceReminder(vehicle: any): string {
    return this.show({
      id: `maintenance-${vehicle.id}`,
      title: 'Vehicle Maintenance Due',
      message: `Vehicle ${vehicle.unit_number || vehicle.id} requires maintenance: ${vehicle.maintenance_type || 'Scheduled service'}`,
      type: 'warning',
      priority: 'normal',
      category: 'maintenance',
      action: {
        label: 'Schedule Service',
        callback: () => {
          // Navigate to maintenance page or open scheduling modal
          window.location.href = `/vehicles/${vehicle.id}/maintenance`;
        }
      }
    });
  }

  /**
   * Show weather alert
   */
  showWeatherAlert(alert: any): string {
    return this.show({
      id: `weather-${alert.id || Date.now()}`,
      title: `Weather Alert: ${alert.severity || 'Warning'}`,
      message: `${alert.description || 'Weather conditions may affect your route'}. Location: ${alert.location || 'Your current area'}`,
      type: alert.severity === 'severe' ? 'error' : 'warning',
      priority: alert.severity === 'severe' ? 'urgent' : 'high',
      category: 'weather',
      persistent: alert.severity === 'severe',
      action: {
        label: 'View Route',
        callback: () => {
          window.location.href = '/trips';
        }
      }
    });
  }

  /**
   * Load settings from localStorage
   */
  private loadSettings(): void {
    try {
      const savedSettings = localStorage.getItem(this.SETTINGS_KEY);
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        this.soundEnabled = settings.soundEnabled ?? true;
        this.vibrationEnabled = settings.vibrationEnabled ?? true;
        this.browserNotificationsEnabled = settings.browserNotificationsEnabled ?? true;
        this.autoMarkAsRead = settings.autoMarkAsRead ?? false;
        this.showPreview = settings.showPreview ?? true;
        this.quietHoursEnabled = settings.quietHoursEnabled ?? false;
        this.quietHoursStart = settings.quietHoursStart ?? '22:00';
        this.quietHoursEnd = settings.quietHoursEnd ?? '07:00';
        this.priorityFilter = settings.priorityFilter ?? 'all';
        this.maxNotifications = settings.maxNotifications ?? 50;
        this.autoRefresh = settings.autoRefresh ?? true;
        this.refreshInterval = settings.refreshInterval ?? 30000;
      }
    } catch (error) {
      console.warn('Failed to load notification settings:', error);
    }
  }

  /**
   * Save settings to localStorage
   */
  private saveSettings(): void {
    try {
      const settings = {
        soundEnabled: this.soundEnabled,
        vibrationEnabled: this.vibrationEnabled,
        browserNotificationsEnabled: this.browserNotificationsEnabled,
        autoMarkAsRead: this.autoMarkAsRead,
        showPreview: this.showPreview,
        quietHoursEnabled: this.quietHoursEnabled,
        quietHoursStart: this.quietHoursStart,
        quietHoursEnd: this.quietHoursEnd,
        priorityFilter: this.priorityFilter,
        maxNotifications: this.maxNotifications,
        autoRefresh: this.autoRefresh,
        refreshInterval: this.refreshInterval,
      };
      localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.warn('Failed to save notification settings:', error);
    }
  }

  /**
   * Enable/disable sound notifications
   */
  setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    this.saveSettings();
  }

  /**
   * Enable/disable vibration notifications
   */
  setVibrationEnabled(enabled: boolean): void {
    this.vibrationEnabled = enabled;
    this.saveSettings();
  }

  /**
   * Enable/disable browser notifications
   */
  setBrowserNotificationsEnabled(enabled: boolean): void {
    this.browserNotificationsEnabled = enabled;
    this.saveSettings();
    
    if (enabled && this.notificationPermission !== 'granted') {
      this.requestNotificationPermission();
    }
  }

  /**
   * Get notification settings
   */
  getSettings(): {
    soundEnabled: boolean;
    vibrationEnabled: boolean;
    browserNotificationsEnabled: boolean;
    notificationPermission: string;
    autoMarkAsRead: boolean;
    showPreview: boolean;
    quietHoursEnabled: boolean;
    quietHoursStart: string;
    quietHoursEnd: string;
    priorityFilter: 'all' | 'high' | 'urgent';
    maxNotifications: number;
    autoRefresh: boolean;
    refreshInterval: number;
  } {
    return {
      soundEnabled: this.soundEnabled,
      vibrationEnabled: this.vibrationEnabled,
      browserNotificationsEnabled: this.browserNotificationsEnabled,
      notificationPermission: this.notificationPermission,
      autoMarkAsRead: this.autoMarkAsRead,
      showPreview: this.showPreview,
      quietHoursEnabled: this.quietHoursEnabled,
      quietHoursStart: this.quietHoursStart,
      quietHoursEnd: this.quietHoursEnd,
      priorityFilter: this.priorityFilter,
      maxNotifications: this.maxNotifications,
      autoRefresh: this.autoRefresh,
      refreshInterval: this.refreshInterval,
    };
  }

  /**
   * Update notification settings
   */
  updateSettings(newSettings: Partial<{
    soundEnabled: boolean;
    vibrationEnabled: boolean;
    browserNotificationsEnabled: boolean;
    autoMarkAsRead: boolean;
    showPreview: boolean;
    quietHoursEnabled: boolean;
    quietHoursStart: string;
    quietHoursEnd: string;
    priorityFilter: 'all' | 'high' | 'urgent';
    maxNotifications: number;
    autoRefresh: boolean;
    refreshInterval: number;
  }>): void {
    if (newSettings.soundEnabled !== undefined) {
      this.soundEnabled = newSettings.soundEnabled;
    }
    if (newSettings.vibrationEnabled !== undefined) {
      this.vibrationEnabled = newSettings.vibrationEnabled;
    }
    if (newSettings.browserNotificationsEnabled !== undefined) {
      this.browserNotificationsEnabled = newSettings.browserNotificationsEnabled;
    }
    if (newSettings.autoMarkAsRead !== undefined) {
      this.autoMarkAsRead = newSettings.autoMarkAsRead;
    }
    if (newSettings.showPreview !== undefined) {
      this.showPreview = newSettings.showPreview;
    }
    if (newSettings.quietHoursEnabled !== undefined) {
      this.quietHoursEnabled = newSettings.quietHoursEnabled;
    }
    if (newSettings.quietHoursStart !== undefined) {
      this.quietHoursStart = newSettings.quietHoursStart;
    }
    if (newSettings.quietHoursEnd !== undefined) {
      this.quietHoursEnd = newSettings.quietHoursEnd;
    }
    if (newSettings.priorityFilter !== undefined) {
      this.priorityFilter = newSettings.priorityFilter;
    }
    if (newSettings.maxNotifications !== undefined) {
      this.maxNotifications = newSettings.maxNotifications;
      // Clean up old notifications if needed
      this.cleanupOldNotifications();
    }
    if (newSettings.autoRefresh !== undefined) {
      this.autoRefresh = newSettings.autoRefresh;
    }
    if (newSettings.refreshInterval !== undefined) {
      this.refreshInterval = newSettings.refreshInterval;
    }

    this.saveSettings();
  }

  /**
   * Get notifications by category
   */
  getByCategory(category: string): NotificationData[] {
    return Array.from(this.notifications.values())
      .filter(notification => notification.category === category);
  }

  /**
   * Get notifications by priority
   */
  getByPriority(priority: string): NotificationData[] {
    return Array.from(this.notifications.values())
      .filter(notification => notification.priority === priority);
  }

  /**
   * Clear notifications by category
   */
  clearByCategory(category: string): void {
    const toRemove = Array.from(this.notifications.entries())
      .filter(([_, notification]) => notification.category === category);
    
    toRemove.forEach(([id]) => {
      this.dismiss(id);
    });
  }

  /**
   * Get unread notifications
   */
  getUnread(): NotificationData[] {
    return Array.from(this.notifications.values())
      .filter(notification => {
        // For backend notifications, check if they have read status
        if (notification.id?.startsWith('backend-')) {
          return !notification.timestamp || !this.isNotificationRead(notification.id);
        }
        // For local notifications, they're considered unread until dismissed
        return true;
      });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id: string): Promise<void> {
    const notification = this.notifications.get(id);
    if (!notification) return;

    // If it's a backend notification, sync with backend
    if (id.startsWith('backend-')) {
      try {
        const { apiService } = await import('./api');
        const backendId = id.replace('backend-', '');
        await apiService.markNotificationRead(parseInt(backendId));
        
        // Mark as read locally
        this.setNotificationRead(id, true);
      } catch (error) {
        console.warn('Failed to mark notification as read on backend:', error);
      }
    } else {
      // For local notifications, just mark as read
      this.setNotificationRead(id, true);
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    try {
      const { apiService } = await import('./api');
      await apiService.markAllNotificationsRead();
      
      // Mark all local notifications as read
      Array.from(this.notifications.keys()).forEach(id => {
        this.setNotificationRead(id, true);
      });
    } catch (error) {
      console.warn('Failed to mark all notifications as read:', error);
    }
  }

  /**
   * Check if notification is read (local storage)
   */
  private isNotificationRead(id: string): boolean {
    try {
      const readNotifications = JSON.parse(localStorage.getItem('trucklog_read_notifications') || '[]');
      return readNotifications.includes(id);
    } catch {
      return false;
    }
  }

  /**
   * Set notification read status (local storage)
   */
  private setNotificationRead(id: string, isRead: boolean): void {
    try {
      const readNotifications = JSON.parse(localStorage.getItem('trucklog_read_notifications') || '[]');
      if (isRead && !readNotifications.includes(id)) {
        readNotifications.push(id);
      } else if (!isRead) {
        const index = readNotifications.indexOf(id);
        if (index > -1) {
          readNotifications.splice(index, 1);
        }
      }
      localStorage.setItem('trucklog_read_notifications', JSON.stringify(readNotifications));
    } catch (error) {
      console.warn('Failed to update read status:', error);
    }
  }

  /**
   * Sync notification to backend
   */
  private async syncToBackend(notification: NotificationData): Promise<void> {
    try {
      // Import API service dynamically to avoid circular dependencies
      const { apiService } = await import('./api');
      
      const backendData = {
        title: notification.title,
        message: notification.message,
        notification_type: notification.type,
        priority: this.getPriorityNumber(notification.priority || 'normal'),
        data: {
          category: notification.category,
          persistent: notification.persistent,
          sound: notification.sound,
          vibration: notification.vibration
        },
        action_url: notification.action?.label ? '#' : null
      };

      await apiService.createNotification(backendData);
    } catch (error) {
      console.warn('Failed to sync notification to backend:', error);
    }
  }

  /**
   * Load notifications from backend
   */
  async loadFromBackend(): Promise<void> {
    try {
      const { apiService } = await import('./api');
      const backendNotifications = await apiService.getNotifications();
      
      // Convert backend notifications to frontend format
      backendNotifications.forEach((backendNotif: any) => {
        const notificationId = `backend-${backendNotif.id}`;
        const frontendNotif: NotificationData = {
          id: notificationId,
          title: backendNotif.title,
          message: backendNotif.message,
          type: backendNotif.notification_type,
          timestamp: backendNotif.created_at,
          priority: this.getPriorityString(backendNotif.priority),
          category: backendNotif.data?.category || 'general',
          persistent: backendNotif.data?.persistent || false,
          sound: backendNotif.data?.sound !== false,
          vibration: backendNotif.data?.vibration !== false
        };

        this.notifications.set(notificationId, frontendNotif);
      });
    } catch (error) {
      console.warn('Failed to load notifications from backend:', error);
    }
  }

  /**
   * Convert priority string to number for backend
   */
  private getPriorityNumber(priority: string): number {
    switch (priority) {
      case 'urgent': return 3;
      case 'high': return 2;
      case 'normal': return 1;
      case 'low': return 0;
      default: return 1;
    }
  }

  /**
   * Convert priority number to string for frontend
   */
  private getPriorityString(priority: number): 'low' | 'normal' | 'high' | 'urgent' {
    if (priority >= 3) return 'urgent';
    if (priority >= 2) return 'high';
    if (priority >= 1) return 'normal';
    return 'low';
  }

  /**
   * Get default duration based on notification type
   */
  private getDefaultDuration(type: string): number {
    switch (type) {
      case 'error':
        return 0; // Persistent
      case 'warning':
        return 5000;
      case 'success':
        return 3000;
      case 'info':
      default:
        return 4000;
    }
  }
}

// Create singleton instance
const notificationService = new NotificationService();

export default notificationService;
