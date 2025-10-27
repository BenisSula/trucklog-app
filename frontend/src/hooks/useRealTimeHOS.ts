/**
 * Enhanced Real-time HOS Hook
 * Provides comprehensive HOS monitoring with real-time updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from './useWebSocket';
import notificationService from '../services/notification';

// Import HOSStatus from API service to avoid conflicts
import { apiService, Violation, HOSStatus } from '../services/api';

export interface HOSViolation {
  violation_id: string;
  driver_id: number;
  violation_type: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  occurred_at: string;
  requires_immediate_action: boolean;
  resolution_required: boolean;
}

export interface UseRealTimeHOSOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableWebSocket?: boolean;
  enableNotifications?: boolean;
  violationThreshold?: number; // Hours remaining before showing warnings
}

export const useRealTimeHOS = (options: UseRealTimeHOSOptions = {}) => {
  const {
    autoRefresh = true,
    refreshInterval = 30000, // 30 seconds
    enableWebSocket = true,
    enableNotifications = true,
    violationThreshold = 2 // 2 hours
  } = options;

  const { isConnected, subscribeToHOS } = useWebSocket();
  const [hosStatus, setHosStatus] = useState<HOSStatus | null>(null);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isApproachingLimit, setIsApproachingLimit] = useState(false);
  const [timeUntilBreak, setTimeUntilBreak] = useState<number | null>(null);

  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastNotificationTimeRef = useRef<number>(0);

  /**
   * Handle HOS-related notifications
   */
  const handleHOSNotifications = useCallback((hosData: HOSStatus, violationsData: Violation[]) => {
    const now = Date.now();
    const timeSinceLastNotification = now - lastNotificationTimeRef.current;

    // Throttle notifications to avoid spam
    if (timeSinceLastNotification < 10000) return; // 10 seconds minimum between notifications

    // Check for new violations
    const newViolations = violationsData.filter(violation => {
      const violationTime = new Date(violation.occurred_at).getTime();
      return violationTime > (lastNotificationTimeRef.current - 60000); // Last minute
    });

    if (newViolations.length > 0) {
      newViolations.forEach(violation => {
        // Convert API Violation to HOSViolation format for notification
        const hosViolation = {
          violation_id: violation.id.toString(),
          driver_id: violation.driver,
          violation_type: violation.violation_type,
          description: violation.description,
          severity: violation.severity as 'low' | 'medium' | 'high' | 'critical',
          occurred_at: violation.occurred_at,
          requires_immediate_action: violation.severity === 'critical',
          resolution_required: !violation.is_resolved
        };
        notificationService.showHOSViolation(hosViolation);
      });
      lastNotificationTimeRef.current = now;
    }

    // Check for HOS status changes
    if (hosData.can_drive !== hosStatus?.can_drive) {
      notificationService.showHOSStatusUpdate(hosData);
      lastNotificationTimeRef.current = now;
    }

    // Check for approaching limit
    const hoursAvailable = hosData.hours_available || 0;
    if (hoursAvailable <= violationThreshold && hoursAvailable > 0) {
      notificationService.show({
        id: `hos-approaching-limit-${now}`,
        title: 'HOS Warning: Approaching Limit',
        message: `You have ${hoursAvailable.toFixed(1)} hours remaining. Consider planning your next break.`,
        type: 'warning',
        priority: 'high',
        category: 'hos_compliance',
        duration: 0,
        persistent: true,
        action: {
          label: 'Plan Break',
          callback: () => {
            window.location.href = '/trips#plan-break';
          }
        }
      });
      lastNotificationTimeRef.current = now;
    }
  }, [hosStatus, violationThreshold]);

  /**
   * Fetch HOS status from API
   */
  const fetchHOSStatus = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setError(null);

    try {
      const [hosData, violationsData] = await Promise.all([
        apiService.getHOSStatus(),
        apiService.getViolations()
      ]);

      setHosStatus(hosData);
      setViolations(violationsData);
      setLastUpdated(new Date());

      // Check if approaching limit
      const hoursAvailable = hosData.hours_available || 0;
      const approaching = hoursAvailable <= violationThreshold && hoursAvailable > 0;
      setIsApproachingLimit(approaching);

      // Calculate time until break
      if (hosData.time_until_break_needed) {
        setTimeUntilBreak(hosData.time_until_break_needed);
      }

      // Show notifications for important changes
      if (enableNotifications) {
        handleHOSNotifications(hosData, violationsData);
      }

    } catch (err: any) {
      console.error('Error fetching HOS status:', err);
      setError(err.message || 'Failed to fetch HOS status');
    } finally {
      setIsLoading(false);
    }
  }, [violationThreshold, enableNotifications, handleHOSNotifications]);

  /**
   * Start auto-refresh
   */
  const startAutoRefresh = useCallback(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }

    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        fetchHOSStatus(false);
      }, refreshInterval);
    }
  }, [autoRefresh, refreshInterval, fetchHOSStatus]);

  /**
   * Stop auto-refresh
   */
  const stopAutoRefresh = useCallback(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
  }, []);

  /**
   * Handle WebSocket HOS updates
   */
  const handleWebSocketHOSUpdate = useCallback((event: CustomEvent) => {
    const hosData = event.detail;
    setHosStatus(hosData);
    setLastUpdated(new Date());

    // Update approaching limit status
    const hoursAvailable = hosData.hours_available || 0;
    const approaching = hoursAvailable <= violationThreshold && hoursAvailable > 0;
    setIsApproachingLimit(approaching);

    // Update time until break
    if (hosData.time_until_break_needed) {
      setTimeUntilBreak(hosData.time_until_break_needed);
    }

    // Show notifications
    if (enableNotifications) {
      handleHOSNotifications(hosData, violations);
    }
  }, [violationThreshold, enableNotifications, handleHOSNotifications, violations]);

  /**
   * Handle WebSocket violation alerts
   */
  const handleWebSocketViolationAlert = useCallback((event: CustomEvent) => {
    const violation = event.detail;
    setViolations(prev => [violation, ...prev]);

    if (enableNotifications) {
      notificationService.showHOSViolation(violation);
    }
  }, [enableNotifications]);

  // Subscribe to WebSocket channels
  useEffect(() => {
    if (enableWebSocket && isConnected) {
      subscribeToHOS();
    }
  }, [enableWebSocket, isConnected, subscribeToHOS]);

  // Set up WebSocket event listeners
  useEffect(() => {
    if (enableWebSocket) {
      window.addEventListener('hosStatusUpdate', handleWebSocketHOSUpdate as EventListener);
      window.addEventListener('violationAlert', handleWebSocketViolationAlert as EventListener);

      return () => {
        window.removeEventListener('hosStatusUpdate', handleWebSocketHOSUpdate as EventListener);
        window.removeEventListener('violationAlert', handleWebSocketViolationAlert as EventListener);
      };
    }
  }, [enableWebSocket, handleWebSocketHOSUpdate, handleWebSocketViolationAlert]);

  // Start auto-refresh
  useEffect(() => {
    startAutoRefresh();
    return stopAutoRefresh;
  }, [startAutoRefresh, stopAutoRefresh]);

  // Initial fetch
  useEffect(() => {
    fetchHOSStatus();
  }, [fetchHOSStatus]);

  // Computed values
  const canDrive = hosStatus?.can_drive || false;
  const hoursAvailable = hosStatus?.hours_available || 0;
  const hoursUsed = hosStatus?.hours_used || 0;
  const hasViolations = violations.length > 0;
  const criticalViolations = violations.filter(v => v.severity === 'critical');
  const hasCriticalViolations = criticalViolations.length > 0;

  const statusSummary = {
    canDrive,
    hoursAvailable,
    hoursUsed,
    isApproachingLimit,
    timeUntilBreak,
    hasViolations,
    hasCriticalViolations,
    violationCount: violations.length,
    criticalViolationCount: criticalViolations.length,
    lastUpdated,
    isConnected
  };

  return {
    // Data
    hosStatus,
    violations,
    isLoading,
    error,
    lastUpdated,
    isConnected,

    // Computed values
    canDrive,
    hoursAvailable,
    hoursUsed,
    isApproachingLimit,
    timeUntilBreak,
    hasViolations,
    hasCriticalViolations,
    criticalViolations,
    statusSummary,

    // Actions
    refresh: () => fetchHOSStatus(),
    startAutoRefresh,
    stopAutoRefresh,

    // Settings
    settings: {
      autoRefresh,
      refreshInterval,
      enableWebSocket,
      enableNotifications,
      violationThreshold
    }
  };
};

export default useRealTimeHOS;
