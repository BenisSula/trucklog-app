/**
 * Custom hook for real-time HOS status updates
 * Manages HOS compliance monitoring and updates
 */

import { useEffect, useState, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';
import { apiService } from '../services/api';

export interface HOSUpdateData {
  can_drive: boolean;
  can_be_on_duty: boolean;
  needs_rest: boolean;
  hours_used: number;
  hours_available: number;
  consecutive_off_duty_hours: number;
  violations_count: number;
  last_30_min_break?: string;
  cycle_progress_percent: number;
  status_color: string;
  status_message: string;
  updated_at: string;
}

export interface UseHOSUpdatesOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableWebSocket?: boolean;
}

export const useHOSUpdates = (options: UseHOSUpdatesOptions = {}) => {
  const {
    autoRefresh = true,
    refreshInterval = 60000, // 1 minute - increased to reduce API calls
    enableWebSocket = true
  } = options;

  const [hosData, setHosData] = useState<HOSUpdateData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const { 
    isConnected, 
    subscribeToHOS
  } = useWebSocket({
    autoConnect: enableWebSocket,
    channels: enableWebSocket ? ['hos_updates'] : []
  });

  /**
   * Fetch HOS status from API
   */
  const fetchHOSStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const rawData = await apiService.getHOSStatus();
      
      // Transform API response to HOSUpdateData format
      const data: HOSUpdateData = {
        can_drive: rawData.can_drive ?? false,
        can_be_on_duty: rawData.can_be_on_duty ?? false,
        needs_rest: rawData.needs_rest ?? false,
        hours_used: rawData.hours_used ?? 0,
        hours_available: rawData.hours_available ?? 0,
        consecutive_off_duty_hours: rawData.consecutive_off_duty_hours ?? 0,
        violations_count: rawData.violations_count ?? 0,
        last_30_min_break: rawData.last_30_min_break,
        cycle_progress_percent: rawData.cycle_progress_percent ?? 0,
        status_color: rawData.status_color ?? 'gray',
        status_message: rawData.status_message ?? 'Unknown',
        updated_at: rawData.last_updated ?? new Date().toISOString()
      };
      
      setHosData(data);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error('Error fetching HOS status:', err);
      setError(err.message || 'Failed to fetch HOS status');
      
      // Provide fallback data instead of staying in loading state
      const fallbackData: HOSUpdateData = {
        can_drive: true,
        can_be_on_duty: true,
        needs_rest: false,
        hours_used: 0,
        hours_available: 11,
        consecutive_off_duty_hours: 10,
        violations_count: 0,
        last_30_min_break: undefined,
        cycle_progress_percent: 0,
        status_color: 'green',
        status_message: 'Ready to Drive',
        updated_at: new Date().toISOString()
      };
      
      setHosData(fallbackData);
      setLastUpdated(new Date());
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Handle HOS update from WebSocket
   */
  const handleHOSUpdate = useCallback((event: CustomEvent) => {
    const updateData = event.detail;
    setHosData(prev => ({
      ...prev,
      ...updateData,
      updated_at: new Date().toISOString()
    }));
    setLastUpdated(new Date());
  }, []);

  /**
   * Handle compliance update
   */
  const handleComplianceUpdate = useCallback((event: CustomEvent) => {
    const updateData = event.detail;
    setHosData(prev => prev ? {
      ...prev,
      can_drive: updateData.can_drive,
      can_be_on_duty: updateData.can_be_on_duty,
      needs_rest: updateData.needs_rest,
      hours_used: updateData.hours_used,
      hours_available: updateData.hours_available,
      violations_count: updateData.violations_count,
      updated_at: new Date().toISOString()
    } : null);
    setLastUpdated(new Date());
  }, []);

  // Subscribe to HOS updates via WebSocket
  useEffect(() => {
    if (enableWebSocket && isConnected) {
      subscribeToHOS();
      
      // Listen for HOS updates
      window.addEventListener('hosStatusUpdate', handleHOSUpdate as EventListener);
      window.addEventListener('complianceUpdate', handleComplianceUpdate as EventListener);

      return () => {
        window.removeEventListener('hosStatusUpdate', handleHOSUpdate as EventListener);
        window.removeEventListener('complianceUpdate', handleComplianceUpdate as EventListener);
      };
    }
  }, [enableWebSocket, isConnected, subscribeToHOS, handleHOSUpdate, handleComplianceUpdate]);

  // Initial fetch
  useEffect(() => {
    fetchHOSStatus();
  }, [fetchHOSStatus]);

  // Auto-refresh with rate limiting protection
  useEffect(() => {
    if (!autoRefresh) return;

    let lastFetchTime = 0;
    const minInterval = 30000; // Minimum 30 seconds between API calls

    const interval = setInterval(() => {
      if (!isConnected) {
        const now = Date.now();
        if (now - lastFetchTime >= minInterval) {
          lastFetchTime = now;
          fetchHOSStatus();
        }
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, isConnected, fetchHOSStatus]);

  /**
   * Get HOS status summary
   */
  const getStatusSummary = useCallback(() => {
    if (!hosData) return null;

    return {
      status: hosData.status_message,
      color: hosData.status_color,
      canDrive: hosData.can_drive,
      needsRest: hosData.needs_rest,
      hoursUsed: hosData.hours_used,
      hoursAvailable: hosData.hours_available,
      violationsCount: hosData.violations_count,
      cycleProgress: hosData.cycle_progress_percent,
      lastBreak: hosData.last_30_min_break,
      consecutiveOffDuty: hosData.consecutive_off_duty_hours,
    };
  }, [hosData]);

  /**
   * Check if driver is approaching limits
   */
  const isApproachingLimits = useCallback(() => {
    if (!hosData) return false;

    return (
      hosData.cycle_progress_percent > 80 ||
      hosData.hours_used > 10 ||
      hosData.consecutive_off_duty_hours < 2
    );
  }, [hosData]);

  /**
   * Get time until next required break
   */
  const getTimeUntilBreak = useCallback(() => {
    if (!hosData || !hosData.last_30_min_break) return null;

    const lastBreak = new Date(hosData.last_30_min_break);
    const now = new Date();
    const timeSinceBreak = now.getTime() - lastBreak.getTime();
    const hoursSinceBreak = timeSinceBreak / (1000 * 60 * 60);

    if (hoursSinceBreak >= 8) {
      return 0; // Break needed now
    }

    return 8 - hoursSinceBreak; // Hours until break needed
  }, [hosData]);

  return {
    // Data
    hosData,
    isLoading,
    error,
    lastUpdated,
    isConnected,

    // Actions
    refresh: fetchHOSStatus,

    // Computed values
    statusSummary: getStatusSummary(),
    isApproachingLimits: isApproachingLimits(),
    timeUntilBreak: getTimeUntilBreak(),

    // Status checks
    canDrive: hosData?.can_drive ?? false,
    needsRest: hosData?.needs_rest ?? false,
    hasViolations: (hosData?.violations_count ?? 0) > 0,
  };
};

export default useHOSUpdates;
