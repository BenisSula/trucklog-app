/**
 * Enhanced Real-time Trip Updates Hook
 * Provides comprehensive trip monitoring with real-time updates and alerts
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from './useWebSocket';
import { apiService, Trip } from '../services/api';
import notificationService from '../services/notification';

export interface TripUpdate {
  trip_id: number;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  trip_name: string;
  current_location?: string;
  progress_percentage?: number;
  estimated_arrival?: string;
  delays?: TripDelay[];
  timestamp: string;
}

export interface TripDelay {
  id: string;
  duration: number; // minutes
  reason: string;
  location?: string;
  timestamp: string;
}

export interface TripAlert {
  id: string;
  trip_id: number;
  type: 'delay' | 'weather' | 'traffic' | 'maintenance' | 'route_change';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  requires_action: boolean;
}

export interface UseRealTimeTripsOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableWebSocket?: boolean;
  enableNotifications?: boolean;
  activeTripsOnly?: boolean;
  enableDelayAlerts?: boolean;
  enableWeatherAlerts?: boolean;
  delayThreshold?: number; // minutes before showing delay alerts
}

export const useRealTimeTrips = (options: UseRealTimeTripsOptions = {}) => {
  const {
    autoRefresh = true,
    refreshInterval = 60000, // 1 minute
    enableWebSocket = true,
    enableNotifications = true,
    activeTripsOnly = false,
    enableDelayAlerts = true,
    enableWeatherAlerts = true,
    delayThreshold = 15 // 15 minutes
  } = options;

  const { isConnected, subscribeToTrip, unsubscribeFromTrip } = useWebSocket();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeTrips, setActiveTrips] = useState<Trip[]>([]);
  const [tripUpdates, setTripUpdates] = useState<TripUpdate[]>([]);
  const [tripAlerts, setTripAlerts] = useState<TripAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastNotificationTimeRef = useRef<number>(0);
  const subscribedTripsRef = useRef<Set<number>>(new Set());

  /**
   * Fetch trips from API
   */
  const fetchTrips = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setError(null);

    try {
      const tripsData = await apiService.getTrips();
      setTrips(tripsData);
      setLastUpdated(new Date());

      // Filter active trips
      const active = tripsData.filter(trip => trip.status === 'in_progress');
      setActiveTrips(active);

      // Subscribe to active trips for real-time updates
      if (enableWebSocket && isConnected) {
        active.forEach(trip => {
          if (!subscribedTripsRef.current.has(trip.id)) {
            subscribeToTrip(trip.id);
            subscribedTripsRef.current.add(trip.id);
          }
        });

        // Unsubscribe from completed trips
        const completedTripIds = tripsData
          .filter(trip => trip.status === 'completed' || trip.status === 'cancelled')
          .map(trip => trip.id);
        
        completedTripIds.forEach(tripId => {
          if (subscribedTripsRef.current.has(tripId)) {
            unsubscribeFromTrip(tripId);
            subscribedTripsRef.current.delete(tripId);
          }
        });
      }

    } catch (err: any) {
      console.error('Error fetching trips:', err);
      setError(err.message || 'Failed to fetch trips');
    } finally {
      setIsLoading(false);
    }
  }, [enableWebSocket, isConnected, subscribeToTrip, unsubscribeFromTrip]);

  /**
   * Handle trip update notifications
   */
  const handleTripUpdateNotification = useCallback((tripUpdate: TripUpdate) => {
    const now = Date.now();
    const timeSinceLastNotification = now - lastNotificationTimeRef.current;

    // Throttle notifications to avoid spam
    if (timeSinceLastNotification < 5000) return; // 5 seconds minimum between notifications

    if (enableNotifications) {
      // Show trip status update
      notificationService.showTripUpdate(tripUpdate);

      // Show delay alert if applicable
      if (enableDelayAlerts && tripUpdate.delays && tripUpdate.delays.length > 0) {
        const significantDelays = tripUpdate.delays.filter(delay => delay.duration >= delayThreshold);
        significantDelays.forEach(delay => {
          const trip = trips.find(t => t.id === tripUpdate.trip_id);
          if (trip) {
            notificationService.showTripDelayAlert(trip, delay);
          }
        });
      }

      lastNotificationTimeRef.current = now;
    }
  }, [enableNotifications, enableDelayAlerts, delayThreshold, trips]);

  /**
   * Handle trip alert notifications
   */
  const handleTripAlertNotification = useCallback((alert: TripAlert) => {
    if (enableNotifications) {
      notificationService.show({
        id: `trip-alert-${alert.id}`,
        title: alert.title,
        message: alert.message,
        type: alert.severity === 'critical' ? 'error' : 
               alert.severity === 'high' ? 'warning' : 'info',
        priority: alert.severity === 'critical' ? 'urgent' : 
                 alert.severity === 'high' ? 'high' : 'normal',
        category: 'trip_management',
        persistent: alert.requires_action,
        action: alert.requires_action ? {
          label: 'View Trip',
          callback: () => {
            window.location.href = `/trips#trip-${alert.trip_id}`;
          }
        } : undefined
      });
    }
  }, [enableNotifications]);

  /**
   * Start auto-refresh
   */
  const startAutoRefresh = useCallback(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }

    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        fetchTrips(false);
      }, refreshInterval);
    }
  }, [autoRefresh, refreshInterval, fetchTrips]);

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
   * Handle WebSocket trip updates
   */
  const handleWebSocketTripUpdate = useCallback((event: CustomEvent) => {
    const tripUpdate = event.detail;
    
    // Update trip in state
    setTrips(prev => prev.map(trip => 
      trip.id === tripUpdate.trip_id 
        ? { ...trip, status: tripUpdate.status }
        : trip
    ));

    // Update active trips
    setActiveTrips(prev => {
      if (tripUpdate.status === 'in_progress') {
        const existingTrip = prev.find(t => t.id === tripUpdate.trip_id);
        if (!existingTrip) {
          const trip = trips.find(t => t.id === tripUpdate.trip_id);
          if (trip) {
            return [...prev, { ...trip, status: tripUpdate.status }];
          }
        }
      } else {
        return prev.filter(t => t.id !== tripUpdate.trip_id);
      }
      return prev;
    });

    // Store trip update
    setTripUpdates(prev => [tripUpdate, ...prev.slice(0, 49)]); // Keep last 50 updates

    // Handle notifications
    handleTripUpdateNotification(tripUpdate);
  }, [trips, handleTripUpdateNotification]);

  /**
   * Handle WebSocket trip alerts
   */
  const handleWebSocketTripAlert = useCallback((event: CustomEvent) => {
    const alert = event.detail;
    setTripAlerts(prev => [alert, ...prev.slice(0, 49)]); // Keep last 50 alerts
    handleTripAlertNotification(alert);
  }, [handleTripAlertNotification]);

  // Subscribe to WebSocket channels
  useEffect(() => {
    if (enableWebSocket && isConnected) {
      // Subscribe to general trip updates
      // Individual trip subscriptions are handled in fetchTrips
    }
  }, [enableWebSocket, isConnected]);

  // Set up WebSocket event listeners
  useEffect(() => {
    if (enableWebSocket) {
      window.addEventListener('tripUpdate', handleWebSocketTripUpdate as EventListener);
      window.addEventListener('tripAlert', handleWebSocketTripAlert as EventListener);

      return () => {
        window.removeEventListener('tripUpdate', handleWebSocketTripUpdate as EventListener);
        window.removeEventListener('tripAlert', handleWebSocketTripAlert as EventListener);
      };
    }
  }, [enableWebSocket, handleWebSocketTripUpdate, handleWebSocketTripAlert]);

  // Start auto-refresh
  useEffect(() => {
    startAutoRefresh();
    return stopAutoRefresh;
  }, [startAutoRefresh, stopAutoRefresh]);

  // Initial fetch
  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  // Computed values
  const upcomingTrips = trips.filter(trip => 
    trip.status === 'planned' && 
    new Date(trip.planned_start_time) > new Date()
  );

  const completedTrips = trips.filter(trip => trip.status === 'completed');
  const cancelledTrips = trips.filter(trip => trip.status === 'cancelled');

  const overdueTrips = activeTrips.filter(trip => {
    const now = new Date();
    const plannedEnd = new Date(trip.planned_end_time);
    return now > plannedEnd;
  });

  const tripStats = {
    total: trips.length,
    active: activeTrips.length,
    upcoming: upcomingTrips.length,
    completed: completedTrips.length,
    cancelled: cancelledTrips.length,
    overdue: overdueTrips.length,
    completionRate: trips.length > 0 ? (completedTrips.length / trips.length) * 100 : 0
  };

  const recentUpdates = tripUpdates.slice(0, 10);
  const recentAlerts = tripAlerts.slice(0, 10);
  const criticalAlerts = tripAlerts.filter(alert => alert.severity === 'critical');

  return {
    // Data
    trips: activeTripsOnly ? activeTrips : trips,
    activeTrips,
    upcomingTrips,
    completedTrips,
    cancelledTrips,
    overdueTrips,
    tripUpdates: recentUpdates,
    tripAlerts: recentAlerts,
    criticalAlerts,
    isLoading,
    error,
    lastUpdated,
    isConnected,

    // Computed values
    tripStats,
    hasOverdueTrips: overdueTrips.length > 0,
    hasCriticalAlerts: criticalAlerts.length > 0,

    // Actions
    refresh: () => fetchTrips(),
    startAutoRefresh,
    stopAutoRefresh,
    subscribeToTrip: (tripId: number) => {
      subscribeToTrip(tripId);
      subscribedTripsRef.current.add(tripId);
    },
    unsubscribeFromTrip: (tripId: number) => {
      unsubscribeFromTrip(tripId);
      subscribedTripsRef.current.delete(tripId);
    },

    // Settings
    settings: {
      autoRefresh,
      refreshInterval,
      enableWebSocket,
      enableNotifications,
      activeTripsOnly,
      enableDelayAlerts,
      enableWeatherAlerts,
      delayThreshold
    }
  };
};

export default useRealTimeTrips;
