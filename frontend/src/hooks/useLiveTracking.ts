import { useState, useEffect, useCallback } from 'react';
import { RoutePoint, FuelData, mapService } from '../services/mapService';
import { Trip } from '../services/api';
import { useWebSocket } from '../contexts/WebSocketContext';

interface UseLiveTrackingProps {
  selectedTrip: Trip | null;
  autoStart?: boolean;
}

interface LiveTrackingState {
  currentLocation: RoutePoint | null;
  routePoints: RoutePoint[];
  fuelData: FuelData;
  isTracking: boolean;
  lastUpdate: Date | null;
  estimatedArrival: string;
  distanceRemaining: number;
  averageSpeed: number;
  totalDistance: number;
}

export const useLiveTracking = ({ selectedTrip, autoStart = false }: UseLiveTrackingProps) => {
  const [state, setState] = useState<LiveTrackingState>({
    currentLocation: null,
    routePoints: [],
    fuelData: mapService.getFuelData(),
    isTracking: false,
    lastUpdate: null,
    estimatedArrival: '',
    distanceRemaining: 0,
    averageSpeed: 0,
    totalDistance: 0,
  });

  const { isConnected, subscribe, unsubscribe } = useWebSocket();

  // Handle location updates
  const handleLocationUpdate = useCallback((location: RoutePoint) => {
    setState(prev => {
      const newRoutePoints = mapService.getRoutePoints();
      const newFuelData = mapService.getFuelData();
      
      // Calculate metrics
      let totalDistance = 0;
      let totalSpeed = 0;
      let validSpeedCount = 0;

      for (let i = 1; i < newRoutePoints.length; i++) {
        const distance = mapService.calculateDistance(newRoutePoints[i-1], newRoutePoints[i]);
        totalDistance += distance;
        
        if (newRoutePoints[i].speed && newRoutePoints[i].speed! > 0) {
          totalSpeed += newRoutePoints[i].speed!;
          validSpeedCount++;
        }
      }

      const averageSpeed = validSpeedCount > 0 ? Math.round((totalSpeed / validSpeedCount) * 100) / 100 : 0;

      // Calculate ETA and distance remaining
      let estimatedArrival = '';
      let distanceRemaining = 0;

      if (selectedTrip && location) {
        // Mock destination (in real app, get from trip data)
        const destination = {
          latitude: 40.7589,
          longitude: -73.9851,
          timestamp: new Date().toISOString()
        };

        const eta = mapService.calculateETA(destination, location, location.speed || 50);
        estimatedArrival = eta.toISOString();
        distanceRemaining = Math.round(mapService.calculateDistance(location, destination) * 100) / 100;
      }

      return {
        ...prev,
        currentLocation: location,
        routePoints: newRoutePoints,
        fuelData: newFuelData,
        lastUpdate: new Date(),
        estimatedArrival,
        distanceRemaining,
        averageSpeed,
        totalDistance: Math.round(totalDistance * 100) / 100,
      };
    });
  }, [selectedTrip]);

  // Start tracking
  const startTracking = useCallback(async () => {
    if (!selectedTrip) return;

    try {
      setState(prev => ({ ...prev, isTracking: true }));
      
      // Subscribe to WebSocket updates
      if (isConnected) {
        subscribe(`trip_${selectedTrip.id}_location`);
      }

      // Start GPS/simulated tracking
      await mapService.startTracking(handleLocationUpdate);
      
    } catch (error) {
      console.error('Error starting tracking:', error);
      setState(prev => ({ ...prev, isTracking: false }));
    }
  }, [selectedTrip, isConnected, subscribe, handleLocationUpdate]);

  // Stop tracking
  const stopTracking = useCallback(() => {
    setState(prev => ({ ...prev, isTracking: false, currentLocation: null }));
    mapService.stopTracking();
    mapService.clearRoute();
    
    if (selectedTrip && isConnected) {
      unsubscribe(`trip_${selectedTrip.id}_location`);
    }
  }, [selectedTrip, isConnected, unsubscribe]);

  // Auto-start tracking if enabled
  useEffect(() => {
    if (autoStart && selectedTrip && !state.isTracking) {
      startTracking();
    }
  }, [autoStart, selectedTrip, state.isTracking, startTracking]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (state.isTracking) {
        mapService.stopTracking();
      }
    };
  }, [state.isTracking]);

  return {
    ...state,
    startTracking,
    stopTracking,
    isConnected,
  };
};