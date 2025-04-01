// src/shared/services/websocketService.ts

// Add global type definition for window.authStore
declare global {
  interface Window {
    authStore?: {
      getState: () => { token?: string; auth_token?: string; };
    };
  }
}

// Define types for WebSocket messages
export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

// Define types for WebSocket callbacks
export interface WebSocketCallbacks {
  onNewOrder?: (order: any) => void;
  onOrderUpdated?: (order: any) => void;
  onLowStock?: (item: any) => void;
  onError?: (error: any) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

class WebSocketService {
  private socket: WebSocket | null = null;
  private callbacks: WebSocketCallbacks = {};
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isConnecting: boolean = false;
  private restaurantId: string | null = null;
  private isActive: boolean = false;
  private disconnectCaller: string = '';
  private connectionStartTime: number | null = null;
  private lastConnectionAttempt: number | null = null;
  private minReconnectDelay: number = 1000;
  private maxReconnectDelay: number = 5000;
  
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const connectionDuration = this.connectionStartTime
      ? `[${Math.round((Date.now() - this.connectionStartTime) / 1000)}s]`
      : '[Not connected]';
    const socketState = this.socket ?
      ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'][this.socket.readyState] :
      'NULL';
    
    const logMessage = `WebSocket ${level.toUpperCase()} ${timestamp} ${connectionDuration} [${socketState}] ${message}`;
    
    switch(level) {
      case 'debug':
        console.debug(logMessage, data ? data : '');
        break;
      case 'info':
        console.log(logMessage, data ? data : '');
        break;
      case 'warn':
        console.warn(logMessage, data ? data : '');
        break;
      case 'error':
        console.error(logMessage, data ? data : '');
        break;
    }
  }

  // Initialize the WebSocket connection
  public connect(restaurantId: string, callbacks: WebSocketCallbacks = {}): void {
    console.debug('[WebSocket] CONNECT CALLED - Starting connection process', {
      restaurantId,
      hasCallbacks: Object.keys(callbacks).length > 0,
      callbackTypes: Object.keys(callbacks)
    });
    const now = Date.now();
    
    // Check if we're already connecting
    if (this.isConnecting) {
      this.log('warn', 'Connection attempt already in progress', {
        restaurantId: this.restaurantId,
        timeSinceStart: this.connectionStartTime ? Math.round((now - this.connectionStartTime) / 1000) + 's' : 'N/A'
      });
      return;
    }

    // Check if we need to wait before attempting connection
    if (this.lastConnectionAttempt && (now - this.lastConnectionAttempt) < this.minReconnectDelay) {
      this.log('warn', 'Connection attempt too soon, waiting', {
        timeSinceLastAttempt: now - this.lastConnectionAttempt,
        minDelay: this.minReconnectDelay
      });
      return;
    }

    this.log('info', 'Initiating WebSocket connection', {
      restaurantId,
      attempt: this.reconnectAttempts + 1,
      maxAttempts: this.maxReconnectAttempts
    });

    this.isConnecting = true;
    this.setActive(true, 'connect');
    this.restaurantId = restaurantId;
    this.callbacks = callbacks;
    this.connectionStartTime = now;
    this.lastConnectionAttempt = now;

    // Try to get token from multiple possible sources
    let token: string | null = localStorage.getItem('auth_token') || localStorage.getItem('token');
    
    // If no token found, try to get it from the auth store
    if (!token && window.authStore) {
      const authState = window.authStore.getState();
      const storeToken = authState?.token || authState?.auth_token;
      if (storeToken) {
        token = storeToken;
        this.log('debug', `Successfully retrieved token from auth store`);
      } else {
        this.log('debug', 'Auth store exists but no token found');
      }
    }
    
    if (!token) {
      this.log('error', 'No auth token available for WebSocket authentication');
      this.handleError(new Error('No auth token available'));
      this.isConnecting = false;
      this.connectionStartTime = null;
      this.reconnectAttempts = this.maxReconnectAttempts;
      return;
    }
    
    // Log token info for debugging (safely)
    this.log('debug', `Token found with length: ${token.length}, first 3 chars: ${token.substring(0, 3)}...`);

    // Determine the WebSocket URL based on the environment
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // For development, always use localhost:3000 regardless of NODE_ENV
    const host = 'localhost:3000';
    
    // Get token without 'Bearer ' prefix if it exists
    const cleanToken = token.startsWith('Bearer ') ? token.substring(7) : token;
    
    // Add restaurant_id to the connection URL for better debugging
    const wsUrl = `${protocol}//${host}/cable?token=${cleanToken}&restaurant_id=${this.restaurantId}`;
    
    this.log('info', `WebSocket URL: ${wsUrl.replace(token, '[REDACTED]')}`, {
      protocol,
      host,
      env: process.env.NODE_ENV,
      restaurantId: this.restaurantId
    });

    try {
      this.log('info', `Connecting to WebSocket`, {
        url: wsUrl.replace(token, '[REDACTED]'),
        restaurantId: this.restaurantId,
        protocol: protocol,
        host: host,
        env: process.env.NODE_ENV
      });
      
      this.socket = new WebSocket(wsUrl);
      
      // Bind event handlers with additional context
      this.socket.onopen = () => {
        this.log('debug', 'WebSocket onopen event', {
          readyState: this.socket?.readyState,
          protocol: this.socket?.protocol,
          extensions: this.socket?.extensions
        });
        this.handleOpen();
      };
      
      this.socket.onmessage = (event) => {
        this.log('debug', 'WebSocket onmessage event', {
          dataType: typeof event.data,
          dataLength: event.data?.length
        });
        this.handleMessage(event);
      };
      
      this.socket.onclose = (event) => {
        this.log('debug', 'WebSocket onclose event', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean
        });
        this.handleClose(event);
      };
      
      this.socket.onerror = (event) => {
        this.log('debug', 'WebSocket onerror event', {
          type: event.type,
          error: event instanceof Error ? event.message : 'Unknown error'
        });
        this.handleError(event);
      };
      
      this.log('debug', 'WebSocket event handlers attached');
    } catch (error) {
      this.log('error', 'Failed to create WebSocket connection', error);
      this.handleError(error);
      this.isConnecting = false;
      this.connectionStartTime = null;
    }
  }

  // Handle WebSocket open event
  private handleOpen(): void {
    this.log('info', 'WebSocket connection established');
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    
    // Log socket details
    if (this.socket) {
      this.log('debug', 'Socket details', {
        protocol: this.socket.protocol,
        extensions: this.socket.extensions,
        bufferedAmount: this.socket.bufferedAmount
      });
    }
    
    this.log('debug', 'Subscribing to channels');
    this.subscribeToOrderChannel();
    this.subscribeToInventoryChannel();
    
    if (this.callbacks.onConnected) {
      this.log('debug', 'Executing onConnected callback');
      this.callbacks.onConnected();
    }
  }

  // Handle WebSocket message event
  private handleMessage(event: MessageEvent): void {
    try {
      this.log('debug', 'Received WebSocket message', { rawData: event.data });
      const data = JSON.parse(event.data);
      
      // Handle different message types
      // Handle ping/pong messages silently to avoid log noise
      if (data.type === 'ping' || data.type === 'pong') {
        // Only respond to ping messages
        if (data.type === 'ping' && this.socket?.readyState === WebSocket.OPEN) {
          this.socket.send(JSON.stringify({ type: 'pong' }));
        }
        return;
      }
      
      if (data.type === 'welcome') {
        this.log('info', 'Received welcome message from ActionCable');
        return;
      }
      
      if (data.type === 'confirm_subscription') {
        const identifier = JSON.parse(data.identifier);
        this.log('info', 'Subscription confirmed', {
          channel: identifier.channel,
          restaurant_id: identifier.restaurant_id
        });
        return;
      }
      
      if (data.type === 'reject_subscription') {
        const identifier = JSON.parse(data.identifier);
        this.log('error', 'Subscription rejected', {
          channel: identifier.channel,
          restaurant_id: identifier.restaurant_id,
          reason: data.reason
        });
        return;
      }
      
      // Handle actual messages
      if (data.message) {
        const message = data.message as WebSocketMessage;
        this.log('debug', 'Processing message', { type: message.type });
        
        switch (message.type) {
          case 'new_order':
            this.log('info', 'Received new order', {
              orderId: message.order?.id,
              items: message.order?.items?.length
            });
            if (this.callbacks.onNewOrder) {
              this.callbacks.onNewOrder(message.order);
            }
            break;
            
          case 'order_updated':
            this.log('info', 'Received order update', {
              orderId: message.order?.id,
              status: message.order?.status
            });
            if (this.callbacks.onOrderUpdated) {
              this.callbacks.onOrderUpdated(message.order);
            }
            break;
            
          case 'low_stock':
            this.log('info', 'Received low stock alert', {
              itemId: message.item?.id,
              quantity: message.item?.quantity
            });
            if (this.callbacks.onLowStock) {
              this.callbacks.onLowStock(message.item);
            }
            break;
            
          default:
            this.log('warn', 'Received unknown message type', { type: message.type });
        }
      }
    } catch (error) {
      this.log('error', 'Error parsing WebSocket message', {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : error,
        rawData: event.data
      });
    }
  }

  // Handle WebSocket close event
  private handleClose(event: CloseEvent): void {
    const duration = this.connectionStartTime
      ? Math.round((Date.now() - this.connectionStartTime) / 1000)
      : 0;
    
    this.log('info', `WebSocket connection closed`, {
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean,
      connectionDuration: `${duration}s`
    });
    
    this.isConnecting = false;
    this.connectionStartTime = null;
    
    if (this.callbacks.onDisconnected) {
      this.log('debug', 'Executing onDisconnected callback');
      this.callbacks.onDisconnected();
    }
    
    if (this.isActive) {
      this.log('info', 'Service is active, attempting reconnection');
      this.attemptReconnect();
    } else {
      this.log('info', 'Service is inactive, skipping reconnection');
    }
  }

  // Handle WebSocket error event
  private handleError(error: any): void {
    this.log('error', 'WebSocket error occurred', {
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error
    });
    
    if (this.callbacks.onError) {
      this.log('debug', 'Executing onError callback');
      this.callbacks.onError(error);
    }
  }

  // Attempt to reconnect to the WebSocket server
  private attemptReconnect(): void {
    // Don't attempt to reconnect if the service is not active
    if (!this.isActive) {
      this.log('debug', 'WebSocket service is not active, skipping reconnection');
      return;
    }

    // Check if we need to wait before attempting reconnection
    const now = Date.now();
    if (this.lastConnectionAttempt) {
      const timeSinceLastAttempt = now - this.lastConnectionAttempt;
      if (timeSinceLastAttempt < this.minReconnectDelay) {
        this.log('debug', 'Reconnection attempt too soon, waiting', {
          timeSinceLastAttempt,
          minDelay: this.minReconnectDelay
        });
        return;
      }
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.log('warn', 'Maximum reconnect attempts reached', {
        attempts: this.reconnectAttempts,
        max: this.maxReconnectAttempts
      });
      
      if (this.callbacks.onError) {
        this.callbacks.onError(new Error('Maximum WebSocket reconnection attempts reached'));
      }
      return;
    }
    
    this.reconnectAttempts++;
    this.lastConnectionAttempt = now;
    
    // Use exponential backoff with jitter
    const baseDelay = Math.min(
      this.maxReconnectDelay,
      this.minReconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1)
    );
    const jitter = Math.random() * 0.3 + 0.85; // Random between 0.85 and 1.15
    const delay = Math.round(baseDelay * jitter);
    
    this.log('info', 'Scheduling reconnection attempt', {
      baseDelay,
      actualDelay: delay,
      attempt: this.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts,
      timeSinceStart: this.connectionStartTime ? Math.round((now - this.connectionStartTime) / 1000) + 's' : 'N/A'
    });
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    this.reconnectTimer = setTimeout(() => {
      if (this.isActive && this.restaurantId) {
        this.connect(this.restaurantId, this.callbacks);
      }
    }, delay);
  }

  // Subscribe to the order channel
  private subscribeToOrderChannel(): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN || !this.restaurantId) {
      return;
    }
    
    const subscription = {
      command: 'subscribe',
      identifier: JSON.stringify({
        channel: 'OrderChannel',
        restaurant_id: this.restaurantId
      })
    };
    
    const subscriptionStr = JSON.stringify(subscription);
    this.log('debug', 'Sending subscription request', {
      channel: 'OrderChannel',
      restaurant_id: this.restaurantId
    });
    this.socket.send(subscriptionStr);
  }

  // Subscribe to the inventory channel
  private subscribeToInventoryChannel(): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN || !this.restaurantId) {
      return;
    }
    
    const subscription = {
      command: 'subscribe',
      identifier: JSON.stringify({
        channel: 'InventoryChannel',
        restaurant_id: this.restaurantId
      })
    };
    
    const subscriptionStr = JSON.stringify(subscription);
    this.log('debug', 'Sending subscription request', {
      channel: 'InventoryChannel',
      restaurant_id: this.restaurantId
    });
    this.socket.send(subscriptionStr);
  }

  // Disconnect from the WebSocket server
  private setActive(value: boolean, caller: string): void {
    this.log('info', `Setting isActive to ${value}`, {
      caller,
      previousValue: this.isActive,
      stackTrace: new Error().stack
    });
    this.isActive = value;
    this.disconnectCaller = caller;
  }

  public disconnect(caller: string = 'unknown'): void {
    this.log('info', 'Disconnect requested', {
      caller,
      isActive: this.isActive,
      hasSocket: !!this.socket,
      socketState: this.socket?.readyState
    });

    // Only set isActive to false for intentional disconnects
    if (caller !== 'cleanup') {
      this.setActive(false, `disconnect:${caller}`);
    } else {
      this.log('info', 'Cleanup disconnect - keeping service active');
    }
    
    if (this.socket) {
      this.log('info', 'Closing socket connection', {
        caller,
        readyState: this.socket.readyState,
        disconnectCaller: this.disconnectCaller,
        willReconnect: this.isActive
      });
      this.socket.close();
      this.socket = null;
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    this.isConnecting = false;
    this.restaurantId = null;
    this.reconnectAttempts = 0;
  }

  // Check if the WebSocket is connected
  public isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }
}

// Create a singleton instance
export const websocketService = new WebSocketService();

export default websocketService;