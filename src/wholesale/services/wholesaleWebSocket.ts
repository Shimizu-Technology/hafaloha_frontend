// src/wholesale/services/wholesaleWebSocket.ts
import webSocketManager, { NotificationType as BaseNotificationType } from '../../shared/services/WebSocketManager';

// Extend base notification types with wholesale-specific ones
export enum WholesaleNotificationType {
  // Existing base types
  NEW_ORDER = 'new_order',
  ORDER_UPDATED = 'order_updated',
  LOW_STOCK = 'low_stock',
  OUT_OF_STOCK = 'out_of_stock',
  
  // Wholesale-specific types
  WHOLESALE_NEW_ORDER = 'wholesale_new_order',
  WHOLESALE_ORDER_UPDATED = 'wholesale_order_updated',
  WHOLESALE_ITEM_STOCK_UPDATED = 'wholesale_item_stock_updated',
  WHOLESALE_FUNDRAISER_UPDATED = 'wholesale_fundraiser_updated',
  WHOLESALE_PARTICIPANT_GOAL_UPDATED = 'wholesale_participant_goal_updated'
}

export interface WholesaleOrderUpdate {
  id: number;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  customerName: string;
  customerEmail: string;
  fundraiser: {
    id: number;
    name: string;
    slug: string;
  };
  participant?: {
    id: number;
    name: string;
  };
  total: number;
  totalCents: number;
  updatedAt: string;
}

export interface WholesaleItemStockUpdate {
  id: number;
  name: string;
  sku?: string;
  stockQuantity?: number;
  inStock: boolean;
  stockStatus: string;
  fundraiser: {
    id: number;
    name: string;
    slug: string;
  };
}

export interface WholesaleFundraiserUpdate {
  id: number;
  name: string;
  slug: string;
  status: string;
  totalOrders: number;
  totalRevenue: number;
  participantCount: number;
  itemCount: number;
}

export interface WholesaleParticipantGoalUpdate {
  id: number;
  name: string;
  slug: string;
  currentAmount: number;
  goalAmount?: number;
  goalProgressPercentage?: number;
  totalOrders: number;
  fundraiser: {
    id: number;
    name: string;
    slug: string;
  };
}

export type WholesaleNotificationHandler<T = any> = (data: T) => void;

class WholesaleWebSocketService {
  private readonly sourceId = 'wholesale';

  /**
   * Initialize WebSocket connection for wholesale updates
   */
  initialize(restaurantId: string): boolean {
    try {
      // Initialize the main WebSocket manager if needed
      webSocketManager.initialize(restaurantId);
      return webSocketManager.isConnected();
    } catch (error) {
      console.error('[WholesaleWebSocket] Failed to initialize:', error);
      return false;
    }
  }

  /**
   * Subscribe to wholesale order updates
   */
  subscribeToOrders(handler: WholesaleNotificationHandler<WholesaleOrderUpdate>): void {
    webSocketManager.registerHandler(
      WholesaleNotificationType.WHOLESALE_NEW_ORDER as any, 
      handler, 
      `${this.sourceId}_new_order`
    );
    webSocketManager.registerHandler(
      WholesaleNotificationType.WHOLESALE_ORDER_UPDATED as any, 
      handler, 
      `${this.sourceId}_order_updated`
    );
  }

  /**
   * Unsubscribe from wholesale order updates
   */
  unsubscribeFromOrders(): void {
    webSocketManager.unregisterHandler(
      WholesaleNotificationType.WHOLESALE_NEW_ORDER as any, 
      undefined, 
      `${this.sourceId}_new_order`
    );
    webSocketManager.unregisterHandler(
      WholesaleNotificationType.WHOLESALE_ORDER_UPDATED as any, 
      undefined, 
      `${this.sourceId}_order_updated`
    );
  }

  /**
   * Subscribe to wholesale inventory updates
   */
  subscribeToInventory(handler: WholesaleNotificationHandler<WholesaleItemStockUpdate>): void {
    webSocketManager.registerHandler(
      WholesaleNotificationType.WHOLESALE_ITEM_STOCK_UPDATED as any, 
      handler, 
      `${this.sourceId}_inventory`
    );
  }

  /**
   * Unsubscribe from wholesale inventory updates
   */
  unsubscribeFromInventory(): void {
    webSocketManager.unregisterHandler(
      WholesaleNotificationType.WHOLESALE_ITEM_STOCK_UPDATED as any, 
      undefined, 
      `${this.sourceId}_inventory`
    );
  }

  /**
   * Subscribe to fundraiser updates
   */
  subscribeToFundraisers(handler: WholesaleNotificationHandler<WholesaleFundraiserUpdate>): void {
    webSocketManager.registerHandler(
      WholesaleNotificationType.WHOLESALE_FUNDRAISER_UPDATED as any, 
      handler, 
      `${this.sourceId}_fundraiser`
    );
  }

  /**
   * Unsubscribe from fundraiser updates
   */
  unsubscribeFromFundraisers(): void {
    webSocketManager.unregisterHandler(
      WholesaleNotificationType.WHOLESALE_FUNDRAISER_UPDATED as any, 
      undefined, 
      `${this.sourceId}_fundraiser`
    );
  }

  /**
   * Subscribe to participant goal updates
   */
  subscribeToParticipants(handler: WholesaleNotificationHandler<WholesaleParticipantGoalUpdate>): void {
    webSocketManager.registerHandler(
      WholesaleNotificationType.WHOLESALE_PARTICIPANT_GOAL_UPDATED as any, 
      handler, 
      `${this.sourceId}_participant`
    );
  }

  /**
   * Unsubscribe from participant goal updates
   */
  unsubscribeFromParticipants(): void {
    webSocketManager.unregisterHandler(
      WholesaleNotificationType.WHOLESALE_PARTICIPANT_GOAL_UPDATED as any, 
      undefined, 
      `${this.sourceId}_participant`
    );
  }

  /**
   * Subscribe to all wholesale updates
   */
  subscribeToAll(handlers: {
    onOrderUpdate?: WholesaleNotificationHandler<WholesaleOrderUpdate>;
    onInventoryUpdate?: WholesaleNotificationHandler<WholesaleItemStockUpdate>;
    onFundraiserUpdate?: WholesaleNotificationHandler<WholesaleFundraiserUpdate>;
    onParticipantUpdate?: WholesaleNotificationHandler<WholesaleParticipantGoalUpdate>;
  }): void {
    if (handlers.onOrderUpdate) {
      this.subscribeToOrders(handlers.onOrderUpdate);
    }
    if (handlers.onInventoryUpdate) {
      this.subscribeToInventory(handlers.onInventoryUpdate);
    }
    if (handlers.onFundraiserUpdate) {
      this.subscribeToFundraisers(handlers.onFundraiserUpdate);
    }
    if (handlers.onParticipantUpdate) {
      this.subscribeToParticipants(handlers.onParticipantUpdate);
    }
  }

  /**
   * Unsubscribe from all wholesale updates
   */
  unsubscribeFromAll(): void {
    this.unsubscribeFromOrders();
    this.unsubscribeFromInventory();
    this.unsubscribeFromFundraisers();
    this.unsubscribeFromParticipants();
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return webSocketManager.isConnected();
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): string {
    // The main WebSocketManager doesn't expose this publicly, so we'll check isConnected
    return this.isConnected() ? 'connected' : 'disconnected';
  }

  /**
   * Subscribe to specific fundraiser updates
   */
  subscribeToFundraiser(
    fundraiserSlug: string, 
    handlers: {
      onOrderUpdate?: WholesaleNotificationHandler<WholesaleOrderUpdate>;
      onInventoryUpdate?: WholesaleNotificationHandler<WholesaleItemStockUpdate>;
      onParticipantUpdate?: WholesaleNotificationHandler<WholesaleParticipantGoalUpdate>;
    }
  ): void {
    // Filter updates by fundraiser
    if (handlers.onOrderUpdate) {
      this.subscribeToOrders((data: WholesaleOrderUpdate) => {
        if (data.fundraiser.slug === fundraiserSlug) {
          handlers.onOrderUpdate!(data);
        }
      });
    }

    if (handlers.onInventoryUpdate) {
      this.subscribeToInventory((data: WholesaleItemStockUpdate) => {
        if (data.fundraiser.slug === fundraiserSlug) {
          handlers.onInventoryUpdate!(data);
        }
      });
    }

    if (handlers.onParticipantUpdate) {
      this.subscribeToParticipants((data: WholesaleParticipantGoalUpdate) => {
        if (data.fundraiser.slug === fundraiserSlug) {
          handlers.onParticipantUpdate!(data);
        }
      });
    }
  }

  /**
   * Disconnect WebSocket (delegates to main manager)
   */
  disconnect(): void {
    this.unsubscribeFromAll();
    // Note: We don't disconnect the main WebSocketManager as other parts of the app may be using it
  }
}

// Export singleton instance
export const wholesaleWebSocket = new WholesaleWebSocketService();
export default wholesaleWebSocket;