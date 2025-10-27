import React, { useState, useEffect } from 'react';
import { Truck, Clock, MapPin, AlertTriangle, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useHOSUpdates } from '../hooks/useHOSUpdates';
import { useTripUpdates } from '../hooks/useTripUpdates';
import { apiService, LogEntry } from '../services/api';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  
  // Real-time HOS updates
  const {
    hosData: hosStatus,
    lastUpdated: hosLastUpdated,
    statusSummary,
    isApproachingLimits,
    timeUntilBreak,
    canDrive,
    hasViolations
  } = useHOSUpdates({
    autoRefresh: true,
    refreshInterval: 30000,
    enableWebSocket: true
  });

  // Real-time trip updates
  const {
    activeTrips,
    tripStats
  } = useTripUpdates({
    autoRefresh: true,
    refreshInterval: 60000,
    enableWebSocket: true,
    activeTripsOnly: true
  });

  // Remove debug logging for better performance

  const [recentLogEntries, setRecentLogEntries] = useState<LogEntry[]>([]);
  const [violations, setViolations] = useState<any[]>([]);

  const fetchAdditionalData = async () => {
    try {
      const [logEntriesResult, violationsResult] = await Promise.allSettled([
        apiService.getLogEntries({ page_size: 5 }),
        apiService.getViolations(),
      ]);

      // Handle log entries
      if (logEntriesResult.status === 'fulfilled') {
        setRecentLogEntries(Array.isArray(logEntriesResult.value) ? logEntriesResult.value.slice(0, 5) : []);
      } else {
        setRecentLogEntries([]); // Set empty array as fallback
      }

      // Handle violations
      if (violationsResult.status === 'fulfilled') {
        setViolations(violationsResult.value);
      } else {
        setViolations([]); // Set empty array as fallback
      }
    } catch (error: any) {
      // Set fallback data
      setRecentLogEntries([]);
      setViolations([]);
    }
  };

  useEffect(() => {
    fetchAdditionalData();
  }, []);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} days ago`;
  };

  // getStatusColor function removed as it's not used

  const getHOSStatusColor = () => {
    if (!statusSummary) return 'text-gray-600';
    if (hasViolations) return 'text-red-600';
    if (isApproachingLimits) return 'text-yellow-600';
    if (canDrive) return 'text-green-600';
    return 'text-gray-600';
  };

  const getHOSStatusIcon = () => {
    if (hasViolations) return <AlertCircle className="h-5 w-5 text-red-500" />;
    if (isApproachingLimits) return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    if (canDrive) return <Clock className="h-5 w-5 text-green-500" />;
    return <Clock className="h-5 w-5 text-gray-500" />;
  };

  return (
    <div className="space-y-6">


      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user?.first_name}!</p>
        </div>
      </div>

      {/* HOS Status Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Hours of Service Status</h2>
          <div className="flex items-center space-x-2">
            {getHOSStatusIcon()}
            <span className={`text-sm font-medium ${getHOSStatusColor()}`}>
              {statusSummary?.status || 'Loading...'}
            </span>
          </div>
        </div>

        {hosStatus ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Hours Used</p>
              <p className="text-2xl font-bold text-gray-900">
                {hosStatus.hours_used || 0}
                <span className="text-sm font-normal text-gray-500">
                  / {hosStatus.hours_used + hosStatus.hours_available || 0}
                </span>
              </p>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Cycle Progress</p>
              <div className="flex items-center space-x-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    // eslint-disable-next-line react/forbid-dom-props
                    style={{ width: `${hosStatus.cycle_progress_percent || 0}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {hosStatus.cycle_progress_percent || 0}%
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Violations</p>
              <p className={`text-2xl font-bold ${hasViolations ? 'text-red-600' : 'text-green-600'}`}>
                {hosStatus.violations_count || 0}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading HOS status...</p>
          </div>
        )}

        {/* HOS Alerts */}
        {isApproachingLimits && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <p className="text-sm text-yellow-800">
                You're approaching HOS limits. Consider planning a break soon.
              </p>
            </div>
          </div>
        )}

        {timeUntilBreak !== null && timeUntilBreak <= 1 && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-sm text-red-800">
                Break required within {Math.round(timeUntilBreak * 60)} minutes.
              </p>
            </div>
          </div>
        )}

        {/* Last Updated */}
        {hosLastUpdated && (
          <p className="text-xs text-gray-500 mt-2">
            Last updated: {formatTimeAgo(hosLastUpdated.toISOString())}
          </p>
        )}
      </div>

      {/* Active Trips */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Active Trips</h2>
          <span className="text-sm text-gray-500">
            {activeTrips.length} active
          </span>
        </div>

        {activeTrips.length > 0 ? (
          <div className="space-y-3">
            {activeTrips.map((trip) => (
              <div key={trip.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <MapPin className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="font-medium text-gray-900">{trip.trip_name}</p>
                    <p className="text-sm text-gray-500">
                      {trip.pickup_location} → {trip.delivery_location}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 capitalize">{trip.status}</p>
                  <p className="text-xs text-gray-500">
                    {formatTimeAgo(trip.updated_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Truck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No active trips</p>
          </div>
        )}

        {/* Trip Stats */}
        {tripStats && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{tripStats.total}</p>
              <p className="text-sm text-gray-500">Total Trips</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{tripStats.completed}</p>
              <p className="text-sm text-gray-500">Completed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">{tripStats.planned}</p>
              <p className="text-sm text-gray-500">Planned</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{tripStats.completionRate.toFixed(1)}%</p>
              <p className="text-sm text-gray-500">Success Rate</p>
            </div>
          </div>
        )}
      </div>

      {/* Recent Log Entries */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Log Entries</h2>
        
        {recentLogEntries.length > 0 ? (
          <div className="space-y-3">
            {recentLogEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900 capitalize">{entry.duty_status}</p>
                    <p className="text-sm text-gray-500">{entry.location}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-900">
                    {new Date(entry.start_time).toLocaleTimeString()}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatTimeAgo(entry.start_time)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No recent log entries</p>
          </div>
        )}
      </div>

      {/* Violations */}
      {violations.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Violations</h2>
          <div className="space-y-3">
            {violations.slice(0, 3).map((violation) => (
              <div key={violation.id} className="flex items-center space-x-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <div className="flex-1">
                  <p className="font-medium text-red-900">{violation.violation_type}</p>
                  <p className="text-sm text-red-700">{violation.description}</p>
                </div>
                <span className="text-xs text-red-600">
                  {formatTimeAgo(violation.created_at)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;