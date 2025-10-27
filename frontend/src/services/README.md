# Real-time WebSocket Services

This directory contains comprehensive real-time communication services for the TruckLog application, including WebSocket management, notifications, and secure channels.

## 🚀 Features

### WebSocket Service (`websocket.ts`)
- **Real-time Communication**: Bidirectional WebSocket communication with automatic reconnection
- **Message Queuing**: Queue messages when disconnected and send when reconnected
- **Heartbeat Monitoring**: Keep-alive mechanism with latency tracking
- **Connection Quality**: Monitor connection quality based on latency and timing
- **Channel Management**: Subscribe/unsubscribe to specific channels
- **Event-driven Architecture**: Emit events for different message types

### Notification Service (`notification.ts`)
- **Multi-channel Notifications**: Toast, browser, and in-app notifications
- **Priority System**: Urgent, high, normal, and low priority levels
- **Sound & Vibration**: Audio and haptic feedback for important alerts
- **Category Filtering**: Organize notifications by type (HOS, trips, etc.)
- **Persistent Notifications**: Keep critical alerts until dismissed
- **Action Buttons**: Interactive notifications with call-to-action buttons

### Secure WebSocket (`secureWebSocket.ts`)
- **End-to-End Encryption**: AES-GCM encryption for all messages
- **Message Integrity**: HMAC signatures to prevent tampering
- **Authentication**: Token-based authentication with permissions
- **Channel Permissions**: Restrict access to specific channels
- **Message Timeouts**: Automatic timeout handling for message acknowledgments

## 📚 Usage

### Basic WebSocket Connection

```typescript
import createWebSocketService from './services/websocket';

const wsService = createWebSocketService(userId);

// Connect
await wsService.connect();

// Subscribe to channels
wsService.subscribe('hos_updates');
wsService.subscribe('trip_updates');

// Send message
wsService.send({
  type: 'trip_update',
  data: { tripId: 123, status: 'in_progress' }
});

// Listen for events
wsService.on('hosUpdate', (data) => {
  console.log('HOS update received:', data);
});
```

### Real-time HOS Monitoring

```typescript
import { useRealTimeHOS } from '../hooks/useRealTimeHOS';

const MyComponent = () => {
  const {
    hosStatus,
    canDrive,
    hoursAvailable,
    isApproachingLimit,
    hasViolations,
    refresh
  } = useRealTimeHOS({
    autoRefresh: true,
    refreshInterval: 30000,
    enableWebSocket: true,
    enableNotifications: true,
    violationThreshold: 2
  });

  return (
    <div>
      <p>Can Drive: {canDrive ? 'Yes' : 'No'}</p>
      <p>Hours Available: {hoursAvailable.toFixed(1)}</p>
      {isApproachingLimit && <p>⚠️ Approaching HOS limit</p>}
    </div>
  );
};
```

### Real-time Trip Updates

```typescript
import { useRealTimeTrips } from '../hooks/useRealTimeTrips';

const MyComponent = () => {
  const {
    activeTrips,
    tripStats,
    hasOverdueTrips,
    hasCriticalAlerts,
    refresh
  } = useRealTimeTrips({
    autoRefresh: true,
    refreshInterval: 60000,
    enableWebSocket: true,
    enableNotifications: true,
    activeTripsOnly: true,
    enableDelayAlerts: true
  });

  return (
    <div>
      <p>Active Trips: {tripStats.active}</p>
      <p>Overdue: {tripStats.overdue}</p>
      {hasCriticalAlerts && <p>🚨 Critical alerts active</p>}
    </div>
  );
};
```

### Connection Status Monitoring

```typescript
import { useConnectionStatus } from '../hooks/useConnectionStatus';

const MyComponent = () => {
  const {
    isConnected,
    isConnecting,
    metrics,
    statusColor,
    uptimeFormatted,
    latencyFormatted
  } = useConnectionStatus({
    enableMetrics: true,
    updateInterval: 5000
  });

  return (
    <div className={`flex items-center space-x-2 ${statusColor}`}>
      <div>{isConnected ? '🟢' : '🔴'}</div>
      <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
      {isConnected && (
        <span className="text-sm text-gray-500">
          {uptimeFormatted} • {latencyFormatted}
        </span>
      )}
    </div>
  );
};
```

### Enhanced Notifications

```typescript
import notificationService from './services/notification';

// Show basic notification
notificationService.show({
  title: 'HOS Violation',
  message: 'Hours of Service violation detected',
  type: 'error',
  priority: 'urgent',
  category: 'hos_compliance',
  persistent: true,
  action: {
    label: 'View Details',
    callback: () => window.location.href = '/logs'
  }
});

// Show HOS violation with enhanced features
notificationService.showHOSViolation({
  violation_id: '123',
  violation_type: 'driving_time_exceeded',
  description: 'Exceeded 11-hour driving limit',
  severity: 'critical',
  requires_immediate_action: true
});

// Show trip update
notificationService.showTripUpdate({
  trip_id: 456,
  trip_name: 'Route 66 Delivery',
  status: 'completed'
});
```

### Secure WebSocket Channels

```typescript
import { createSecureWebSocketChannel } from './services/secureWebSocket';

const secureChannel = createSecureWebSocketChannel(
  {
    url: 'wss://api.trucklog.com/ws',
    reconnectInterval: 3000,
    maxReconnectAttempts: 5,
    heartbeatInterval: 30000,
    messageQueueSize: 100,
    secureChannels: true
  },
  {
    encryptionKey: 'base64-encoded-key',
    authenticationToken: 'jwt-token',
    channelPermissions: ['hos_updates', 'trip_updates'],
    maxMessageSize: 1024 * 1024, // 1MB
    messageTimeout: 30000 // 30 seconds
  }
);

// Connect and authenticate
await secureChannel.connect();

// Subscribe to secure channel
secureChannel.subscribe('hos_updates');

// Send encrypted message
await secureChannel.send({
  type: 'sensitive_data',
  data: { driverId: 123, location: 'confidential' }
});
```

## 🎨 UI Components

### ConnectionStatus Component

```typescript
import ConnectionStatus from '../components/ConnectionStatus';

// Simple status indicator
<ConnectionStatus showText={true} size="md" />

// Detailed status with metrics
<ConnectionStatus 
  variant="detailed" 
  showMetrics={true}
  size="lg"
/>

// Minimal indicator
<ConnectionStatus variant="minimal" size="sm" />
```

### NotificationCenter Component

```typescript
import NotificationCenter from '../components/NotificationCenter';

// Basic notification center
<NotificationCenter maxNotifications={10} />

// Enhanced with settings and filtering
<NotificationCenter 
  maxNotifications={20}
  showSettings={true}
  enableFiltering={true}
  enableSearch={true}
/>
```

### RealTimeDashboard Component

```typescript
import RealTimeDashboard from '../components/RealTimeDashboard';

// Complete real-time dashboard
<RealTimeDashboard 
  showSettings={true}
  className="p-6"
/>
```

## 🔧 Configuration

### Environment Variables

```env
# WebSocket Configuration
REACT_APP_WEBSOCKET_URL=wss://api.trucklog.com/ws

# Notification Settings
REACT_APP_NOTIFICATION_SOUND_ENABLED=true
REACT_APP_NOTIFICATION_VIBRATION_ENABLED=true

# Security Settings
REACT_APP_ENCRYPTION_KEY=your-base64-encryption-key
REACT_APP_AUTH_TOKEN=your-jwt-token
```

### WebSocket Configuration

```typescript
const config = {
  url: 'wss://api.trucklog.com/ws',
  reconnectInterval: 3000,        // 3 seconds
  maxReconnectAttempts: 5,        // 5 attempts
  heartbeatInterval: 30000,       // 30 seconds
  messageQueueSize: 100,          // 100 messages
  secureChannels: true            // Enable security
};
```

### Notification Configuration

```typescript
const notificationConfig = {
  maxNotifications: 50,           // Max stored notifications
  defaultDuration: 4000,          // 4 seconds
  soundEnabled: true,             // Enable sounds
  vibrationEnabled: true,         // Enable vibration
  browserNotifications: true      // Enable browser notifications
};
```

## 🚨 Error Handling

All services include comprehensive error handling:

- **Connection Errors**: Automatic reconnection with exponential backoff
- **Message Errors**: Queue failed messages for retry
- **Authentication Errors**: Clear error messages and re-authentication
- **Encryption Errors**: Fallback to unencrypted communication
- **Timeout Errors**: Automatic retry with configurable timeouts

## 📱 Mobile Support

- **Responsive Design**: All components work on mobile devices
- **Touch Interactions**: Optimized for touch interfaces
- **Vibration API**: Uses device vibration for notifications
- **Offline Support**: Queues messages when offline
- **Battery Optimization**: Efficient polling and connection management

## 🔒 Security Features

- **End-to-End Encryption**: All sensitive data is encrypted
- **Message Integrity**: HMAC signatures prevent tampering
- **Authentication**: JWT-based authentication
- **Channel Permissions**: Restrict access to specific channels
- **Rate Limiting**: Prevent message flooding
- **Input Validation**: Validate all incoming messages

## 🧪 Testing

```typescript
// Test WebSocket connection
import { renderHook } from '@testing-library/react';
import { useRealTimeHOS } from '../hooks/useRealTimeHOS';

test('should connect to WebSocket', async () => {
  const { result } = renderHook(() => useRealTimeHOS());
  
  await waitFor(() => {
    expect(result.current.isConnected).toBe(true);
  });
});

// Test notifications
import notificationService from '../services/notification';

test('should show notification', () => {
  const notification = notificationService.show({
    title: 'Test',
    message: 'Test message',
    type: 'info'
  });
  
  expect(notification).toBeDefined();
});
```

## 📊 Performance Monitoring

The services include built-in performance monitoring:

- **Connection Quality**: Monitor latency and stability
- **Message Throughput**: Track messages per second
- **Error Rates**: Monitor connection and message errors
- **Memory Usage**: Track notification and message queue sizes
- **Battery Impact**: Monitor polling frequency and efficiency

## 🔄 Migration Guide

### From Basic WebSocket to Enhanced Service

```typescript
// Old way
const ws = new WebSocket('ws://localhost:8000/ws');

// New way
import createWebSocketService from './services/websocket';
const wsService = createWebSocketService(userId);
await wsService.connect();
```

### From Basic Notifications to Enhanced Service

```typescript
// Old way
toast.success('Message sent');

// New way
import notificationService from './services/notification';
notificationService.show({
  title: 'Success',
  message: 'Message sent',
  type: 'success',
  priority: 'normal',
  category: 'general'
});
```

This comprehensive real-time system provides a robust foundation for live updates, notifications, and secure communication in the TruckLog application.
