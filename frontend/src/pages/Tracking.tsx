import React, { useState, useEffect, useCallback } from 'react';
import {
  Navigation,
  MapPin,
  Clock,
  Truck,
  Route as RouteIcon,
  RefreshCw,
  AlertTriangle,
  Play,
  Square,
  Zap,
  Fuel,
  Download,
} from 'lucide-react';
import { apiService, Trip } from '../services/api';
import { CARD_STYLES, ICON_STYLES, BUTTON_STYLES } from '../config/theme';
import LiveMap from '../components/LiveMap';
import FuelMonitor from '../components/FuelMonitor';
import { mapService } from '../services/mapService';
import { useLiveTracking } from '../hooks/useLiveTracking';
import toast from 'react-hot-toast';



const Tracking: React.FC = () => {
  const [activeTrips, setActiveTrips] = useState<Trip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use the live tracking hook
  const {
    currentLocation,
    routePoints,
    fuelData,
    isTracking,
    lastUpdate,
    estimatedArrival,
    distanceRemaining,
    averageSpeed,
    totalDistance,
    startTracking,
    stopTracking,
    isConnected,
  } = useLiveTracking({ selectedTrip });

  useEffect(() => {
    fetchActiveTrips();
  }, [fetchActiveTrips]);

  const fetchActiveTrips = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const trips = await apiService.getTrips();
      const active = trips.filter(trip => trip.status === 'in_progress');
      setActiveTrips(active);
      
      if (active.length > 0 && !selectedTrip) {
        setSelectedTrip(active[0]);
      }
    } catch (error: any) {
      console.error('Error fetching active trips:', error);
      setError('Failed to load active trips');
      toast.error('Failed to load active trips');
    } finally {
      setIsLoading(false);
    }
  }, [selectedTrip]);

  const handleStartTracking = async () => {
    if (!selectedTrip) return;
    
    try {
      await startTracking();
      toast.success('🗺️ Location tracking started');
    } catch (error) {
      console.error('Error starting tracking:', error);
      toast.error('Failed to start GPS tracking, using simulated data');
    }
  };

  const handleStopTracking = () => {
    stopTracking();
    toast.success('📍 Location tracking stopped');
  };

  const handleFuelStop = (gallons: number, cost: number) => {
    // The fuel data will be automatically updated by the useLiveTracking hook
    toast.success(`⛽ Fuel stop recorded: ${gallons} gal for $${cost.toFixed(2)}`);
  };

  const exportTrackingData = () => {
    try {
      const data = mapService.exportRouteData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tracking-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('📊 Tracking data exported successfully');
    } catch (error) {
      toast.error('Failed to export tracking data');
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString();
  };

  const formatDistance = (miles: number) => {
    return `${miles.toFixed(1)} mi`;
  };

  const formatSpeed = (mph: number) => {
    return `${mph.toFixed(2)} mph`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_progress': return 'text-green-600 bg-green-100';
      case 'planned': return 'text-blue-600 bg-blue-100';
      case 'completed': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-primary-600 mx-auto mb-4" />
              <p className="text-neutral-600">Loading tracking data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8">
          <div className="mb-4 sm:mb-0">
            <div className="flex items-center space-x-3 mb-2">
              <div className={ICON_STYLES.sectionHeader}>
                <Navigation className={ICON_STYLES.sectionHeaderIcon} />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900">Live Tracking</h1>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 mt-1 sm:mt-2">
              <p className="text-neutral-600">Monitor active trips and real-time location updates</p>
              {lastUpdate && (
                <div className="flex items-center space-x-2 text-sm text-success-600 mt-1 sm:mt-0">
                  <div className={`w-2 h-2 bg-success-500 rounded-full ${isTracking ? 'animate-pulse' : ''}`}></div>
                  <span>Last update: {formatTime(lastUpdate.toISOString())}</span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={fetchActiveTrips}
            disabled={isLoading}
            className={`flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto ${BUTTON_STYLES.primary}`}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-400 mr-3" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {activeTrips.length === 0 ? (
          <div className={`${CARD_STYLES.base} ${CARD_STYLES.padding} text-center`}>
            <Truck className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-neutral-900 mb-2">No Active Trips</h3>
            <p className="text-neutral-600 mb-4">Start a trip from the Trip Planner to begin tracking.</p>
            <button
              onClick={() => window.location.href = '/trips'}
              className={`inline-flex items-center px-4 py-2 rounded-lg transition-colors ${BUTTON_STYLES.primary}`}
            >
              <RouteIcon className="h-4 w-4 mr-2" />
              Go to Trip Planner
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            {/* Trip Selection & Controls */}
            <div className="xl:col-span-1 space-y-6">
              {/* Active Trips */}
              <div className={`${CARD_STYLES.base} ${CARD_STYLES.padding}`}>
                <h3 className={`${CARD_STYLES.title} mb-4 flex items-center`}>
                  <div className={ICON_STYLES.sectionHeader}>
                    <Truck className={ICON_STYLES.sectionHeaderIcon} />
                  </div>
                  <span className="ml-2">Active Trips</span>
                </h3>
                
                <div className="space-y-3">
                  {activeTrips.map((trip) => (
                    <div
                      key={trip.id}
                      onClick={() => setSelectedTrip(trip)}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedTrip?.id === trip.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-neutral-900">{trip.trip_name}</h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(trip.status)}`}>
                          {trip.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-sm text-neutral-600">
                        <div className="flex items-center space-x-1 mb-1">
                          <MapPin className="h-3 w-3" />
                          <span>{trip.pickup_location} → {trip.delivery_location}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>Started: {formatTime(trip.actual_start_time || trip.planned_start_time)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tracking Controls */}
              <div className={`${CARD_STYLES.base} ${CARD_STYLES.padding}`}>
                <h3 className={`${CARD_STYLES.title} mb-4`}>Tracking Controls</h3>
                
                <div className="space-y-3">
                  <button
                    onClick={isTracking ? handleStopTracking : handleStartTracking}
                    disabled={!selectedTrip}
                    className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      isTracking ? BUTTON_STYLES.danger : BUTTON_STYLES.success
                    }`}
                  >
                    {isTracking ? (
                      <>
                        <Square className="h-4 w-4" />
                        <span>Stop Tracking</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" />
                        <span>Start Tracking</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={exportTrackingData}
                    disabled={!isTracking || routePoints.length === 0}
                    className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${BUTTON_STYLES.secondary}`}
                  >
                    <Download className="h-4 w-4" />
                    <span>Export Data</span>
                  </button>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-600">GPS Status:</span>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${isTracking ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                      <span className={isTracking ? 'text-green-600' : 'text-gray-600'}>
                        {isTracking ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-600">WebSocket:</span>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
                        {isConnected ? 'Connected' : 'Disconnected'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Map */}
            <div className="xl:col-span-2 space-y-6">
              <div className={`${CARD_STYLES.base} ${CARD_STYLES.padding}`}>
                <h3 className={`${CARD_STYLES.title} mb-4 flex items-center`}>
                  <div className={ICON_STYLES.sectionHeader}>
                    <MapPin className={ICON_STYLES.sectionHeaderIcon} />
                  </div>
                  <span className="ml-2">Live Map</span>
                  {selectedTrip && (
                    <span className="ml-2 text-sm text-neutral-600">- {selectedTrip.trip_name}</span>
                  )}
                </h3>
                
                <div className="h-96 rounded-lg overflow-hidden">
                  <LiveMap
                    currentLocation={currentLocation}
                    routePoints={routePoints}
                    fuelStops={fuelData.fuelStops}
                    isTracking={isTracking}
                    className="h-full"
                  />
                </div>
              </div>

              {/* Trip Status Metrics */}
              {currentLocation && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className={`${CARD_STYLES.base} ${CARD_STYLES.padding} text-center`}>
                      <div className="flex items-center justify-center mb-2">
                        <Zap className="h-5 w-5 text-blue-500" />
                      </div>
                      <p className="text-2xl font-bold text-blue-600">
                        {formatSpeed(currentLocation.speed || 0)}
                      </p>
                      <p className="text-sm text-neutral-600">Current Speed</p>
                    </div>

                    <div className={`${CARD_STYLES.base} ${CARD_STYLES.padding} text-center`}>
                      <div className="flex items-center justify-center mb-2">
                        <RouteIcon className="h-5 w-5 text-green-500" />
                      </div>
                      <p className="text-2xl font-bold text-green-600">
                        {formatDistance(distanceRemaining)}
                      </p>
                      <p className="text-sm text-neutral-600">Distance Remaining</p>
                    </div>

                    <div className={`${CARD_STYLES.base} ${CARD_STYLES.padding} text-center`}>
                      <div className="flex items-center justify-center mb-2">
                        <Clock className="h-5 w-5 text-amber-500" />
                      </div>
                      <p className="text-2xl font-bold text-amber-600">
                        {estimatedArrival ? formatTime(estimatedArrival) : '--:--'}
                      </p>
                      <p className="text-sm text-neutral-600">ETA</p>
                    </div>

                    <div className={`${CARD_STYLES.base} ${CARD_STYLES.padding} text-center`}>
                      <div className="flex items-center justify-center mb-2">
                        <Fuel className="h-5 w-5 text-purple-500" />
                      </div>
                      <p className="text-2xl font-bold text-purple-600">
                        {fuelData.currentLevel.toFixed(2)}%
                      </p>
                      <p className="text-sm text-neutral-600">Fuel Level</p>
                    </div>
                  </div>

                  {/* Additional Metrics Row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className={`${CARD_STYLES.base} ${CARD_STYLES.padding} text-center`}>
                      <div className="flex items-center justify-center mb-2">
                        <Zap className="h-5 w-5 text-green-500" />
                      </div>
                      <p className="text-xl font-bold text-green-600">
                        {averageSpeed.toFixed(2)} mph
                      </p>
                      <p className="text-sm text-neutral-600">Average Speed</p>
                    </div>

                    <div className={`${CARD_STYLES.base} ${CARD_STYLES.padding} text-center`}>
                      <div className="flex items-center justify-center mb-2">
                        <RouteIcon className="h-5 w-5 text-indigo-500" />
                      </div>
                      <p className="text-xl font-bold text-indigo-600">
                        {totalDistance.toFixed(2)} mi
                      </p>
                      <p className="text-sm text-neutral-600">Total Distance</p>
                    </div>

                    <div className={`${CARD_STYLES.base} ${CARD_STYLES.padding} text-center`}>
                      <div className="flex items-center justify-center mb-2">
                        <Clock className="h-5 w-5 text-orange-500" />
                      </div>
                      <p className="text-xl font-bold text-orange-600">
                        {routePoints.length}
                      </p>
                      <p className="text-sm text-neutral-600">GPS Points</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Fuel Monitor */}
            <div className="xl:col-span-1">
              <FuelMonitor
                currentLocation={currentLocation}
                fuelData={fuelData}
                onFuelStop={handleFuelStop}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Tracking;