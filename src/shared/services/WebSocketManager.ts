// src/shared/services/WebSocketManager.ts

import notificationStorageService from './NotificationStorageService';

/**
 * Types of notifications that can be received
 */
export enum NotificationType {
  NEW_ORDER = 'new_order',
  ORDER_UPDATED = 'order_updated',
  LOW_STOCK = 'low_stock'
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
  private handlers: Map<NotificationType, Set<NotificationHandler>> = new Map();
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
  private maxReconnectDelay: number = 5000;
  private paginationParams: { page: number; perPage: number } = { page: 1, perPage: 10 };
  private subscriptions: Map<string, ChannelSubscription> = new Map();
  
  // Private constructor to enforce singleton pattern
  private constructor() {
    // Initialize handler sets for each notification type
    this.handlers.set(NotificationType.NEW_ORDER, new Set());
    this.handlers.set(NotificationType.ORDER_UPDATED, new Set());
    this.handlers.set(NotificationType.LOW_STOCK, new Set());
    
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
    console.debug('[WebSocketManager] Network online, attempting to reconnect');
    this.logConnectionEvent('Network online');
    
    // If we were previously initialized, try to reconnect
    if (this.isInitialized && this.restaurantId) {
      this.reconnect();
    }
  }
  
  /**
   * Handle network going offline
   */
  private handleNetworkOffline = () => {
    console.debug('[WebSocketManager] Network offline, connection may be disrupted');
    this.logConnectionEvent('Network offline');
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
      console.debug('[WebSocketManager] Already initialized for restaurant:', restaurantId);
      return;
    }
    
    console.debug('[WebSocketManager] Initializing for restaurant:', restaurantId);
    this.logConnectionEvent(`Initializing for restaurant: ${restaurantId}`);
    
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
      this.logConnectionEvent(`Connection error: ${typedError.message}`);
      this.updateConnectionStatus(ConnectionStatus.ERROR, typedError);
      this.scheduleReconnect();
    }
  }

  /**
   * Establish direct WebSocket connection
   */
  private connectWebSocket(): void {
    if (this.isConnecting) {
      console.debug('[WebSocketManager] Connection already in progress');
      return;
    }

    const now = Date.now();
    if (this.lastConnectionAttempt && (now - this.lastConnectionAttempt) < this.minReconnectDelay) {
      console.debug('[WebSocketManager] Connection attempt too soon, waiting');
      return;
    }

    this.isConnecting = true;
    this.lastConnectionAttempt = now;
    this.connectionStartTime = now;

    try {
      // Determine WebSocket URL
      const wsUrl = this.getWebSocketUrl();
      console.debug('[WebSocketManager] Connecting to WebSocket:', wsUrl);

      // Create WebSocket connection
      this.socket = new WebSocket(wsUrl);

      // Set up event handlers
      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onerror = this.handleError.bind(this);

    } catch (error) {
      this.isConnecting = false;
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
      const host = window.location.host;
      baseUrl = `${protocol}//${host}`;
    } else {
      // Default fallback
      baseUrl = 'ws://localhost:3000';
    }

    // Convert HTTP(S) to WS(S) if needed
    baseUrl = baseUrl.replace(/^https?:/, baseUrl.includes('https') ? 'wss:' : 'ws:');
    
    // Add cable path
    return `${baseUrl}/cable`;
  }

  /**
   * Handle WebSocket connection open
   */
  private handleOpen(): void {
    console.debug('[WebSocketManager] WebSocket connected');
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.logConnectionEvent('Connected successfully');
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
   * Handle WebSocket message
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      console.debug('[WebSocketManager] Received message:', data);

      // Handle different message types
      switch (data.type) {
        case 'ping':
          // Respond to ping with pong
          this.sendMessage({ type: 'pong' });
          break;
          
        case 'confirm_subscription':
          console.debug('[WebSocketManager] Subscription confirmed:', data.identifier);
          break;
          
        case 'new_order':
          this.handleNotification(NotificationType.NEW_ORDER, data.message);
          break;
          
        case 'order_updated':
          this.handleNotification(NotificationType.ORDER_UPDATED, data.message);
          break;
          
        case 'low_stock':
          this.handleNotification(NotificationType.LOW_STOCK, data.message);
          break;
          
        default:
          console.debug('[WebSocketManager] Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('[WebSocketManager] Error parsing message:', error);
    }
  }

  /**
   * Handle WebSocket connection close
   */
  private handleClose(event: CloseEvent): void {
    console.debug('[WebSocketManager] WebSocket closed:', event.code, event.reason);
    this.isConnecting = false;
    this.socket = null;
    this.logConnectionEvent(`Disconnected: ${event.code} ${event.reason}`);
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
    this.isConnecting = false;
    this.logConnectionEvent(`Error: ${error}`);
    this.updateConnectionStatus(ConnectionStatus.ERROR, new Error('WebSocket error'));
    this.scheduleReconnect();
  }

  /**
   * Send message to WebSocket
   */
  private sendMessage(message: any): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }

  /**
   * Subscribe to order channel
   */
  private subscribeToOrderChannel(): void {
    if (!this.restaurantId) return;
    
    const subscription = {
      command: 'subscribe',
      identifier: JSON.stringify({
        channel: 'OrderChannel',
        restaurant_id: this.restaurantId
      })
    };
    
    this.sendMessage(subscription);
    console.debug('[WebSocketManager] Subscribed to OrderChannel');
  }

  /**
   * Subscribe to inventory channel
   */
  private subscribeToInventoryChannel(): void {
    if (!this.restaurantId) return;
    
    const subscription = {
      command: 'subscribe',
      identifier: JSON.stringify({
        channel: 'InventoryChannel',
        restaurant_id: this.restaurantId
      })
    };
    
    this.sendMessage(subscription);
    console.debug('[WebSocketManager] Subscribed to InventoryChannel');
  }

  /**
   * Register a handler for a specific notification type
   * @param type The notification type to handle
   * @param handler The handler function
   */
  public registerHandler(type: NotificationType, handler: NotificationHandler): void {
    const handlers = this.handlers.get(type);
    if (handlers) {
      handlers.add(handler);
      console.debug(`[WebSocketManager] Registered handler for ${type}, total: ${handlers.size}`);
    }
  }
  
  /**
   * Unregister a handler for a specific notification type
   * @param type The notification type
   * @param handler The handler function to remove
   */
  public unregisterHandler(type: NotificationType, handler: NotificationHandler): void {
    const handlers = this.handlers.get(type);
    if (handlers) {
      handlers.delete(handler);
      console.debug(`[WebSocketManager] Unregistered handler for ${type}, remaining: ${handlers.size}`);
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
      console.debug(`[WebSocketManager] Skipping ${type} notification - not in admin context`);
      return;
    }
    
    // Generate a unique ID for the notification
    const notificationId = this.generateNotificationId(type, data);
    
    // Check if this notification has already been processed
    if (this.hasBeenDisplayed(notificationId)) {
      console.debug(`[WebSocketManager] Skipping duplicate notification: ${notificationId}`);
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
          console.debug(`[WebSocketManager] Low stock item ID: ${data.id}, checking if belongs to restaurant: ${this.restaurantId}`);
          
          // For direct menu item notifications, the item itself might be the data
          if (typeof data.stock_quantity !== 'undefined' || typeof data.low_stock_threshold !== 'undefined') {
            // This is likely a menu item object, check if it has a restaurant_id
            notificationRestaurantId = data.restaurant_id;
            console.debug(`[WebSocketManager] Direct menu item notification with restaurant_id: ${notificationRestaurantId}`);
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
        // In production, you might want to skip notifications without a restaurant_id
        // For safety, we'll assume this notification doesn't belong to the current restaurant
        console.debug(`[WebSocketManager] Skipping low stock notification without restaurant_id for safety`);
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
      console.debug(`[WebSocketManager] No handlers registered for ${type}`);
      return;
    }
    
    // Call all registered handlers
    console.debug(`[WebSocketManager] Distributing ${type} notification to ${handlers.size} handlers`);
    handlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`[WebSocketManager] Error in ${type} handler:`, error);
      }
    });
  }
  
  /**
   * Set the admin context flag
   * @param isAdmin Whether the current context is admin
   */
  public setAdminContext(isAdmin: boolean): void {
    console.debug(`[WebSocketManager] Setting admin context to: ${isAdmin}`);
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
    console.debug('[WebSocketManager] Fetching missed notifications');
    this.logConnectionEvent('Fetching missed notifications');
    
    // Skip fetching missed notifications if not in admin context
    if (!this.isAdminContext) {
      console.debug('[WebSocketManager] Skipping missed notifications - not in admin context');
      return;
    }
    
    try {
      // Fetch missed notifications from the storage service
      const missedNotifications = await notificationStorageService.fetchMissedNotifications();
      
      console.debug(`[WebSocketManager] Found ${missedNotifications.length} missed notifications`);
      
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
          default:
            console.debug(`[WebSocketManager] Unknown notification type: ${notification.notification_type}`);
            return;
        }
        
        if (notificationType !== null) {
          // Get the handlers for this notification type
          const handlers = this.handlers.get(notificationType);
          
          if (handlers && handlers.size > 0) {
            // Call each handler with the notification data
            handlers.forEach(handler => {
              try {
                // Convert the notification back to the format expected by the handlers
                const data = notification.metadata || notification;
                handler(data);
              } catch (error) {
                console.error(`[WebSocketManager] Error in missed notification handler:`, error);
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
      this.logConnectionEvent(`Error fetching missed notifications: ${typedError.message}`);
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
    
    console.debug(`[WebSocketManager] Externally registered notification: ${id}`);
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
    
    // Log any discrepancies for debugging
    if (internalStatus !== websocketStatus) {
      console.debug(`[WebSocketManager] Connection status mismatch: internal=${internalStatus}, websocket=${websocketStatus}`);
    }
    
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
      this.logConnectionEvent(`Maximum reconnection attempts (${this.maxReconnectAttempts}) reached`);
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
    this.logConnectionEvent(`Scheduling reconnection attempt ${this.reconnectAttempts} in ${Math.round(backoffWithJitter)}ms`);
    
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
      this.logConnectionEvent('Cannot reconnect: No restaurant ID');
      return;
    }
    
    console.debug(`[WebSocketManager] Attempting reconnection (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    this.logConnectionEvent(`Attempting reconnection (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
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
        this.logConnectionEvent('Connection check failed - WebSocket is disconnected');
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
   * Log connection events for debugging
   */
  private logConnectionEvent(event: string): void {
    const timestamp = new Date().toISOString();
    const duration = this.connectionStartTime 
      ? `${Math.round((Date.now() - this.connectionStartTime) / 1000)}s`
      : 'N/A';
    console.debug(`[WebSocketManager] [${timestamp}] [${duration}] ${event}`);
  }
  
  /**
   * Disconnect from the WebSocket
   */
  public disconnect(): void {
    console.debug('[WebSocketManager] Disconnecting');
    this.logConnectionEvent('Manual disconnect requested');
    
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
   */
  public updatePaginationParams(params: { page: number; perPage: number }): void {
    this.paginationParams = params;
  }
  
  /**
   * Subscribe to a channel (legacy compatibility)
   */
  public subscribe(subscription: ChannelSubscription): void {
    this.subscriptions.set(subscription.channel, subscription);
    console.debug(`[WebSocketManager] Subscribed to channel: ${subscription.channel}`);
  }
  
  /**
   * Unsubscribe from a channel (legacy compatibility)
   */
  public unsubscribe(channelName: string): void {
    this.subscriptions.delete(channelName);
    console.debug(`[WebSocketManager] Unsubscribed from channel: ${channelName}`);
  }
  
  /**
   * Cleanup all resources
   */
  public cleanup(): void {
    console.debug('[WebSocketManager] Cleaning up resources');
    
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
