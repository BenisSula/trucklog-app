import React, { useState, useEffect } from 'react';
import { MapPin, Clock, Route, Truck, AlertTriangle, CheckCircle, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { apiService, Trip, Location, HOSStatus } from '../services/api';
import { useWebSocket } from '../contexts/WebSocketContext';
import toast from 'react-hot-toast';

interface TripFormData {
  trip_name: string;
  pickup_location_id: number | null;
  delivery_location_id: number | null;
  planned_start_time: string;
  planned_end_time: string;
  hours_used_before_trip: number;
  notes: string;
}

interface HOSCalculation {
  can_drive: boolean;
  hours_available: number;
  hours_used: number;
  trip_hours: number;
  remaining_hours_after_trip: number;
  violations: any[];
  warnings?: any[];
  recommendations?: any[];
  hos_status: HOSStatus;
  trip_analysis?: {
    total_driving_hours: number;
    total_on_duty_hours: number;
    cycle_limit: number;
    would_exceed_cycle: boolean;
    would_exceed_driving: boolean;
    would_exceed_on_duty: boolean;
  };
}

const TripPlanner: React.FC = () => {
  const { isConnected } = useWebSocket();
  // Authentication context available if needed
  // const { user, isAuthenticated } = useAuth();
  const [formData, setFormData] = useState<TripFormData>({
    trip_name: '',
    pickup_location_id: null,
    delivery_location_id: null,
    planned_start_time: '',
    planned_end_time: '',
    hours_used_before_trip: 0,
    notes: '',
  });
  
  const [locations, setLocations] = useState<Location[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [hosCalculation, setHosCalculation] = useState<HOSCalculation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCalculatingHOS, setIsCalculatingHOS] = useState(false);
  const [showHOSResults, setShowHOSResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  // Listen for trip updates from WebSocket
  useEffect(() => {
    const handleTripUpdate = (event: CustomEvent) => {
      // Refresh trip data when updates are received
      fetchData(true);
    };

    window.addEventListener('tripUpdate', handleTripUpdate as EventListener);
    
    return () => {
      window.removeEventListener('tripUpdate', handleTripUpdate as EventListener);
    };
  }, []);

  const fetchData = async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      
      const [locationsData, tripsData] = await Promise.all([
        apiService.getLocations(),
        apiService.getTrips(),
      ]);
      
      // Ensure data is arrays to prevent map errors
      const locations = Array.isArray(locationsData) ? locationsData : [];
      const trips = Array.isArray(tripsData) ? tripsData : [];
      
      setLocations(locations);
      setTrips(trips);
      
      // Show success message for manual refresh
      if (showRefresh) {
        toast.success(`✅ Data refreshed! Found ${locations.length} locations and ${trips.length} trips`);
      }
      
    } catch (error: any) {
      console.error('Error fetching data:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to load data';
      setError(errorMessage);
      
      if (showRefresh) {
        toast.error(`Refresh failed: ${errorMessage}`);
      } else {
        toast.error(`Failed to load data: ${errorMessage}`);
      }
      
      // Set empty arrays on error to prevent map errors
      setLocations([]);
      setTrips([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name.includes('_id') ? (value ? parseInt(value) : null) : value
    }));
  };

  const calculateHOS = async () => {
    if (!formData.planned_start_time || !formData.planned_end_time) {
      toast.error('Please select both start and end times to check HOS compliance');
      return;
    }

    // Validate that end time is after start time
    const startTime = new Date(formData.planned_start_time);
    const endTime = new Date(formData.planned_end_time);
    
    if (endTime <= startTime) {
      toast.error('End time must be after start time');
      return;
    }

    // Check if start time is in the past
    const now = new Date();
    if (startTime < now) {
      toast.error('Start time cannot be in the past');
      return;
    }

    try {
      setIsCalculatingHOS(true);
      setError(null);
      setShowHOSResults(false); // Hide previous results while calculating
      
      const calculation = await apiService.calculateHOS({
        planned_start_time: formData.planned_start_time,
        planned_end_time: formData.planned_end_time,
        hours_used_before_trip: formData.hours_used_before_trip,
      });
      
      setHosCalculation(calculation);
      setShowHOSResults(true);
      
      // Show appropriate success message based on compliance
      if (calculation.can_drive) {
        toast.success('✅ HOS compliant - You can drive this trip!');
      } else {
        toast.error('⚠️ HOS violation detected - Review the compliance report');
      }
    } catch (error: any) {
      console.error('Error calculating HOS:', error);
      console.error('HOS Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      const errorMessage = error.response?.data?.detail || error.response?.data?.error || error.message || 'Failed to calculate HOS compliance';
      setError(errorMessage);
      toast.error(`HOS Calculation Failed: ${errorMessage}`);
    } finally {
      setIsCalculatingHOS(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.trip_name || !formData.pickup_location_id || !formData.delivery_location_id) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const newTrip = await apiService.createTrip({
        trip_name: formData.trip_name,
        pickup_location: formData.pickup_location_id,
        delivery_location: formData.delivery_location_id,
        planned_start_time: formData.planned_start_time,
        planned_end_time: formData.planned_end_time,
        hours_used_before_trip: formData.hours_used_before_trip,
        notes: formData.notes,
      });
      
      setTrips(prev => Array.isArray(prev) ? [newTrip, ...prev] : [newTrip]);
      setFormData({
        trip_name: '',
        pickup_location_id: null,
        delivery_location_id: null,
        planned_start_time: '',
        planned_end_time: '',
        hours_used_before_trip: 0,
        notes: '',
      });
      setShowHOSResults(false);
      setHosCalculation(null);
      toast.success('Trip created successfully');
    } catch (error: any) {
      console.error('Error creating trip:', error);
      console.error('Trip creation error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      const errorMessage = error.response?.data?.detail || error.response?.data?.error || error.message || 'Failed to create trip';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const startTrip = async (tripId: number) => {
    try {
      setError(null);
      const updatedTrip = await apiService.startTrip(tripId);
      setTrips(prev => Array.isArray(prev) ? prev.map(trip => trip.id === tripId ? updatedTrip : trip) : [updatedTrip]);
      toast.success('Trip started successfully');
    } catch (error: any) {
      console.error('Error starting trip:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to start trip';
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const completeTrip = async (tripId: number) => {
    try {
      setError(null);
      const updatedTrip = await apiService.completeTrip(tripId);
      setTrips(prev => Array.isArray(prev) ? prev.map(trip => trip.id === tripId ? updatedTrip : trip) : [updatedTrip]);
      toast.success('Trip completed successfully');
    } catch (error: any) {
      console.error('Error completing trip:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to complete trip';
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const activeTrips = Array.isArray(trips) ? trips.filter(trip => trip.status === 'in_progress') : [];
  const plannedTrips = Array.isArray(trips) ? trips.filter(trip => trip.status === 'planned') : [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Trip Planner</h1>
          <p className="text-neutral-600 mt-2">Loading trip data...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow-sm border border-neutral-200 animate-pulse">
              <div className="flex items-center">
                <div className="p-2 bg-neutral-200 rounded-lg h-10 w-10"></div>
                <div className="ml-4 flex-1">
                  <div className="h-4 bg-neutral-200 rounded w-20 mb-2"></div>
                  <div className="h-6 bg-neutral-200 rounded w-12"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error && !isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Trip Planner</h1>
            <p className="text-neutral-600 mt-2">Error loading data</p>
          </div>
          <button
            onClick={() => fetchData()}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Retry</span>
          </button>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error loading trip data</h3>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Trip Planner</h1>
          <p className="text-neutral-600 mt-2">Plan HOS-compliant routes and manage your trips.</p>

        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-neutral-600">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <button
            onClick={() => fetchData(true)}
            disabled={isRefreshing}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

        </div>
      </div>

      {/* Trip Planning Form */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
        <h2 className="text-lg font-semibold text-neutral-900 mb-4">Plan New Trip</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Trip Name *
              </label>
              <input
                type="text"
                name="trip_name"
                value={formData.trip_name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="Enter trip name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Hours Used Before Trip
              </label>
              <input
                type="number"
                name="hours_used_before_trip"
                value={formData.hours_used_before_trip}
                onChange={handleInputChange}
                step="0.1"
                min="0"
                max="70"
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="0.0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Pickup Location *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin className="h-5 w-5 text-neutral-400" />
                </div>
                <select
                  name="pickup_location_id"
                  value={formData.pickup_location_id || ''}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  required
                  aria-label="Select pickup location"
                >
                  <option value="">Select pickup location</option>
                  {Array.isArray(locations) && locations.map(location => (
                    <option key={location.id} value={location.id}>
                      {location.name}, {location.city}, {location.state}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Delivery Location *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin className="h-5 w-5 text-neutral-400" />
                </div>
                <select
                  name="delivery_location_id"
                  value={formData.delivery_location_id || ''}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  required
                  aria-label="Select delivery location"
                >
                  <option value="">Select delivery location</option>
                  {Array.isArray(locations) && locations.map(location => (
                    <option key={location.id} value={location.id}>
                      {location.name}, {location.city}, {location.state}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Planned Start Time *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Clock className="h-5 w-5 text-neutral-400" />
                </div>
                <input
                  type="datetime-local"
                  name="planned_start_time"
                  value={formData.planned_start_time}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  required
                  aria-label="Planned start time"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Planned End Time *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Clock className="h-5 w-5 text-neutral-400" />
                </div>
                <input
                  type="datetime-local"
                  name="planned_end_time"
                  value={formData.planned_end_time}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  required
                  aria-label="Planned end time"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              placeholder="Enter any additional notes..."
            />
          </div>

          <div className="flex space-x-4">
            <button
              type="button"
              onClick={calculateHOS}
              disabled={isCalculatingHOS || !formData.planned_start_time || !formData.planned_end_time}
              className="flex items-center space-x-2 px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 focus:outline-none focus:ring-2 focus:ring-accent-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isCalculatingHOS ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              <span>{isCalculatingHOS ? 'Calculating...' : 'Check HOS Compliance'}</span>
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Route className="h-4 w-4" />
              )}
              <span>{isLoading ? 'Creating...' : 'Create Trip'}</span>
            </button>
          </div>
        </form>

        {/* HOS Calculation Results */}
        {showHOSResults && hosCalculation && (
          <div className={`mt-6 p-4 rounded-lg border ${hosCalculation.can_drive ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-neutral-900">HOS Compliance Check</h3>
              <button
                onClick={() => setShowHOSResults(false)}
                className="text-neutral-400 hover:text-neutral-600 transition-colors"
                aria-label="Close HOS results"
              >
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  {hosCalculation.can_drive ? (
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  )}
                  <span className={`text-lg font-semibold ${hosCalculation.can_drive ? 'text-green-700' : 'text-red-700'}`}>
                    {hosCalculation.can_drive ? '✅ HOS Compliant' : '⚠️ HOS Violation'}
                  </span>
                </div>
                
                {hosCalculation.can_drive ? (
                  <p className="text-sm text-green-700">
                    You can safely drive this trip within HOS regulations.
                  </p>
                ) : (
                  <p className="text-sm text-red-700">
                    This trip would violate HOS regulations. Please review the details below.
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-neutral-700">Hours Available:</span>
                  <span className="text-sm text-neutral-900">{hosCalculation.hours_available.toFixed(1)}h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-neutral-700">Trip Duration:</span>
                  <span className="text-sm text-neutral-900">{hosCalculation.trip_hours.toFixed(1)}h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-neutral-700">Hours Used Before:</span>
                  <span className="text-sm text-neutral-900">{hosCalculation.hours_used.toFixed(1)}h</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-sm font-semibold text-neutral-700">Remaining After Trip:</span>
                  <span className={`text-sm font-semibold ${hosCalculation.remaining_hours_after_trip > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {hosCalculation.remaining_hours_after_trip.toFixed(1)}h
                  </span>
                </div>
              </div>
            </div>
            
            {Array.isArray(hosCalculation.violations) && hosCalculation.violations.length > 0 && (
              <div className="mt-4 p-3 bg-red-100 rounded-lg border border-red-200">
                <h4 className="text-sm font-semibold text-red-800 mb-2 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  HOS Violations ({hosCalculation.violations.length})
                </h4>
                <ul className="space-y-1">
                  {hosCalculation.violations.map((violation, index) => (
                    <li key={index} className="text-sm text-red-700 flex items-start">
                      <span className="text-red-500 mr-2">•</span>
                      <span>{violation.description}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {Array.isArray(hosCalculation.warnings) && hosCalculation.warnings.length > 0 && (
              <div className="mt-4 p-3 bg-yellow-100 rounded-lg border border-yellow-200">
                <h4 className="text-sm font-semibold text-yellow-800 mb-2 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Warnings ({hosCalculation.warnings.length})
                </h4>
                <ul className="space-y-1">
                  {hosCalculation.warnings.map((warning: any, index: number) => (
                    <li key={index} className="text-sm text-yellow-700 flex items-start">
                      <span className="text-yellow-500 mr-2">•</span>
                      <span>{warning.message}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {Array.isArray(hosCalculation.recommendations) && hosCalculation.recommendations.length > 0 && (
              <div className="mt-4 p-3 bg-blue-100 rounded-lg border border-blue-200">
                <h4 className="text-sm font-semibold text-blue-800 mb-2 flex items-center">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Recommendations ({hosCalculation.recommendations.length})
                </h4>
                <ul className="space-y-1">
                  {hosCalculation.recommendations.map((recommendation: any, index: number) => (
                    <li key={index} className="text-sm text-blue-700 flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      <span>{recommendation.message}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Active Trips */}
      {activeTrips.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200">
          <div className="p-6 border-b border-neutral-200">
            <h2 className="text-lg font-semibold text-neutral-900">Active Trips</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {Array.isArray(activeTrips) && activeTrips.map(trip => (
                <div key={trip.id} className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center space-x-3">
                    <Truck className="h-5 w-5 text-yellow-600" />
                    <div>
                      <p className="font-medium text-neutral-900">{trip.trip_name}</p>
                      <p className="text-sm text-neutral-600">
                        {trip.pickup_location_name} → {trip.delivery_location_name}
                      </p>
                      <p className="text-xs text-neutral-500">
                        Started: {formatDateTime(trip.actual_start_time || '')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => completeTrip(trip.id)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Complete Trip
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Planned Trips */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200">
        <div className="p-6 border-b border-neutral-200">
          <h2 className="text-lg font-semibold text-neutral-900">Planned Trips</h2>
        </div>
        <div className="p-6">
          {Array.isArray(plannedTrips) && plannedTrips.length > 0 ? (
            <div className="space-y-4">
              {plannedTrips.map(trip => (
                <div key={trip.id} className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center space-x-3">
                    <Route className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-neutral-900">{trip.trip_name}</p>
                      <p className="text-sm text-neutral-600">
                        {trip.pickup_location_name} → {trip.delivery_location_name}
                      </p>
                      <p className="text-xs text-neutral-500">
                        Start: {formatDateTime(trip.planned_start_time)}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(trip.status)}`}>
                      {trip.status}
                    </span>
                    <button
                      onClick={() => startTrip(trip.id)}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    >
                      Start Trip
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-neutral-500 py-8">
              <Route className="h-12 w-12 mx-auto mb-4 text-neutral-300" />
              <p>No planned trips</p>
              <p className="text-sm">Create your first trip to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TripPlanner;
