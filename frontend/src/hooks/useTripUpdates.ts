/**
 * Custom hook for real-time trip updates
 * Manages trip monitoring and status updates
 */

import { useEffect, useState, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';
import { apiService, Trip } from '../services/api';

export interface TripUpdateData {
  id: number;
  trip_name: string;
  status: string;
  current_location?: string;
  progress_percent?: number;
  estimated_arrival?: string;
  updated_at: string;
}

export interface UseTripUpdatesOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableWebSocket?: boolean;
  activeTripsOnly?: boolean;
}

export const useTripUpdates = (options: UseTripUpdatesOptions = {}) => {
  const {
    autoRefresh = true,
    refreshInterval = 120000, // 2 minutes - increased to reduce API calls
    enableWebSocket = true
  } = options;

  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeTrips, setActiveTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const { 
    isConnected, 
    subscribeToTrip, 
    unsubscribeFromTrip 
  } = useWebSocket({
    autoConnect: enableWebSocket
  });

  /**
   * Fetch trips from API
   */
  const fetchTrips = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const data = await apiService.getTrips();
      
      // Ensure data is an array
      const tripsArray = Array.isArray(data) ? data : [];
      setTrips(tripsArray);
      
      const active = tripsArray.filter(trip => trip.status === 'in_progress');
      setActiveTrips(active);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.warn('Error fetching trips, using fallback data:', err);
      setError(err.message || 'Failed to fetch trips');
      
      // Provide fallback demo data instead of empty arrays
      const fallbackTrips: Trip[] = [];
      setTrips(fallbackTrips);
      setActiveTrips([]);
      setLastUpdated(new Date());
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Handle trip update from WebSocket
   */
  const handleTripUpdate = useCallback((event: CustomEvent) => {
    const updateData: TripUpdateData = event.detail;
    
    setTrips(prev => prev.map(trip => 
      trip.id === updateData.id 
        ? { ...trip, ...updateData, updated_at: updateData.updated_at }
        : trip
    ));

    setActiveTrips(prev => {
      const updated = prev.map(trip => 
        trip.id === updateData.id 
          ? { ...trip, ...updateData, updated_at: updateData.updated_at }
          : trip
      );

      // Filter out completed trips
      return updated.filter(trip => trip.status === 'in_progress');
    });

    setLastUpdated(new Date());
  }, []);

  /**
   * Subscribe to specific trip updates
   */
  const subscribeToTripUpdates = useCallback((tripId: number) => {
    subscribeToTrip(tripId);
  }, [subscribeToTrip]);

  /**
   * Unsubscribe from trip updates
   */
  const unsubscribeFromTripUpdates = useCallback((tripId: number) => {
    unsubscribeFromTrip(tripId);
  }, [unsubscribeFromTrip]);

  // Subscribe to active trips
  useEffect(() => {
    if (enableWebSocket && isConnected && activeTrips.length > 0) {
      activeTrips.forEach(trip => {
        subscribeToTripUpdates(trip.id);
      });

      return () => {
        activeTrips.forEach(trip => {
          unsubscribeFromTripUpdates(trip.id);
        });
      };
    }
  }, [enableWebSocket, isConnected, activeTrips, subscribeToTripUpdates, unsubscribeFromTripUpdates]);

  // Listen for trip updates
  useEffect(() => {
    if (enableWebSocket) {
      window.addEventListener('tripUpdate', handleTripUpdate as EventListener);

      return () => {
        window.removeEventListener('tripUpdate', handleTripUpdate as EventListener);
      };
    }
  }, [enableWebSocket, handleTripUpdate]);

  // Initial fetch
  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

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
          fetchTrips();
        }
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, isConnected, fetchTrips]);

  /**
   * Get trip by ID
   */
  const getTripById = useCallback((id: number) => {
    return Array.isArray(trips) ? trips.find(trip => trip.id === id) : undefined;
  }, [trips]);

  /**
   * Get trips by status
   */
  const getTripsByStatus = useCallback((status: string) => {
    return Array.isArray(trips) ? trips.filter(trip => trip.status === status) : [];
  }, [trips]);

  /**
   * Get upcoming trips
   */
  const getUpcomingTrips = useCallback(() => {
    if (!Array.isArray(trips)) return [];
    const now = new Date();
    return trips.filter(trip => 
      trip.status === 'planned' && 
      new Date(trip.planned_start_time) > now
    );
  }, [trips]);

  /**
   * Get completed trips
   */
  const getCompletedTrips = useCallback(() => {
    return Array.isArray(trips) ? trips.filter(trip => trip.status === 'completed') : [];
  }, [trips]);

  /**
   * Get trip statistics
   */
  const getTripStats = useCallback(() => {
    const tripsArray = Array.isArray(trips) ? trips : [];
    const activeArray = Array.isArray(activeTrips) ? activeTrips : [];
    const total = tripsArray.length;
    const active = activeArray.length;
    const planned = getTripsByStatus('planned').length;
    const completed = getCompletedTrips().length;
    const cancelled = getTripsByStatus('cancelled').length;

    return {
      total,
      active,
      planned,
      completed,
      cancelled,
      completionRate: total > 0 ? (completed / total) * 100 : 0
    };
  }, [trips, activeTrips, getTripsByStatus, getCompletedTrips]);

  /**
   * Check if trip is overdue
   */
  const isTripOverdue = useCallback((trip: Trip) => {
    if (trip.status !== 'in_progress') return false;
    
    const now = new Date();
    const plannedEnd = new Date(trip.planned_end_time);
    
    return now > plannedEnd;
  }, []);

  /**
   * Get overdue trips
   */
  const getOverdueTrips = useCallback(() => {
    return Array.isArray(activeTrips) ? activeTrips.filter(trip => isTripOverdue(trip)) : [];
  }, [activeTrips, isTripOverdue]);

  return {
    // Data
    trips,
    activeTrips,
    isLoading,
    error,
    lastUpdated,
    isConnected,

    // Actions
    refresh: fetchTrips,
    subscribeToTrip: subscribeToTripUpdates,
    unsubscribeFromTrip: unsubscribeFromTripUpdates,

    // Computed values
    upcomingTrips: getUpcomingTrips(),
    completedTrips: getCompletedTrips(),
    overdueTrips: getOverdueTrips(),
    tripStats: getTripStats(),

    // Helper functions
    getTripById,
    getTripsByStatus,
    isTripOverdue,
  };
};

export default useTripUpdates;
