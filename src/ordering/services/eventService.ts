import { createConsumer } from '@rails/actioncable';
import { Order } from '../types/order';
import { MenuItem } from '../types/menu';

// Define event types as constants
export const EVENT_TYPES = {
  ORDER_CREATED: 'order.created',
  ORDER_UPDATED: 'order.updated',
  ORDER_STATUS_CHANGED: 'order.status_changed',
  INVENTORY_UPDATED: 'inventory.updated',
  INVENTORY_LOW_STOCK: 'inventory.low_stock',
  MENU_ITEM_UPDATED: 'menu_item.updated',
  RESTAURANT_UPDATED: 'restaurant.updated'
};

// Type for subscription handler
export type SubscriptionHandler = {
  unsubscribe: () => void;
};

export class EventService {
  private consumer: any;
  private subscription: any;
  private callbacks: Map<string, Set<(data: any) => void>> = new Map();
  private connectionStatus: 'connected' | 'disconnected' | 'connecting' = 'disconnected';
  
  constructor() {
    // Create the Action Cable consumer
    this.consumer = createConsumer('/cable');
  }
  
  // Subscribe to events for a restaurant
  public subscribeToRestaurant(restaurantId: string) {
    if (this.subscription) {
      console.warn('[EventService] Already subscribed, unsubscribing first');
      this.unsubscribe();
    }
    
    this.connectionStatus = 'connecting';
    
    this.subscription = this.consumer.subscriptions.create(
      {
        channel: 'RestaurantEventsChannel',
        restaurant_id: restaurantId
      },
      {
        connected: () => {
          console.log(`[EventService] Connected to restaurant events: ${restaurantId}`);
          this.connectionStatus = 'connected';
        },
        
        disconnected: () => {
          console.log(`[EventService] Disconnected from restaurant events`);
          this.connectionStatus = 'disconnected';
        },
        
        received: (event: { type: string, data: any }) => {
          this.handleEvent(event);
        }
      }
    );
    
    return this;
  }
  
  // Subscribe to a specific event type
  public subscribe(eventType: string, callback: (data: any) => void): SubscriptionHandler {
    if (!this.callbacks.has(eventType)) {
      this.callbacks.set(eventType, new Set());
    }
    
    this.callbacks.get(eventType)?.add(callback);
    
    return {
      unsubscribe: () => {
        const callbacks = this.callbacks.get(eventType);
        if (callbacks) {
          callbacks.delete(callback);
        }
      }
    };
  }
  
  // Unsubscribe from all events
  public unsubscribe() {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
    
    this.callbacks.clear();
    this.connectionStatus = 'disconnected';
  }
  
  // Get connection status
  public getConnectionStatus() {
    return this.connectionStatus;
  }
  
  // Handle incoming events
  private handleEvent(event: { type: string, data: any }) {
    console.log(`[EventService] Received event: ${event.type}`, event.data);
    
    // Find all callbacks for this event type
    const callbacks = this.callbacks.get(event.type);
    if (callbacks && callbacks.size > 0) {
      callbacks.forEach(callback => {
        try {
          callback(event.data);
        } catch (error) {
          console.error(`[EventService] Error in event handler for ${event.type}:`, error);
        }
      });
    } else {
      console.log(`[EventService] No handlers registered for event type: ${event.type}`);
    }
  }
  
  // For backward compatibility with the old API
  public subscribeWithCallbacks(restaurantId: string, callbacks: {
    onOrderCreated?: (order: Order) => void;
    onOrderUpdated?: (order: Order) => void;
    onOrderStatusChanged?: (data: { id: number, status: string, previous_status: string }) => void;
    onInventoryLowStock?: (item: MenuItem) => void;
    [key: string]: ((data: any) => void) | undefined;
  }) {
    this.subscribeToRestaurant(restaurantId);
    
    // Map callback names to event types
    const callbackToEventType: Record<string, string> = {
      'onOrderCreated': EVENT_TYPES.ORDER_CREATED,
      'onOrderUpdated': EVENT_TYPES.ORDER_UPDATED,
      'onOrderStatusChanged': EVENT_TYPES.ORDER_STATUS_CHANGED,
      'onInventoryLowStock': EVENT_TYPES.INVENTORY_LOW_STOCK
    };
    
    // Register each callback
    Object.entries(callbacks).forEach(([callbackName, callback]) => {
      if (callback && callbackToEventType[callbackName]) {
        this.subscribe(callbackToEventType[callbackName], callback);
      }
    });
    
    return this;
  }
}

// Export a singleton instance
export const eventService = new EventService();
