/**
 * Real-time Dashboard Component
 * Provides comprehensive real-time monitoring and updates
 */

import React, { useState, useEffect } from 'react';
import {
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle,
  Truck,
  MapPin,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useRealTimeHOS } from '../hooks/useRealTimeHOS';
import { useRealTimeTrips } from '../hooks/useRealTimeTrips';
import { useConnectionStatus } from '../hooks/useConnectionStatus';
import ConnectionStatus from './ConnectionStatus';
import NotificationCenter from './NotificationCenter';

interface RealTimeDashboardProps {
  className?: string;
  showSettings?: boolean;
}

const RealTimeDashboard: React.FC<RealTimeDashboardProps> = ({
  className = '',
  showSettings = true
}) => {
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Real-time hooks
  const {
    hosStatus,
    violations,
    canDrive,
    hoursAvailable,
    isApproachingLimit,
    hasViolations,
    hasCriticalViolations
    // statusSummary, // Commented out to fix lint warning
  } = useRealTimeHOS({
    autoRefresh: true,
    refreshInterval: 30000,
    enableWebSocket: true,
    enableNotifications: true,
    violationThreshold: 2
  });

  const {
    activeTrips,
    tripStats,
    hasOverdueTrips,
    hasCriticalAlerts
  } = useRealTimeTrips({
    autoRefresh: true,
    refreshInterval: 60000,
    enableWebSocket: true,
    enableNotifications: true,
    activeTripsOnly: true,
    enableDelayAlerts: true,
    enableWeatherAlerts: true
  });

  const {
    isConnected,
    // isConnecting, // Commented out to fix lint warning
    metrics,
    // statusColor, // Commented out to fix lint warning
    uptimeFormatted,
    latencyFormatted
  } = useConnectionStatus({
    enableMetrics: true,
    updateInterval: 5000
  });


  // Auto-refresh timestamp
  useEffect(() => {
    if (lastRefresh) {
      const timer = setTimeout(() => {
        setLastRefresh(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [lastRefresh]);

  const getHOSStatusColor = () => {
    if (hasCriticalViolations) return 'text-red-600';
    if (hasViolations || isApproachingLimit) return 'text-orange-600';
    if (canDrive) return 'text-green-600';
    return 'text-gray-600';
  };

  const getHOSStatusIcon = () => {
    if (hasCriticalViolations) return <AlertTriangle className="h-5 w-5 text-red-500" />;
    if (hasViolations || isApproachingLimit) return <AlertTriangle className="h-5 w-5 text-orange-500" />;
    if (canDrive) return <CheckCircle className="h-5 w-5 text-green-500" />;
    return <Clock className="h-5 w-5 text-gray-500" />;
  };

  const getTripStatusColor = () => {
    if (hasOverdueTrips) return 'text-red-600';
    if (hasCriticalAlerts) return 'text-orange-600';
    if (activeTrips.length > 0) return 'text-blue-600';
    return 'text-gray-600';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Connection Status and Notifications */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-900">Real-time Dashboard</h1>
          <ConnectionStatus 
            variant="detailed" 
            showMetrics={true}
            size="md"
          />
        </div>
        <div className="flex items-center space-x-4">
          <NotificationCenter 
            maxNotifications={20}
            showSettings={showSettings}
            enableFiltering={true}
            enableSearch={true}
          />
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* HOS Status Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">HOS Status</h3>
            {getHOSStatusIcon()}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Can Drive:</span>
              <span className={`text-sm font-medium ${getHOSStatusColor()}`}>
                {canDrive ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Hours Available:</span>
              <span className={`text-sm font-medium ${getHOSStatusColor()}`}>
                {hoursAvailable.toFixed(1)}h
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Violations:</span>
              <span className={`text-sm font-medium ${hasViolations ? 'text-red-600' : 'text-green-600'}`}>
                {violations.length}
              </span>
            </div>
            {isApproachingLimit && (
              <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-800">
                ⚠️ Approaching HOS limit
              </div>
            )}
          </div>
        </div>

        {/* Trip Status Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Active Trips</h3>
            <Truck className={`h-5 w-5 ${getTripStatusColor()}`} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Active:</span>
              <span className={`text-sm font-medium ${getTripStatusColor()}`}>
                {tripStats.active}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Overdue:</span>
              <span className={`text-sm font-medium ${hasOverdueTrips ? 'text-red-600' : 'text-green-600'}`}>
                {tripStats.overdue}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Alerts:</span>
              <span className={`text-sm font-medium ${hasCriticalAlerts ? 'text-orange-600' : 'text-green-600'}`}>
                {hasCriticalAlerts ? 'Active' : 'None'}
              </span>
            </div>
            {hasOverdueTrips && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
                🚨 Overdue trips detected
              </div>
            )}
          </div>
        </div>

        {/* Connection Status Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Connection</h3>
            {isConnected ? (
              <Wifi className="h-5 w-5 text-green-500" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-500" />
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Status:</span>
              <span className={`text-sm font-medium ${
                isConnected ? 'text-green-600' : 'text-red-600'
              }`}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Uptime:</span>
              <span className="text-sm font-medium text-gray-900">
                {uptimeFormatted}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Latency:</span>
              <span className="text-sm font-medium text-gray-900">
                {latencyFormatted}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Quality:</span>
              <span className={`text-sm font-medium ${
                metrics.connectionQuality === 'excellent' ? 'text-green-600' :
                metrics.connectionQuality === 'good' ? 'text-green-600' :
                metrics.connectionQuality === 'poor' ? 'text-orange-600' :
                'text-red-600'
              }`}>
                {metrics.connectionQuality}
              </span>
            </div>
          </div>
        </div>

        {/* System Status Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">System</h3>
            <Activity className="h-5 w-5 text-blue-500" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Last Refresh:</span>
              <span className="text-sm font-medium text-gray-900">
                {lastRefresh ? lastRefresh.toLocaleTimeString() : 'Never'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Auto-refresh:</span>
              <span className="text-sm font-medium text-green-600">
                Active
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Notifications:</span>
              <span className="text-sm font-medium text-green-600">
                Enabled
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">WebSocket:</span>
              <span className={`text-sm font-medium ${
                isConnected ? 'text-green-600' : 'text-red-600'
              }`}>
                {isConnected ? 'Live' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Activity Feed */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Real-time Activity</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {/* HOS Updates */}
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <Clock className="h-5 w-5 text-blue-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">HOS Status Updates</p>
                <p className="text-sm text-gray-600">
                  {hosStatus ? (
                    `Last updated: ${new Date(hosStatus.timestamp || hosStatus.last_updated || Date.now()).toLocaleString()}`
                  ) : (
                    'Waiting for HOS data...'
                  )}
                </p>
                {hosStatus && (
                  <div className="mt-2 text-xs text-gray-500">
                    Status: {hosStatus.status_summary}
                  </div>
                )}
              </div>
            </div>

            {/* Trip Updates */}
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <Truck className="h-5 w-5 text-green-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Trip Monitoring</p>
                <p className="text-sm text-gray-600">
                  {activeTrips.length > 0 ? (
                    `Monitoring ${activeTrips.length} active trip${activeTrips.length !== 1 ? 's' : ''}`
                  ) : (
                    'No active trips'
                  )}
                </p>
                {activeTrips.length > 0 && (
                  <div className="mt-2 text-xs text-gray-500">
                    {activeTrips.map(trip => (
                      <div key={trip.id} className="flex items-center space-x-2">
                        <MapPin className="h-3 w-3" />
                        <span>{trip.trip_name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Connection Status */}
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                {isConnected ? (
                  <Wifi className="h-5 w-5 text-green-500" />
                ) : (
                  <WifiOff className="h-5 w-5 text-red-500" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">WebSocket Connection</p>
                <p className="text-sm text-gray-600">
                  {isConnected ? (
                    `Connected with ${metrics.connectionQuality} quality`
                  ) : (
                    'Disconnected - using fallback polling'
                  )}
                </p>
                {isConnected && (
                  <div className="mt-2 text-xs text-gray-500">
                    Latency: {latencyFormatted} • Uptime: {uptimeFormatted}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default RealTimeDashboard;
