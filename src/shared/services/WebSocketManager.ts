// src/shared/services/WebSocketManager.ts

import notificationStorageService from './NotificationStorageService';

/**
 * Types of notifications that can be received
 */
export enum NotificationType {
  NEW_ORDER = 'new_order',
  ORDER_UPDATED = 'order_updated',
  LOW_STOCK = 'low_stock',
  OUT_OF_STOCK = 'out_of_stock' // RT-004: Add out of stock notification type
}

/**
 * Connection status enum
 */
export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}

/**
 * Interface for notification handlers
 */
export interface NotificationHandler {
  (data: any): void;
}

/**
 * Interface for handler registration with unique ID
 */
interface HandlerRegistration {
  id: string;
  handler: NotificationHandler;
  source?: string;
}

/**
 * Interface for connection status change handlers
 */
export interface ConnectionStatusHandler {
  (status: ConnectionStatus, error?: Error): void;
}

/**
 * Interface for notification registry entry
 */
interface NotificationRegistryEntry {
  id: string;
  timestamp: number;
  type: NotificationType;
  data: any;
}

/**
 * Interface for channel subscription (matching old websocketService interface)
 */
export interface ChannelSubscription {
  channel: string;
  received?: (data: any) => void;
  connected?: () => void;
  disconnected?: () => void;
  rejected?: (data?: any) => void;
  params?: Record<string, any>;
}

/**
 * WebSocketManager - A centralized service for managing WebSocket connections
 * and handling notifications to prevent duplicates. Now implements direct WebSocket connection.
 */
class WebSocketManager {
  private static instance: WebSocketManager;
  private isInitialized: boolean = false;
  private restaurantId: string | null = null;
  private connectionStatus: ConnectionStatus = ConnectionStatus.DISCONNECTED;
  private handlers: Map<NotificationType, Map<string, HandlerRegistration>> = new Map();
  private statusHandlers: Set<ConnectionStatusHandler> = new Set();
  private displayedNotifications: Map<string, NotificationRegistryEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isAdminContext: boolean = false;
  
  // Direct WebSocket connection properties
  private socket: WebSocket | null = null;
  private isConnecting: boolean = false;
  private connectionStartTime: number | null = null;
  private lastConnectionAttempt: number | null = null;
  private minReconnectDelay: number = 1000;
  // Used to calculate exponential backoff for reconnection attempts
  private baseReconnectDelay: number = 1000;
  private subscriptions: Map<string, ChannelSubscription> = new Map();
  
  // Private constructor to enforce singleton pattern
  private constructor() {
    // Initialize handler maps for each notification type
    this.handlers.set(NotificationType.NEW_ORDER, new Map());
    this.handlers.set(NotificationType.ORDER_UPDATED, new Map());
    this.handlers.set(NotificationType.LOW_STOCK, new Map());
    this.handlers.set(NotificationType.OUT_OF_STOCK, new Map()); // RT-004: Add out of stock handler map
    
    // Set up notification cleanup interval (every 5 minutes)
    this.cleanupInterval = setInterval(() => this.cleanupOldNotifications(), 5 * 60 * 1000);
    
    // Listen for window online/offline events to handle network changes
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleNetworkOnline);
      window.addEventListener('offline', this.handleNetworkOffline);
    }
  }
  
  /**
   * Handle network coming back online
   */
  private handleNetworkOnline = () => {
    // If we were previously initialized, try to reconnect
    if (this.isInitialized && this.restaurantId) {
      this.reconnect();
    }
  }
  
  /**
   * Handle network going offline
   */
  private handleNetworkOffline = () => {
    this.updateConnectionStatus(ConnectionStatus.ERROR, new Error('Network offline'));
  }
  
  /**
   * Get the singleton instance of WebSocketManager
   */
  public static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }
  
  /**
   * Initialize the WebSocket connection
   * @param restaurantId The restaurant ID to connect to
   */
  public initialize(restaurantId: string): void {
    if (this.isInitialized && this.restaurantId === restaurantId) {
      return;
    }
    
    // Reset reconnection attempts when initializing
    this.reconnectAttempts = 0;
    this.restaurantId = restaurantId;
    
    // Update connection status to connecting
    this.updateConnectionStatus(ConnectionStatus.CONNECTING);
    
    // Connect directly to WebSocket
    try {
      this.connectWebSocket();
      this.isInitialized = true;
    } catch (error) {
      const typedError = error instanceof Error ? error : new Error(String(error));
      console.error('[WebSocketManager] Error connecting to WebSocket:', typedError);
      this.updateConnectionStatus(ConnectionStatus.ERROR, typedError);
      this.scheduleReconnect();
    }
  }

  /**
   * Establish direct WebSocket connection
   */
  private connectWebSocket(): void {
    if (this.isConnecting) {
      return;
    }

    const now = Date.now();
    if (this.lastConnectionAttempt && (now - this.lastConnectionAttempt) < this.minReconnectDelay) {
      return;
    }

    // Pre-connection validation
    const token = localStorage.getItem('auth_token') || 
                  localStorage.getItem('token') ||
                  (window as any).authStore?.getState()?.token || '';
    
    const cleanToken = token.replace(/['"]/g, '').trim();
    
    if (!cleanToken) {
      const error = new Error('No authentication token available for WebSocket connection');
      console.error('[WebSocketManager] Pre-connection validation failed:', error.message);
      this.updateConnectionStatus(ConnectionStatus.ERROR, error);
      return;
    }
    
    if (!this.restaurantId) {
      const error = new Error('No restaurant ID available for WebSocket connection');
      console.error('[WebSocketManager] Pre-connection validation failed:', error.message);
      this.updateConnectionStatus(ConnectionStatus.ERROR, error);
      return;
    }

    this.isConnecting = true;
    this.lastConnectionAttempt = now;
    this.connectionStartTime = now;

    try {
      // Determine WebSocket URL
      const wsUrl = this.getWebSocketUrl();

      // Create WebSocket connection
      this.socket = new WebSocket(wsUrl);

      // Set up event handlers
      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onerror = this.handleError.bind(this);

    } catch (error) {
      console.error('[WebSocketManager] WebSocket creation failed:', error);
      this.isConnecting = false;
      this.updateConnectionStatus(ConnectionStatus.ERROR, error as Error);
      throw error;
    }
  }

  /**
   * Get WebSocket URL from environment or current location
   */
  private getWebSocketUrl(): string {
    // Try to get from environment variables
    let baseUrl = '';
    
    // Use type assertion to access custom ENV property safely
    if (typeof window !== 'undefined' && (window as any).ENV?.API_URL) {
      baseUrl = (window as any).ENV.API_URL;
    } else if (typeof window !== 'undefined') {
      // Fallback to current location
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      // For development setup, hardcode the Rails backend port (typically 3000)
      // instead of using the frontend dev server port (e.g. 5173)
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        baseUrl = `${protocol}//localhost:3000`;
      } else {
        const host = window.location.host;
        baseUrl = `${protocol}//${host}`;
      }
    } else {
      // Default fallback
      baseUrl = 'ws://localhost:3000';
    }

    // Convert HTTP(S) to WS(S) if needed
    baseUrl = baseUrl.replace(/^https?:/, baseUrl.includes('https') ? 'wss:' : 'ws:');
    
    // Get authentication token from localStorage or global state
    const token = localStorage.getItem('auth_token') || 
                  localStorage.getItem('token') ||
                  (window as any).authStore?.getState()?.token || '';

    // Clean token (remove any quotes or whitespace)
    const cleanToken = token.replace(/['"]/g, '').trim();
    
    if (!cleanToken) {
      console.error('[WebSocketManager] No authentication token found for WebSocket connection');
    }
    
    // Add cable path and authentication parameters
    const wsUrl = cleanToken && this.restaurantId 
      ? `${baseUrl}/cable?token=${encodeURIComponent(cleanToken)}&restaurant_id=${encodeURIComponent(this.restaurantId)}`
      : `${baseUrl}/cable`;
      
    return wsUrl;
  }

  /**
   * Handle WebSocket connection open
   */
  private handleOpen(): void {
    
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.updateConnectionStatus(ConnectionStatus.CONNECTED);
    
    // Subscribe to order and inventory channels
    this.subscribeToOrderChannel();
    this.subscribeToInventoryChannel();
    
    // Start heartbeat
    this.startHeartbeat();
    
    // Fetch missed notifications
    this.fetchMissedNotifications();
  }
  
  /**
   * Subscribe to order channel
   */
  private subscribeToOrderChannel(): void {
    if (!this.restaurantId) {
      console.error('[WebSocketManager] Cannot subscribe: no restaurant ID');
      return;
    }
    
    // Subscribe to frontend channel format
    const subscription = {
      command: 'subscribe',
      identifier: JSON.stringify({
        channel: 'OrderChannel',
        restaurant_id: this.restaurantId
      })
    };
    
    this.sendMessage(subscription);
    
    // Also subscribe to the backend broadcast format channel name
    const backendSubscription = {
      command: 'subscribe',
      identifier: JSON.stringify({
        channel: `order_channel_${this.restaurantId}`
      })
    };
    
    this.sendMessage(backendSubscription);
  }

  /**
   * Handle WebSocket message
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);

      // Handle ActionCable message format
      if (data.identifier && data.message) {
        // This is an ActionCable message - parse the identifier and message
        const identifier = JSON.parse(data.identifier);
        const message = data.message;
        
        if (identifier.channel === 'OrderChannel') {
          switch (message.type) {
            case 'new_order':
              this.handleNotification(NotificationType.NEW_ORDER, message.order);
              break;
              
            case 'order_updated':
              this.handleNotification(NotificationType.ORDER_UPDATED, message.order);
              break;
              
            default:
              console.debug('[WebSocketManager] Unknown OrderChannel message type:', message.type);
          }
        } else if (identifier.channel === 'InventoryChannel') {
          switch (message.type) {
            case 'low_stock':
              this.handleNotification(NotificationType.LOW_STOCK, message.item);
              break;
              
            default:
              console.debug('[WebSocketManager] Unknown InventoryChannel message type:', message.type);
          }
        }
      } else {
        // Handle non-ActionCable messages (ping/pong, confirmations, etc.)
        switch (data.type) {
          case 'ping':
            // Respond to ping with pong
            this.sendMessage({ type: 'pong' });
            break;
            
          case 'confirm_subscription':
            console.debug('[WebSocketManager] Subscription confirmed:', data.identifier);
            break;
            
          case 'welcome':
            console.debug('[WebSocketManager] WebSocket welcome message received');
            break;
        }
      }
    } catch (error) {
      console.error('[WebSocketManager] Error parsing message:', error);
    }
  }

  /**
   * Handle WebSocket connection close
   */
  private handleClose(event: CloseEvent): void {
    console.log('[WebSocketManager] WebSocket closed:', event.code, event.reason);
    
    this.isConnecting = false;
    this.socket = null;
    this.updateConnectionStatus(ConnectionStatus.DISCONNECTED);
    this.stopHeartbeat();
    
    // Attempt to reconnect unless it was a clean close
    if (event.code !== 1000) {
      this.scheduleReconnect();
    }
  }

  /**
   * Handle WebSocket error
   */
  private handleError(error: Event): void {
    console.error('[WebSocketManager] WebSocket error:', error);
    
    // Additional debugging information for common issues
    const token = localStorage.getItem('auth_token') || 
                  localStorage.getItem('token') ||
                  (window as any).authStore?.getState()?.token || '';
    const cleanToken = token.replace(/['"]/g, '').trim();
    
    if (!cleanToken) {
      console.error('[WebSocketManager] Missing authentication token');
    } else if (!this.restaurantId) {
      console.error('[WebSocketManager] Missing restaurant ID');
    } else if (!navigator.onLine) {
      console.error('[WebSocketManager] Network offline');
    }
    
    this.isConnecting = false;
    this.updateConnectionStatus(ConnectionStatus.ERROR, new Error('WebSocket error'));
    this.scheduleReconnect();
  }

  /**
   * Send message to WebSocket
   */
  private sendMessage(message: any): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else {
      console.warn('[WebSocketManager] Cannot send message - WebSocket not open');
    }
  }

  /**
   * Subscribe to inventory channel
   */
  private subscribeToInventoryChannel(): void {
    if (!this.restaurantId) {
      console.error('[WebSocketManager] Cannot subscribe: no restaurant ID');
      return;
    }
    
    // Subscribe to frontend channel format
    const subscription = {
      command: 'subscribe',
      identifier: JSON.stringify({
        channel: 'InventoryChannel',
        restaurant_id: this.restaurantId
      })
    };
    
    this.sendMessage(subscription);
    
    // Also subscribe to the backend broadcast format channel name
    const backendSubscription = {
      command: 'subscribe',
      identifier: JSON.stringify({
        channel: `inventory_channel_${this.restaurantId}`
      })
    };
    
    this.sendMessage(backendSubscription);
  }

  /**
   * Register a handler for a specific notification type
   * @param type The notification type to handle
   * @param handler The handler function
   * @param source Optional source identifier for debugging
   */
  public registerHandler(type: NotificationType, handler: NotificationHandler, source?: string): void {
    // Generate a unique ID for this handler registration
    const handlerId = `${source || 'unknown'}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    let handlers = this.handlers.get(type);
    if (!handlers) {
      handlers = new Map<string, HandlerRegistration>();
      this.handlers.set(type, handlers);
    }
    
    // Check if we already have too many handlers from the same source
    const sourceHandlers = Array.from(handlers.values()).filter(reg => reg.source === source);
    if (sourceHandlers.length >= 3) {
      console.warn(`[WebSocketManager] Too many handlers from source '${source}' for type ${type}. Removing oldest.`);
      // Remove the oldest handler from this source
      const oldestHandler = sourceHandlers[0];
      const oldestId = Array.from(handlers.entries()).find(([_, reg]) => reg === oldestHandler)?.[0];
      if (oldestId) {
        handlers.delete(oldestId);
      }
    }
    
    handlers.set(handlerId, {
      id: handlerId,
      handler,
      source
    });
    
    // Only warn if genuinely excessive (more than expected components)
    if (handlers.size > 15) {
      console.warn('[WebSocketManager] Unusually high handler count for type:', type, 'count:', handlers.size);
    }
  }
  
  /**
   * Unregister a handler for a specific notification type
   * @param type The notification type
   * @param handler The handler function to remove (or source to remove all handlers from that source)
   * @param source Optional source identifier to remove all handlers from that source
   */
  public unregisterHandler(type: NotificationType, handler?: NotificationHandler, source?: string): void {
    const handlers = this.handlers.get(type);
    if (!handlers) return;
    
    if (source) {
      // Remove all handlers from the specified source
      const toRemove: string[] = [];
      handlers.forEach((registration, id) => {
        if (registration.source === source) {
          toRemove.push(id);
        }
      });
      toRemove.forEach(id => handlers.delete(id));
    } else if (handler) {
      // Remove specific handler by finding matching function reference
      const toRemove: string[] = [];
      handlers.forEach((registration, id) => {
        if (registration.handler === handler) {
          toRemove.push(id);
        }
      });
      toRemove.forEach(id => handlers.delete(id));
    }
  }
  
  /**
   * Handle a notification and distribute it to registered handlers
   * @param type The notification type
   * @param data The notification data
   */
  private handleNotification(type: NotificationType, data: any): void {
    // Skip order and low stock notifications if not in admin context
    if (!this.isAdminContext && 
        (type === NotificationType.NEW_ORDER || 
         type === NotificationType.ORDER_UPDATED || 
         type === NotificationType.LOW_STOCK)) {
      return;
    }
    
    // Generate a unique ID for the notification
    const notificationId = this.generateNotificationId(type, data);
    
    // Check if this notification has already been processed
    if (this.hasBeenDisplayed(notificationId)) {
      return;
    }
    
    // TENANT ISOLATION: Validate that the notification belongs to the current restaurant
    if (this.restaurantId && data) {
      let notificationRestaurantId;
      
      // Handle different notification types differently
      if (type === NotificationType.LOW_STOCK) {
        // For low stock notifications, check restaurant_id in multiple possible locations
        notificationRestaurantId = data.restaurant_id || 
                                  (data.menu_item && data.menu_item.restaurant_id) || 
                                  (data.metadata && data.metadata.restaurant_id) ||
                                  (data.id && data.id.toString().includes('_') && data.id.toString().split('_')[0]);
        
        // If it's a menu item with ID, check if it belongs to this restaurant
        if (!notificationRestaurantId && data.id) {
          // For direct menu item notifications, the item itself might be the data
          if (typeof data.stock_quantity !== 'undefined' || typeof data.low_stock_threshold !== 'undefined') {
            // This is likely a menu item object, check if it has a restaurant_id
            notificationRestaurantId = data.restaurant_id;
          }
        }
      } else {
        // For other notifications (orders, etc.)
        notificationRestaurantId = data.restaurant_id || 
                                  (data.metadata && data.metadata.restaurant_id);
      }
      
      // If the notification has a restaurant_id and it doesn't match our current restaurant,
      // ignore the notification to maintain tenant isolation
      if (notificationRestaurantId && String(notificationRestaurantId) !== String(this.restaurantId)) {
        console.debug(`[WebSocketManager] Ignoring ${type} notification for different restaurant: ${notificationRestaurantId} (current: ${this.restaurantId})`);
        return;
      }
      
      // If we couldn't determine the restaurant_id for a low stock notification, log it and be cautious
      if (type === NotificationType.LOW_STOCK && !notificationRestaurantId) {
        console.warn(`[WebSocketManager] Could not determine restaurant_id for low stock notification:`, data);
        return;
      }
    }
    
    // Mark this notification as displayed
    this.markAsDisplayed(notificationId, type, data);
    
    // Store the notification in the NotificationStorageService
    if (data && (data.id || (data.metadata && data.metadata.id))) {
      // Convert WebSocket notification to the format expected by NotificationStorageService
      const notificationId = data.id || (data.metadata && data.metadata.id);
      const notification = {
        id: notificationId,
        title: data.title || `New ${type} notification`,
        body: data.body || '',
        notification_type: type.toString(),
        resource_type: data.resource_type || '',
        resource_id: data.resource_id || notificationId,
        admin_path: data.admin_path || '',
        acknowledged: false,
        created_at: data.created_at || new Date().toISOString(),
        updated_at: data.updated_at || new Date().toISOString(),
        metadata: data.metadata || data
      };
      
      notificationStorageService.addNotification(notification);
    }
    
    // Get handlers for this notification type
    const handlers = this.handlers.get(type);
    if (!handlers || handlers.size === 0) {
      console.debug('[WebSocketManager] No handlers registered for', type);
      return;
    }
    
    // Call all registered handlers
    handlers.forEach(registration => {
      try {
        registration.handler(data);
      } catch (error) {
        console.error('[WebSocketManager] Error in handler:', error);
      }
    });
  }
  
  /**
   * Set the admin context flag
   * @param isAdmin Whether the current context is admin
   */
  public setAdminContext(isAdmin: boolean): void {
    this.isAdminContext = isAdmin;
  }

  /**
   * Get the current admin context
   * @returns Whether the current context is admin
   */
  public getAdminContext(): boolean {
    return this.isAdminContext;
  }

  /**
   * Fetch missed notifications since last connection
   */
  private async fetchMissedNotifications(): Promise<void> {
    // Skip fetching missed notifications if not in admin context
    if (!this.isAdminContext) {
      return;
    }
    
    try {
      // Fetch missed notifications from the storage service
      const missedNotifications = await notificationStorageService.fetchMissedNotifications();
      
      // Process each missed notification
      missedNotifications.forEach(notification => {
        // Skip notifications that have been acknowledged
        if (notification.acknowledged || notification.acknowledgedLocally) {
          return;
        }
        
        // Determine the notification type
        let notificationType: NotificationType | null = null;
        
        switch (notification.notification_type) {
          case 'new_order':
          case NotificationType.NEW_ORDER.toString():
            notificationType = NotificationType.NEW_ORDER;
            break;
          case 'order_updated':
          case NotificationType.ORDER_UPDATED.toString():
            notificationType = NotificationType.ORDER_UPDATED;
            break;
          case 'low_stock':
          case NotificationType.LOW_STOCK.toString():
            notificationType = NotificationType.LOW_STOCK;
            break;
        }
        
        if (notificationType !== null) {
          // Get the handlers for this notification type
          const handlers = this.handlers.get(notificationType);
          
          if (handlers && handlers.size > 0) {
            // Call each handler with the notification data
            handlers.forEach(registration => {
              try {
                // Convert the notification back to the format expected by the handlers
                const data = notification.metadata || notification;
                registration.handler(data);
              } catch (error) {
                console.error('[WebSocketManager] Error in missed notification handler:', error);
              }
            });
          }
        }
      });
      
      // Sync any pending acknowledgments with the server
      await notificationStorageService.syncWithServer();
      
    } catch (error) {
      const typedError = error instanceof Error ? error : new Error(String(error));
      console.error('[WebSocketManager] Error fetching missed notifications:', typedError);
    }
  }
  
  /**
   * Generate a unique ID for a notification
   * @param type The notification type
   * @param data The notification data
   * @returns A unique ID string
   */
  private generateNotificationId(type: NotificationType, data: any): string {
    switch (type) {
      case NotificationType.NEW_ORDER:
      case NotificationType.ORDER_UPDATED:
        return `${type}_${data.id}`;
      case NotificationType.LOW_STOCK:
        return `${type}_${data.id}_${data.quantity || 0}`;
      default:
        return `${type}_${Date.now()}`;
    }
  }
  
  /**
   * Check if a notification has already been displayed (internal method)
   * @param id The notification ID
   * @returns True if the notification has been displayed
   */
  private hasBeenDisplayed(id: string): boolean {
    return this.displayedNotifications.has(id);
  }
  
  /**
   * Mark a notification as displayed (internal method)
   * @param id The notification ID
   * @param type The notification type
   * @param data The notification data
   */
  private markAsDisplayed(id: string, type: NotificationType, data: any): void {
    this.displayedNotifications.set(id, {
      id,
      timestamp: Date.now(),
      type,
      data
    });
  }
  
  /**
   * Public method to check if a notification has already been displayed
   * This can be used by components to check for duplicates
   * @param id The notification ID
   * @returns True if the notification has been displayed
   */
  public hasNotificationBeenDisplayed(id: string): boolean {
    return this.displayedNotifications.has(id);
  }
  
  /**
   * Public method to mark a notification as displayed
   * This can be used by components to register displayed notifications
   * @param id The notification ID
   * @param data Optional data to associate with the notification
   */
  public markNotificationAsDisplayed(id: string, data: any = null): void {
    // Use a generic type for external registrations
    const type = NotificationType.NEW_ORDER; // Default to NEW_ORDER type
    
    this.displayedNotifications.set(id, {
      id,
      timestamp: Date.now(),
      type,
      data
    });
  }
  
  /**
   * Clean up old notifications (older than 1 hour)
   */
  private cleanupOldNotifications(): void {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    let removedCount = 0;
    this.displayedNotifications.forEach((entry, id) => {
      if (now - entry.timestamp > oneHour) {
        this.displayedNotifications.delete(id);
        removedCount++;
      }
    });
    
    if (removedCount > 0) {
      console.debug(`[WebSocketManager] Cleaned up ${removedCount} old notifications`);
    }
  }
  
  /**
   * Check if the WebSocket is connected
   * @returns True if connected
   */
  public isConnected(): boolean {
    // Check both our internal status and the actual websocket connection
    const internalStatus = this.connectionStatus === ConnectionStatus.CONNECTED;
    const websocketStatus = this.socket !== null && this.socket.readyState === WebSocket.OPEN;
    
    // Use the most conservative approach - only report connected if both agree
    return internalStatus && websocketStatus;
  }
  
  /**
   * Get the current connection status
   * @returns The current connection status
   */
  public getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }
  
  /**
   * Get detailed connection information for troubleshooting
   * @returns Detailed connection information
   */
  public getConnectionInfo(): {
    status: ConnectionStatus;
    isConnected: boolean;
    reconnectAttempts: number;
    maxReconnectAttempts: number;
    restaurantId: string | null;
    isAdminContext: boolean;
    handlerCounts: Record<string, number>;
    lastError?: string;
  } {
    const handlerCounts: Record<string, number> = {};
    Object.values(NotificationType).forEach(type => {
      const handlers = this.handlers.get(type);
      handlerCounts[type] = handlers ? handlers.size : 0;
    });
    
    return {
      status: this.connectionStatus,
      isConnected: this.isConnected(),
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      restaurantId: this.restaurantId,
      isAdminContext: this.isAdminContext,
      handlerCounts,
      lastError: this.socket?.readyState === WebSocket.CLOSED ? 'WebSocket closed' : undefined
    };
  }
  
  /**
   * Force an immediate reconnection attempt (useful for debugging)
   * @returns Promise that resolves when reconnection attempt is complete
   */
  public async forceReconnect(): Promise<boolean> {
    console.debug('[WebSocketManager] Force reconnection requested');
    
    if (!this.restaurantId) {
      console.error('[WebSocketManager] Cannot force reconnect: No restaurant ID');
      return false;
    }
    
    // Disconnect current connection if exists
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    // Clear any pending reconnection attempts
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    // Reset reconnection attempts
    this.reconnectAttempts = 0;
    
    // Attempt immediate reconnection
    this.updateConnectionStatus(ConnectionStatus.CONNECTING);
    
    try {
      this.connectWebSocket();
      
      // Wait briefly to see if connection succeeds
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const isConnected = this.isConnected();
      console.debug(`[WebSocketManager] Force reconnection ${isConnected ? 'successful' : 'failed'}`);
      return isConnected;
    } catch (error) {
      console.error('[WebSocketManager] Force reconnection failed:', error);
      return false;
    }
  }
  
  /**
   * Register a handler for connection status changes
   * @param handler The handler function to call when connection status changes
   */
  public registerStatusHandler(handler: ConnectionStatusHandler): void {
    this.statusHandlers.add(handler);
    
    // Immediately call the handler with the current status
    try {
      handler(this.connectionStatus);
    } catch (error) {
      console.error('[WebSocketManager] Error in status handler:', error);
    }
  }
  
  /**
   * Unregister a handler for connection status changes
   * @param handler The handler function to remove
   */
  public unregisterStatusHandler(handler: ConnectionStatusHandler): void {
    this.statusHandlers.delete(handler);
  }
  
  /**
   * Update the connection status and notify handlers
   * @param status The new connection status
   * @param error Optional error object
   */
  private updateConnectionStatus(status: ConnectionStatus, error?: Error): void {
    if (this.connectionStatus === status) return; // No change
    
    this.connectionStatus = status;
    
    // Notify all status handlers
    this.statusHandlers.forEach(handler => {
      try {
        handler(status, error);
      } catch (handlerError) {
        console.error('[WebSocketManager] Error in status handler:', handlerError);
      }
    });
  }
  
  /**
   * Schedule a reconnection attempt with exponential backoff
   */
  private scheduleReconnect(): void {
    // Clear any existing reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    // Check if we've exceeded the maximum number of reconnection attempts
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`[WebSocketManager] Maximum reconnection attempts (${this.maxReconnectAttempts}) reached`);
      this.updateConnectionStatus(ConnectionStatus.ERROR, new Error('Maximum reconnection attempts reached'));
      return;
    }
    
    // Calculate backoff time with exponential increase and jitter
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    const exponentialBackoff = Math.min(
      maxDelay,
      baseDelay * Math.pow(2, this.reconnectAttempts)
    );
    
    // Add jitter (±20%) to prevent reconnection storms
    const jitter = 0.2;
    const jitterRange = exponentialBackoff * jitter;
    const backoffWithJitter = exponentialBackoff + (Math.random() * jitterRange * 2) - jitterRange;
    
    // Increment reconnection attempts
    this.reconnectAttempts++;
    
    console.debug(`[WebSocketManager] Scheduling reconnection attempt ${this.reconnectAttempts} in ${Math.round(backoffWithJitter)}ms`);
    
    // Update status to reconnecting
    this.updateConnectionStatus(ConnectionStatus.RECONNECTING);
    
    // Schedule reconnection
    this.reconnectTimeout = setTimeout(() => this.reconnect(), backoffWithJitter);
  }
  
  /**
   * Attempt to reconnect to the WebSocket
   */
  private reconnect(): void {
    if (!this.restaurantId) {
      console.error('[WebSocketManager] Cannot reconnect: No restaurant ID');
      return;
    }
    
    console.debug(`[WebSocketManager] Attempting reconnection (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    // Reinitialize the connection
    this.initialize(this.restaurantId);
  }
  
  /**
   * Start the heartbeat mechanism to detect dead connections
   */
  private startHeartbeat(): void {
    // Clear any existing heartbeat interval
    this.stopHeartbeat();
    
    // Send a ping every 30 seconds to maintain connection
    this.heartbeatInterval = setInterval(() => {
      // Check if the WebSocket is still connected
      if (!this.isConnected()) {
        console.error('[WebSocketManager] Connection check failed - WebSocket is disconnected');
        this.updateConnectionStatus(ConnectionStatus.ERROR, new Error('Heartbeat failed'));
        this.scheduleReconnect();
      } else {
        // Send ping to keep connection alive
        this.sendMessage({ type: 'ping' });
      }
    }, 30000); // 30 seconds
  }
  
  /**
   * Stop the heartbeat mechanism
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
  
  /**
   * Disconnect from the WebSocket
   */
  public disconnect(): void {
    console.debug('[WebSocketManager] Disconnecting');
    
    // Clear intervals and timeouts
    this.stopHeartbeat();
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    // Disconnect from the WebSocket
    try {
      this.socket?.close();
    } catch (error) {
      const typedError = error instanceof Error ? error : new Error(String(error));
      console.error('[WebSocketManager] Error during disconnect:', typedError);
    }
    
    // Update status
    this.updateConnectionStatus(ConnectionStatus.DISCONNECTED);
    
    // Reset state
    this.isInitialized = false;
    this.isConnecting = false;
    this.socket = null;
    this.reconnectAttempts = 0;
  }

  /**
   * Update pagination parameters (legacy compatibility)
   * 
   * Note: Pagination parameters are now handled through ActionCable subscriptions
   * directly and don't need to be stored in the WebSocketManager.
   */
  public updatePaginationParams(params: { page: number; perPage: number }): void {
    // No-op - pagination parameters are now handled in subscription payloads
    console.debug('[WebSocketManager] Pagination params received:', params);
    // Instead of storing, we could update existing subscriptions if needed
  }
  
  /**
   * Subscribe to a channel (legacy compatibility)
   */
  public subscribe(subscription: ChannelSubscription): void {
    this.subscriptions.set(subscription.channel, subscription);
  }
  
  /**
   * Unsubscribe from a channel (legacy compatibility)
   */
  public unsubscribe(channelName: string): void {
    this.subscriptions.delete(channelName);
  }
  
  /**
   * Cleanup all resources
   */
  public cleanup(): void {
    // Disconnect
    this.disconnect();
    
    // Clear handlers
    this.handlers.clear();
    this.statusHandlers.clear();
    this.displayedNotifications.clear();
    this.subscriptions.clear();
    
    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    // Remove event listeners
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleNetworkOnline);
      window.removeEventListener('offline', this.handleNetworkOffline);
    }
  }
}

// Export the singleton instance
export const webSocketManager = WebSocketManager.getInstance();

export default webSocketManager;
