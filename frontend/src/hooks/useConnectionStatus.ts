/**
 * Enhanced Connection Status Hook
 * Provides comprehensive connection monitoring and status indicators
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from './useWebSocket';

export interface ConnectionMetrics {
  uptime: number;
  latency: number;
  messagesReceived: number;
  messagesSent: number;
  reconnectionAttempts: number;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected';
  lastConnected?: Date;
  lastDisconnected?: Date;
}

export interface ConnectionStatus {
  isConnected: boolean;
  isConnecting: boolean;
  isReconnecting: boolean;
  lastError: string | null;
  metrics: ConnectionMetrics;
  subscribedChannels: string[];
}

export interface UseConnectionStatusOptions {
  enableMetrics?: boolean;
  updateInterval?: number;
  qualityThresholds?: {
    excellent: number; // ms
    good: number; // ms
    poor: number; // ms
  };
}

export const useConnectionStatus = (options: UseConnectionStatusOptions = {}) => {
  const {
    enableMetrics = true,
    updateInterval = 5000, // 5 seconds
    qualityThresholds = {
      excellent: 100,
      good: 500,
      poor: 1000
    }
  } = options;

  const { isConnected, isConnecting, lastError, subscribedChannels } = useWebSocket();
  
  const [metrics, setMetrics] = useState<ConnectionMetrics>({
    uptime: 0,
    latency: 0,
    messagesReceived: 0,
    messagesSent: 0,
    reconnectionAttempts: 0,
    connectionQuality: 'disconnected',
    lastConnected: undefined,
    lastDisconnected: undefined
  });

  const [isReconnecting, setIsReconnecting] = useState(false);
  const [connectionStartTime, setConnectionStartTime] = useState<number | null>(null);
  const [lastDisconnectTime, setLastDisconnectTime] = useState<number | null>(null);

  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastLatencyUpdateRef = useRef<number>(0);

  /**
   * Update connection metrics
   */
  const updateMetrics = useCallback(() => {
    if (!enableMetrics) return;

    const now = Date.now();
    const uptime = connectionStartTime ? now - connectionStartTime : 0;

    // Determine connection quality based on latency
    let quality: ConnectionMetrics['connectionQuality'] = 'disconnected';
    if (isConnected) {
      if (metrics.latency <= qualityThresholds.excellent) {
        quality = 'excellent';
      } else if (metrics.latency <= qualityThresholds.good) {
        quality = 'good';
      } else if (metrics.latency <= qualityThresholds.poor) {
        quality = 'poor';
      } else {
        quality = 'poor';
      }
    }

    setMetrics(prev => ({
      ...prev,
      uptime,
      connectionQuality: quality,
      lastConnected: isConnected ? (prev.lastConnected || new Date()) : prev.lastConnected,
      lastDisconnected: !isConnected ? (prev.lastDisconnected || new Date()) : prev.lastDisconnected
    }));
  }, [enableMetrics, connectionStartTime, isConnected, metrics.latency, qualityThresholds]);

  /**
   * Handle latency updates from WebSocket
   */
  const handleLatencyUpdate = useCallback((latency: number) => {
    const now = Date.now();
    lastLatencyUpdateRef.current = now;
    
    setMetrics(prev => ({
      ...prev,
      latency
    }));
  }, []);

  /**
   * Handle connection quality updates
   */
  const handleConnectionQualityUpdate = useCallback((quality: string) => {
    setMetrics(prev => ({
      ...prev,
      connectionQuality: quality as ConnectionMetrics['connectionQuality']
    }));
  }, []);

  /**
   * Start metrics update interval
   */
  const startMetricsUpdate = useCallback(() => {
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
    }

    if (enableMetrics) {
      updateIntervalRef.current = setInterval(updateMetrics, updateInterval);
    }
  }, [enableMetrics, updateInterval, updateMetrics]);

  /**
   * Stop metrics update interval
   */
  const stopMetricsUpdate = useCallback(() => {
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }
  }, []);

  // Handle connection state changes
  useEffect(() => {
    if (isConnected && !connectionStartTime) {
      setConnectionStartTime(Date.now());
      setLastDisconnectTime(null);
      setIsReconnecting(false);
    } else if (!isConnected && connectionStartTime) {
      setLastDisconnectTime(Date.now());
      setIsReconnecting(true);
    }
  }, [isConnected, connectionStartTime]);

  // Handle reconnection attempts
  useEffect(() => {
    if (isConnecting && lastDisconnectTime) {
      setIsReconnecting(true);
    } else if (isConnected) {
      setIsReconnecting(false);
    }
  }, [isConnecting, isConnected, lastDisconnectTime]);

  // Set up WebSocket event listeners
  useEffect(() => {
    window.addEventListener('latencyUpdate', handleLatencyUpdate as unknown as EventListener);
    window.addEventListener('connectionQualityUpdate', handleConnectionQualityUpdate as unknown as EventListener);

    return () => {
      window.removeEventListener('latencyUpdate', handleLatencyUpdate as unknown as EventListener);
      window.removeEventListener('connectionQualityUpdate', handleConnectionQualityUpdate as unknown as EventListener);
    };
  }, [handleLatencyUpdate, handleConnectionQualityUpdate]);

  // Start/stop metrics update
  useEffect(() => {
    startMetricsUpdate();
    return stopMetricsUpdate;
  }, [startMetricsUpdate, stopMetricsUpdate]);

  // Computed values
  const connectionStatus: ConnectionStatus = {
    isConnected,
    isConnecting,
    isReconnecting,
    lastError,
    metrics,
    subscribedChannels
  };

  const getStatusColor = () => {
    if (isConnecting || isReconnecting) return 'yellow';
    if (isConnected) {
      switch (metrics.connectionQuality) {
        case 'excellent': return 'green';
        case 'good': return 'green';
        case 'poor': return 'orange';
        default: return 'green';
      }
    }
    return 'red';
  };

  const getStatusText = () => {
    if (isConnecting) return 'Connecting...';
    if (isReconnecting) return 'Reconnecting...';
    if (isConnected) {
      switch (metrics.connectionQuality) {
        case 'excellent': return 'Connected (Excellent)';
        case 'good': return 'Connected (Good)';
        case 'poor': return 'Connected (Poor)';
        default: return 'Connected';
      }
    }
    if (lastError) return 'Connection Error';
    return 'Disconnected';
  };

  const getStatusIcon = () => {
    if (isConnecting || isReconnecting) return 'loading';
    if (isConnected) {
      switch (metrics.connectionQuality) {
        case 'excellent': return 'excellent';
        case 'good': return 'good';
        case 'poor': return 'poor';
        default: return 'connected';
      }
    }
    return 'disconnected';
  };

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const formatLatency = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return {
    // Status
    ...connectionStatus,

    // Computed values
    statusColor: getStatusColor(),
    statusText: getStatusText(),
    statusIcon: getStatusIcon(),
    uptimeFormatted: formatUptime(metrics.uptime),
    latencyFormatted: formatLatency(metrics.latency),

    // Helper functions
    formatUptime,
    formatLatency,

    // Settings
    settings: {
      enableMetrics,
      updateInterval,
      qualityThresholds
    }
  };
};

export default useConnectionStatus;
