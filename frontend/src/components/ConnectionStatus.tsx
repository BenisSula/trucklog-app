import React, { useState } from 'react';
import { 
  WifiOff, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Activity,
  Signal,
  SignalHigh,
  SignalLow,
  Loader2
} from 'lucide-react';
import { useConnectionStatus } from '../hooks/useConnectionStatus';

interface ConnectionStatusProps {
  showText?: boolean;
  showMetrics?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  variant?: 'simple' | 'detailed' | 'minimal';
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ 
  showText = true,
  showMetrics = false,
  size = 'md',
  className = '',
  variant = 'simple'
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const {
    isConnected,
    isConnecting,
    isReconnecting,
    lastError,
    metrics,
    statusColor,
    statusText,
    statusIcon,
    uptimeFormatted,
    latencyFormatted,
    subscribedChannels
  } = useConnectionStatus();

  const getStatusIcon = () => {
    if (isConnecting || isReconnecting) {
      return <Loader2 className="animate-spin" />;
    }
    
    if (isConnected) {
      switch (statusIcon) {
        case 'excellent':
          return <SignalHigh className="text-green-500" />;
        case 'good':
          return <Signal className="text-green-500" />;
        case 'poor':
          return <SignalLow className="text-orange-500" />;
        default:
          return <CheckCircle className="text-green-500" />;
      }
    }
    
    if (lastError) {
      return <AlertCircle className="text-red-500" />;
    }
    
    return <WifiOff className="text-gray-500" />;
  };

  const getStatusColor = () => {
    switch (statusColor) {
      case 'green': return 'text-green-600';
      case 'yellow': return 'text-yellow-600';
      case 'orange': return 'text-orange-600';
      case 'red': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusBgColor = () => {
    switch (statusColor) {
      case 'green': return 'bg-green-50 border-green-200';
      case 'yellow': return 'bg-yellow-50 border-yellow-200';
      case 'orange': return 'bg-orange-50 border-orange-200';
      case 'red': return 'bg-red-50 border-red-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'h-4 w-4';
      case 'lg':
        return 'h-7 w-7';
      case 'md':
      default:
        return 'h-5 w-5';
    }
  };

  const getTextSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'text-xs';
      case 'lg':
        return 'text-base';
      case 'md':
      default:
        return 'text-sm';
    }
  };

  if (variant === 'minimal') {
    return (
      <div className={`relative ${className}`}>
        <div 
          className="flex items-center justify-center cursor-pointer"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          title={statusText}
        >
          <div className={getSizeClasses()}>
            {getStatusIcon()}
          </div>
        </div>

        {/* Tooltip */}
        {showTooltip && (
          <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 p-3 z-50">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900">Connection Status</span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  statusColor === 'green' ? 'bg-green-100 text-green-800' :
                  statusColor === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                  statusColor === 'orange' ? 'bg-orange-100 text-orange-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              
              <div className="text-sm text-gray-600">
                {statusText}
              </div>
              
              {isConnected && (
                <div className="text-xs text-gray-500 space-y-1">
                  <div>Uptime: {uptimeFormatted}</div>
                  <div>Latency: {latencyFormatted}</div>
                  <div>Channels: {subscribedChannels.length}</div>
                </div>
              )}
              
              {lastError && (
                <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                  <strong>Error:</strong> {lastError}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (variant === 'detailed') {
    return (
      <div className={`relative ${className}`}>
        <div 
          className={`flex items-center space-x-2 p-2 rounded-lg border ${getStatusBgColor()}`}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <div className={getSizeClasses()}>
            {getStatusIcon()}
          </div>
          {showText && (
            <div className="flex flex-col">
              <span className={`font-medium ${getTextSizeClasses()} ${getStatusColor()}`}>
                {statusText}
              </span>
              {showMetrics && isConnected && (
                <div className="flex items-center space-x-3 text-xs text-gray-500">
                  <span className="flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {uptimeFormatted}
                  </span>
                  <span className="flex items-center">
                    <Activity className="h-3 w-3 mr-1" />
                    {latencyFormatted}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tooltip with detailed metrics */}
        {showTooltip && (
          <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 p-3 z-50">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900">Connection Status</span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  statusColor === 'green' ? 'bg-green-100 text-green-800' :
                  statusColor === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                  statusColor === 'orange' ? 'bg-orange-100 text-orange-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {metrics.connectionQuality}
                </span>
              </div>
              
              {isConnected && (
                <>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500">Uptime:</span>
                      <span className="ml-1 font-medium">{uptimeFormatted}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Latency:</span>
                      <span className="ml-1 font-medium">{latencyFormatted}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Channels:</span>
                      <span className="ml-1 font-medium">{subscribedChannels.length}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Reconnects:</span>
                      <span className="ml-1 font-medium">{metrics.reconnectionAttempts}</span>
                    </div>
                  </div>
                  
                  {subscribedChannels.length > 0 && (
                    <div>
                      <span className="text-xs text-gray-500">Subscribed:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {subscribedChannels.map(channel => (
                          <span key={channel} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                            {channel}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
              
              {lastError && (
                <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                  <strong>Error:</strong> {lastError}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Simple variant (default)
  return (
    <div className={`relative ${className}`}>
      <div 
        className="flex items-center space-x-2"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <div className={getSizeClasses()}>
          {getStatusIcon()}
        </div>
        {showText && (
          <span className={`font-medium ${getTextSizeClasses()} ${getStatusColor()}`}>
            {statusText}
          </span>
        )}
        {showMetrics && isConnected && (
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <span>{uptimeFormatted}</span>
            <span>•</span>
            <span>{latencyFormatted}</span>
          </div>
        )}
      </div>

      {/* Simple tooltip */}
      {showTooltip && (
        <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 p-3 z-50">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-900">Connection Status</span>
              <span className={`text-xs px-2 py-1 rounded-full ${
                statusColor === 'green' ? 'bg-green-100 text-green-800' :
                statusColor === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                statusColor === 'orange' ? 'bg-orange-100 text-orange-800' :
                'bg-red-100 text-red-800'
              }`}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            
            <div className="text-sm text-gray-600">
              {statusText}
            </div>
            
            {isConnected && (
              <div className="text-xs text-gray-500 space-y-1">
                <div>Uptime: {uptimeFormatted}</div>
                <div>Latency: {latencyFormatted}</div>
                <div>Channels: {subscribedChannels.length}</div>
              </div>
            )}
            
            {lastError && (
              <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                <strong>Error:</strong> {lastError}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectionStatus;

