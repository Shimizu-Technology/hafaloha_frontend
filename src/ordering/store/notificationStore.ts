import { create } from 'zustand';
import {
  Notification,
  getUnacknowledgedNotifications,
  acknowledgeNotification,
  acknowledgeAllNotifications,
  getNotificationCount,
  getNotificationStats,
  takeActionOnNotification,
  RestockActionResponse
} from '../../shared/api/endpoints/notifications';
import { handleApiError } from '../../shared/utils/errorHandler';

interface NotificationStoreState {
  notifications: Notification[];
  loading: boolean;
  error: string | null;
  stats: {
    orderCount: number;
    lowStockCount: number;
    outOfStockCount: number;
    totalCount: number;
    oldestNotificationDate: string | null;
  };

  // Actions
  fetchNotifications: (hours?: number, type?: string) => Promise<Notification[]>;
  acknowledgeOne: (id: number) => Promise<void>;
  acknowledgeAll: (type?: string) => Promise<number>;
  takeAction: (id: number, actionType: string, params: Record<string, any>) => Promise<RestockActionResponse | null>;
  fetchStats: () => Promise<void>;
  clearError: () => void;
  
  // Computed properties
  getStockAlerts: () => Notification[];
  hasUnacknowledgedNotifications: (type?: string) => boolean;
}

const useNotificationStore = create<NotificationStoreState>((set, get) => ({
  notifications: [] as Notification[],
  loading: false,
  error: null,
  stats: {
    orderCount: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    totalCount: 0,
    oldestNotificationDate: null,
  },

  fetchNotifications: async (hours = 24, type?: string) => {
    try {
      set({ loading: true, error: null });
      
      console.debug('Fetching notifications with params:', { type, hours });
      const notifications = await getUnacknowledgedNotifications(type, hours);
      
      console.debug('Raw notifications response:', {
        isArray: Array.isArray(notifications),
        type: typeof notifications,
        value: notifications,
        keys: notifications ? Object.keys(notifications) : null
      });
      
      // Ensure notifications is always an array
      const safeNotifications = Array.isArray(notifications) ? notifications : [];
      
      if (!Array.isArray(notifications)) {
        console.warn('API returned non-array notifications:', {
          type: typeof notifications,
          value: notifications,
          keys: notifications ? Object.keys(notifications) : null
        });
      }
      
      set({ notifications: safeNotifications, loading: false });
      return safeNotifications;
    } catch (error) {
      const errorMessage = handleApiError(error, 'Failed to fetch notifications');
      set({ error: errorMessage, loading: false, notifications: [] });
      return [];
    }
  },

  acknowledgeOne: async (id: number) => {
    try {
      await acknowledgeNotification(id);
      
      // Update local state
      set(state => {
        // Safety check to ensure notifications is an array
        if (!Array.isArray(state.notifications)) {
          console.warn('Expected notifications to be an array but got:', typeof state.notifications);
          return {
            ...state,
            error: 'Invalid notifications data structure'
          };
        }
        
        return {
          notifications: state.notifications.filter(n => n.id !== id),
          stats: {
            ...state.stats,
            totalCount: Math.max(0, state.stats.totalCount - 1),
            // Decrement the appropriate counter based on notification type
            orderCount: state.notifications.find(n => n.id === id && n.notification_type === 'order')
              ? Math.max(0, state.stats.orderCount - 1)
              : state.stats.orderCount,
            lowStockCount: state.notifications.find(n => n.id === id && n.notification_type === 'low_stock')
              ? Math.max(0, state.stats.lowStockCount - 1)
              : state.stats.lowStockCount,
            outOfStockCount: state.notifications.find(n => n.id === id && n.notification_type === 'out_of_stock')
              ? Math.max(0, state.stats.outOfStockCount - 1)
              : state.stats.outOfStockCount,
          }
        };
      });
    } catch (error) {
      const errorMessage = handleApiError(error, 'Failed to acknowledge notification');
      set({ error: errorMessage });
    }
  },

  acknowledgeAll: async (type?: string) => {
    try {
      const { acknowledged_count } = await acknowledgeAllNotifications(type);
      
      // Update local state
      set(state => {
        // Safety check to ensure notifications is an array
        if (!Array.isArray(state.notifications)) {
          console.warn('Expected notifications to be an array but got:', typeof state.notifications);
          return {
            ...state,
            error: 'Invalid notifications data structure'
          };
        }
        
        // If type is specified, filter out only notifications of that type
        const updatedNotifications = type
          ? state.notifications.filter(n => n.notification_type !== type)
          : [];
          
        // Update stats based on what was acknowledged
        const newStats = { ...state.stats };
        
        if (type) {
          // If a specific type was acknowledged, reduce that counter
          switch (type) {
            case 'order':
              newStats.orderCount = 0;
              break;
            case 'low_stock':
              newStats.lowStockCount = 0;
              break;
            case 'out_of_stock':
              newStats.outOfStockCount = 0;
              break;
          }
        } else {
          // If all were acknowledged, reset all counters
          newStats.orderCount = 0;
          newStats.lowStockCount = 0;
          newStats.outOfStockCount = 0;
        }
        
        newStats.totalCount = newStats.orderCount + newStats.lowStockCount + newStats.outOfStockCount;
        
        return {
          notifications: updatedNotifications,
          stats: newStats
        };
      });
      
      return acknowledged_count;
    } catch (error) {
      const errorMessage = handleApiError(error, 'Failed to acknowledge all notifications');
      set({ error: errorMessage });
      return 0;
    }
  },
  
  takeAction: async (id: number, actionType: string, params: Record<string, any> = {}) => {
    try {
      set({ loading: true, error: null });
      const response = await takeActionOnNotification(id, actionType, params);
      
      // For restock actions, the notification will be acknowledged automatically
      // So we should remove it from the local state
      set(state => {
        // Safety check to ensure notifications is an array
        if (!Array.isArray(state.notifications)) {
          console.warn('Expected notifications to be an array but got:', typeof state.notifications);
          return {
            ...state,
            loading: false,
            error: 'Invalid notifications data structure'
          };
        }
        
        return {
          loading: false,
          notifications: state.notifications.filter(n => n.id !== id),
          stats: {
            ...state.stats,
            totalCount: Math.max(0, state.stats.totalCount - 1),
            // If this was a low stock notification, reduce that counter
            lowStockCount: state.notifications.find(n => n.id === id && n.notification_type === 'low_stock')
              ? Math.max(0, state.stats.lowStockCount - 1)
              : state.stats.lowStockCount,
          }
        };
      });
      
      return response;
    } catch (error) {
      const errorMessage = handleApiError(error, 'Failed to take action on notification');
      set({ error: errorMessage, loading: false });
      return null;
    }
  },

  fetchStats: async () => {
    try {
      set({ loading: true, error: null });
      const stats = await getNotificationStats();
      set({
        stats: {
          orderCount: stats.order_count,
          lowStockCount: stats.low_stock_count,
          outOfStockCount: stats.out_of_stock_count,
          totalCount: stats.total_count,
          oldestNotificationDate: stats.oldest_notification_date
        },
        loading: false
      });
    } catch (error) {
      const errorMessage = handleApiError(error, 'Failed to fetch notification stats');
      set({ error: errorMessage, loading: false });
    }
  },

  clearError: () => set({ error: null }),
  
  // Get all merchandise stock-related notifications
  getStockAlerts: () => {
    const { notifications } = get();
    // Add safety check to ensure notifications is an array before filtering
    if (!Array.isArray(notifications)) {
      console.warn('Expected notifications to be an array but got:', typeof notifications);
      return [];
    }
    return notifications.filter(n => 
      n.notification_type === 'low_stock' || 
      n.notification_type === 'out_of_stock' ||
      n.notification_type === 'persistent_low_stock'
    );
  },
  
  // Check if there are any unacknowledged notifications of a given type
  hasUnacknowledgedNotifications: (type?: string) => {
    const { notifications } = get();
    // Add safety check to ensure notifications is an array before using array methods
    if (!Array.isArray(notifications)) {
      console.warn('Expected notifications to be an array but got:', typeof notifications);
      return false;
    }
    if (type) {
      return notifications.some(n => n.notification_type === type);
    }
    return notifications.length > 0;
  }
}));

export default useNotificationStore;
