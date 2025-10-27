/**
 * WebSocket Context
 * Currently using polling instead of WebSocket
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useWebSocket as useWebSocketHook } from '../hooks/useWebSocket';
import { WebSocketMessage } from '../services/websocket';

interface WebSocketContextType {
  isConnected: boolean;
  isConnecting: boolean;
  sendMessage: (message: WebSocketMessage) => boolean;
  subscribe: (channel: string) => void;
  unsubscribe: (channel: string) => void;
  subscribeToTrip: (tripId: number) => void;
  unsubscribeFromTrip: (tripId: number) => void;
  subscribeToHOS: () => void;
  subscribeToNotifications: () => void;
  lastError: string | null;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

interface WebSocketProviderProps {
  children: ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const webSocket = useWebSocketHook({
    autoConnect: true,
    channels: ['notifications', 'hos_updates']
  });

  const value: WebSocketContextType = {
    isConnected: webSocket.isConnected,
    isConnecting: webSocket.isConnecting,
    sendMessage: webSocket.sendMessage,
    subscribe: webSocket.subscribe,
    unsubscribe: webSocket.unsubscribe,
    subscribeToTrip: webSocket.subscribeToTrip,
    unsubscribeFromTrip: webSocket.unsubscribeFromTrip,
    subscribeToHOS: webSocket.subscribeToHOS,
    subscribeToNotifications: webSocket.subscribeToNotifications,
    lastError: webSocket.lastError,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

export default WebSocketContext;