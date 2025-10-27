/**
 * Secure WebSocket Channel Implementation
 * Provides encrypted and authenticated WebSocket communication
 */

import { EventEmitter } from 'events';
import { WebSocketMessage, WebSocketConfig } from './websocket';

export interface SecureChannelConfig {
  encryptionKey: string;
  authenticationToken: string;
  channelPermissions: string[];
  maxMessageSize: number;
  messageTimeout: number;
}

export interface EncryptedMessage {
  encrypted: string;
  iv: string;
  timestamp: number;
  signature: string;
}

export class SecureWebSocketChannel extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private secureConfig: SecureChannelConfig;
  private isConnected = false;
  private isAuthenticated = false;
  private messageQueue: WebSocketMessage[] = [];
  private encryptionKey: CryptoKey | null = null;
  private messageTimeouts = new Map<string, NodeJS.Timeout>();

  constructor(config: WebSocketConfig, secureConfig: SecureChannelConfig) {
    super();
    this.config = config;
    this.secureConfig = secureConfig;
  }

  /**
   * Initialize encryption key from base64 string
   */
  private async initializeEncryption(): Promise<void> {
    try {
      const keyData = Uint8Array.from(atob(this.secureConfig.encryptionKey), c => c.charCodeAt(0));
      this.encryptionKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt']
      );
    } catch (error) {
      console.error('Failed to initialize encryption key:', error);
      throw new Error('Encryption initialization failed');
    }
  }

  /**
   * Encrypt message using AES-GCM
   */
  private async encryptMessage(message: WebSocketMessage): Promise<EncryptedMessage> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }

    const messageString = JSON.stringify(message);
    const messageBytes = new TextEncoder().encode(messageString);
    
    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Encrypt message
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.encryptionKey,
      messageBytes
    );

    // Create signature for message integrity
    const signature = await this.createSignature(messageString);

    return {
      encrypted: btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(encrypted)))),
      iv: btoa(String.fromCharCode.apply(null, Array.from(iv))),
      timestamp: Date.now(),
      signature
    };
  }

  /**
   * Decrypt message using AES-GCM
   */
  private async decryptMessage(encryptedMessage: EncryptedMessage): Promise<WebSocketMessage> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }

    // Verify signature
    const encryptedMessageString = JSON.stringify(encryptedMessage);
    const isValidSignature = await this.verifySignature(encryptedMessageString, encryptedMessage.signature);
    if (!isValidSignature) {
      throw new Error('Invalid message signature');
    }

    // Decode encrypted data
    const encryptedBytes = Uint8Array.from(atob(encryptedMessage.encrypted), c => c.charCodeAt(0));
    const iv = Uint8Array.from(atob(encryptedMessage.iv), c => c.charCodeAt(0));

    // Decrypt message
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      this.encryptionKey,
      encryptedBytes
    );

    const decryptedMessageString = new TextDecoder().decode(decrypted);
    return JSON.parse(decryptedMessageString);
  }

  /**
   * Create HMAC signature for message integrity
   */
  private async createSignature(message: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(this.secureConfig.authenticationToken),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
    return btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(signature))));
  }

  /**
   * Verify HMAC signature
   */
  private async verifySignature(message: string, signature: string): Promise<boolean> {
    try {
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(this.secureConfig.authenticationToken),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['verify']
      );

      const signatureBytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
      return await crypto.subtle.verify('HMAC', key, signatureBytes, encoder.encode(message));
    } catch (error) {
      console.error('Signature verification failed:', error);
      return false;
    }
  }

  /**
   * Connect to secure WebSocket
   */
  async connect(): Promise<void> {
    if (this.isConnected) return;

    try {
      // Initialize encryption
      await this.initializeEncryption();

      // Connect to WebSocket
      this.ws = new WebSocket(this.config.url);

      this.ws.onopen = async () => {
        this.isConnected = true;
        this.emit('connected');
        
        // Authenticate with server
        await this.authenticate();
      };

      this.ws.onmessage = async (event) => {
        try {
          const encryptedMessage: EncryptedMessage = JSON.parse(event.data);
          const message = await this.decryptMessage(encryptedMessage);
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to decrypt message:', error);
          this.emit('error', new Error('Message decryption failed'));
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.isAuthenticated = false;
        this.emit('disconnected');
      };

      this.ws.onerror = (error) => {
        this.emit('error', error);
      };

    } catch (error) {
      console.error('Secure WebSocket connection failed:', error);
      throw error;
    }
  }

  /**
   * Authenticate with server
   */
  private async authenticate(): Promise<void> {
    const authMessage: WebSocketMessage = {
      type: 'authenticate',
      data: {
        token: this.secureConfig.authenticationToken,
        permissions: this.secureConfig.channelPermissions,
        timestamp: Date.now()
      }
    };

    await this.send(authMessage);
  }

  /**
   * Send encrypted message
   */
  async send(message: WebSocketMessage): Promise<boolean> {
    if (!this.isConnected || !this.isAuthenticated) {
      this.messageQueue.push(message);
      return false;
    }

    try {
      // Check message size
      const messageSize = JSON.stringify(message).length;
      if (messageSize > this.secureConfig.maxMessageSize) {
        throw new Error('Message too large');
      }

      // Encrypt message
      const encryptedMessage = await this.encryptMessage(message);
      
      // Send encrypted message
      this.ws!.send(JSON.stringify(encryptedMessage));

      // Set timeout for message acknowledgment
      const messageId = message.id || this.generateId();
      const timeout = setTimeout(() => {
        this.emit('messageTimeout', messageId);
        this.messageTimeouts.delete(messageId);
      }, this.secureConfig.messageTimeout);

      this.messageTimeouts.set(messageId, timeout);

      return true;
    } catch (error) {
      console.error('Failed to send encrypted message:', error);
      this.emit('error', error);
      return false;
    }
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(message: WebSocketMessage): void {
    // Clear message timeout if acknowledgment received
    if (message.type === 'ack' && message.data?.messageId) {
      const timeout = this.messageTimeouts.get(message.data.messageId);
      if (timeout) {
        clearTimeout(timeout);
        this.messageTimeouts.delete(message.data.messageId);
      }
    }

    // Emit message event
    this.emit('message', message);

    // Handle specific message types
    switch (message.type) {
      case 'auth_success':
        this.isAuthenticated = true;
        this.emit('authenticated');
        this.processQueuedMessages();
        break;
      case 'auth_failure':
        this.isAuthenticated = false;
        this.emit('authFailed', message.data);
        break;
      case 'permission_denied':
        this.emit('permissionDenied', message.data);
        break;
      default:
        // Emit channel-specific events
        if (message.channel) {
          this.emit(`channel:${message.channel}`, message);
        }
    }
  }

  /**
   * Process queued messages after authentication
   */
  private async processQueuedMessages(): Promise<void> {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        await this.send(message);
      }
    }
  }

  /**
   * Subscribe to secure channel
   */
  subscribe(channel: string): void {
    if (!this.secureConfig.channelPermissions.includes(channel)) {
      console.warn(`No permission to subscribe to channel: ${channel}`);
      return;
    }

    this.send({
      type: 'subscribe',
      data: { channel },
      channel
    });
  }

  /**
   * Unsubscribe from secure channel
   */
  unsubscribe(channel: string): void {
    this.send({
      type: 'unsubscribe',
      data: { channel },
      channel
    });
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.isConnected = false;
    this.isAuthenticated = false;
    this.messageQueue = [];
    
    // Clear all timeouts
    this.messageTimeouts.forEach(timeout => clearTimeout(timeout));
    this.messageTimeouts.clear();
  }

  /**
   * Get connection status
   */
  getStatus(): {
    isConnected: boolean;
    isAuthenticated: boolean;
    queuedMessages: number;
    activeTimeouts: number;
  } {
    return {
      isConnected: this.isConnected,
      isAuthenticated: this.isAuthenticated,
      queuedMessages: this.messageQueue.length,
      activeTimeouts: this.messageTimeouts.size
    };
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `secure-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Factory function for creating secure WebSocket channels
export const createSecureWebSocketChannel = (
  config: WebSocketConfig,
  secureConfig: SecureChannelConfig
): SecureWebSocketChannel => {
  return new SecureWebSocketChannel(config, secureConfig);
};

export default SecureWebSocketChannel;
