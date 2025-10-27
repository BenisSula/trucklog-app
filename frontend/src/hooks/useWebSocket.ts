/**
 * Custom hook for WebSocket management
 * Currently using polling instead of WebSocket
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import createWebSocketService, { WebSocketService, WebSocketMessage } from '../services/websocket';

export interface WebSocketStatus {
  isConnected: boolean;
  isConnecting: boolean;
  subscribedChannels: string[];
  lastError: string | null;
}

export interface UseWebSocketOptions {
  autoConnect?: boolean;
  channels?: string[];
}

export const useWebSocket = (options: UseWebSocketOptions = {}) => {
  const { user, isAuthenticated } = useAuth();
  const [status, setStatus] = useState<WebSocketStatus>({
    isConnected: false,
    isConnecting: false,
    subscribedChannels: [],
    lastError: null,
  });

  const wsServiceRef = useRef<WebSocketService | null>(null);
  const isInitializedRef = useRef(false);
  const subscribedChannelsRef = useRef<Set<string>>(new Set());

  const { autoConnect = true, channels = [] } = options;

  /**
   * Initialize WebSocket service
   */
  const initializeWebSocket = useCallback(() => {
    if (isInitializedRef.current) return;

    console.log('🚀 Initializing polling-based connection...', { 
      user: user?.id, 
      isAuthenticated 
    });

    isInitializedRef.current = true;
    const wsService = createWebSocketService(user?.id || 1);
    wsServiceRef.current = wsService;

    // Set up event listeners
    wsService.on('connected', () => {
      console.log('✅ Polling connection: Connected');
      setStatus(prev => ({
        ...prev,
        isConnected: true,
        isConnecting: false,
        lastError: null,
      }));
    });

    wsService.on('disconnected', () => {
      console.log('🔌 Polling connection: Disconnected');
      setStatus(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
      }));
    });

    wsService.on('error', (error) => {
      console.error('❌ Polling connection: Error', error);
      setStatus(prev => ({
        ...prev,
        isConnecting: false,
        lastError: error.message || 'Connection error',
      }));
    });

  }, [user?.id, isAuthenticated]);

  /**
   * Connect
   */
  const connect = useCallback(async () => {
    if (!wsServiceRef.current) return;

    setStatus(prev => {
      if (prev.isConnected || prev.isConnecting) return prev;
      return { ...prev, isConnecting: true };
    });

    try {
      await wsServiceRef.current.connect();
    } catch (error) {
      setStatus(prev => ({
        ...prev,
        isConnecting: false,
        lastError: error instanceof Error ? error.message : 'Connection failed',
      }));
    }
  }, []);

  /**
   * Disconnect
   */
  const disconnect = useCallback(() => {
    if (wsServiceRef.current) {
      wsServiceRef.current.disconnect();
    }
    subscribedChannelsRef.current.clear();
    setStatus({
      isConnected: false,
      isConnecting: false,
      subscribedChannels: [],
      lastError: null,
    });
  }, []);

  /**
   * Send message
   */
  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (!wsServiceRef.current) return false;
    return wsServiceRef.current.send(message);
  }, []);

  /**
   * Subscribe to channel
   */
  const subscribe = useCallback((channel: string) => {
    if (!wsServiceRef.current || subscribedChannelsRef.current.has(channel)) return;
    
    wsServiceRef.current.subscribe(channel);
    subscribedChannelsRef.current.add(channel);
    
    setStatus(prev => ({
      ...prev,
      subscribedChannels: Array.from(subscribedChannelsRef.current),
    }));
  }, []);

  /**
   * Unsubscribe from channel
   */
  const unsubscribe = useCallback((channel: string) => {
    if (!wsServiceRef.current || !subscribedChannelsRef.current.has(channel)) return;
    
    wsServiceRef.current.unsubscribe(channel);
    subscribedChannelsRef.current.delete(channel);
    
    setStatus(prev => ({
      ...prev,
      subscribedChannels: Array.from(subscribedChannelsRef.current),
    }));
  }, []);

  // Initialize
  useEffect(() => {
    if (!isInitializedRef.current) {
      console.log('🔄 Initializing polling connection...');
      initializeWebSocket();
    }
  }, [initializeWebSocket]);

  // Auto-connect
  useEffect(() => {
    if (autoConnect && wsServiceRef.current && !status.isConnected && !status.isConnecting) {
      console.log('🔄 Auto-connecting polling service...');
      connect();
    }
  }, [autoConnect, connect, status.isConnected, status.isConnecting]);

  // Subscribe to default channels - Fixed to prevent infinite loop
  useEffect(() => {
    if (status.isConnected && channels.length > 0) {
      console.log('📡 Subscribing to default channels:', channels);
      channels.forEach(channel => {
        if (!subscribedChannelsRef.current.has(channel)) {
          subscribe(channel);
        }
      });
    }
  }, [status.isConnected]); // Only depend on connection status

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsServiceRef.current) {
        wsServiceRef.current.disconnect();
      }
    };
  }, []);

  /**
   * Subscribe to trip updates
   */
  const subscribeToTrip = useCallback((tripId: number) => {
    subscribe(`trip_${tripId}`);
  }, [subscribe]);

  /**
   * Unsubscribe from trip updates
   */
  const unsubscribeFromTrip = useCallback((tripId: number) => {
    unsubscribe(`trip_${tripId}`);
  }, [unsubscribe]);

  /**
   * Subscribe to HOS updates
   */
  const subscribeToHOS = useCallback(() => {
    subscribe('hos_updates');
  }, [subscribe]);

  /**
   * Subscribe to notifications
   */
  const subscribeToNotifications = useCallback(() => {
    subscribe('notifications');
  }, [subscribe]);

  return {
    // Status
    ...status,
    
    // Actions
    connect,
    disconnect,
    sendMessage,
    subscribe,
    unsubscribe,
    subscribeToTrip,
    unsubscribeFromTrip,
    subscribeToHOS,
    subscribeToNotifications,
  };
};

export default useWebSocket;