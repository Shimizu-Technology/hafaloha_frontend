// src/ordering/components/admin/AdminDashboard.tsx

import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
// Lazy load heavy admin components
const MenuManager = lazy(() => import('./MenuManager').then(module => ({ default: module.MenuManager })));
const OrderManager = lazy(() => import('./OrderManager').then(module => ({ default: module.OrderManager })));
const PromoManager = lazy(() => import('./PromoManager').then(module => ({ default: module.PromoManager })));
const AnalyticsManager = lazy(() => import('./AnalyticsManager').then(module => ({ default: module.AnalyticsManager })));
const SettingsManager = lazy(() => import('./SettingsManager').then(module => ({ default: module.SettingsManager })));
const MerchandiseManager = lazy(() => import('./MerchandiseManager'));
const StaffManagement = lazy(() => import('./StaffManagement').then(module => ({ default: module.StaffManagement })));
const ReservationsManager = lazy(() => import('./reservations/ReservationsManager').then(module => ({ default: module.ReservationsManager })));
// RestaurantSelector removed - super admins now only see data for the current restaurant
import NotificationContainer from '../../../shared/components/notifications/NotificationContainer';
 

import notificationStore from '../../store/notificationStore';

// Add global type declaration for our toast tracking
declare global {
  interface Window {
    orderToastIds?: {
      [orderId: string]: string[];
    };
  }
}

import {
  BarChart2,
  ShoppingBag,
  LayoutGrid,
  Tag,
  Sliders,
  X as XIcon,
  ShoppingCart,
  // Bell, // Commented out - not currently using stock notifications
  Package,
  Users,
  Calendar
} from 'lucide-react';
import AcknowledgeAllButton from '../../../shared/components/notifications/AcknowledgeAllButton';
import { api } from '../../lib/api';
import toastUtils from '../../../shared/utils/toastUtils';
import { useAuthStore } from '../../store/authStore';
import webSocketManager, { NotificationType } from '../../../shared/services/WebSocketManager';
import { Navigate } from 'react-router-dom';
import useNotificationStore from '../../store/notificationStore';
import { Order } from '../../types/order';
import { MenuItem } from '../../types/menu';
import { useMenuStore } from '../../store/menuStore';
import { useOrderStore } from '../../store/orderStore';
import { calculateAvailableQuantity } from '../../utils/inventoryUtils';
import useWebSocket from '../../../shared/hooks/useWebSocket';
import { startAdminComponentLoad, endAdminComponentLoad, trackAdminTabSwitch, printAdminPerformanceSummary } from '../../utils/adminPerformance';

// Tab loading placeholder component
function TabLoadingPlaceholder() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="h-8 bg-gray-200 rounded w-64"></div>
        <div className="h-10 bg-gray-200 rounded w-32"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow p-4 space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

type Tab = 'analytics' | 'orders' | 'menu' | 'promos' | 'settings' | 'merchandise' | 'staff' | 'reservations';

export function AdminDashboard() {
  const { user } = useAuthStore();
  const authStore = useAuthStore();
  // Restaurant selector removed - super admins now only see data for the current restaurant
  // Use user's restaurant_id directly instead of state since we no longer need to change restaurants
  const currentRestaurantId = user?.restaurant_id;
  
  // Direct role check as a fallback
  const directRoleCheck = user?.role === 'super_admin' || user?.role === 'admin' || user?.role === 'staff';
  
  // Redirect if user doesn't have access - use direct role check as a fallback
  const hasAccess = user && (directRoleCheck || authStore.isSuperAdmin() || authStore.isAdmin() || authStore.isStaff());
  
  // Check if user is staff only (not admin or super_admin)
  const isStaffOnly = user && authStore.isStaff() && !authStore.isAdmin() && !authStore.isSuperAdmin();
  
  if (!hasAccess) {
    return <Navigate to="/" replace />;
  }

  // List of tabs with role-based access controls
  const tabs = [
    // Analytics - visible to admin and super_admin only
    ...(authStore.isSuperAdmin() || authStore.isAdmin() ? [{ id: 'analytics', label: 'Analytics', icon: BarChart2 }] : []),
    // Orders - visible to all admin roles (including staff)
    { id: 'orders', label: 'Orders', icon: ShoppingBag },
    // Menu - visible to admin and super_admin only
    ...(authStore.isSuperAdmin() || authStore.isAdmin() ? [{ id: 'menu', label: 'Menu', icon: LayoutGrid }] : []),
    // Merchandise - visible to admin and super_admin only
    ...(authStore.isSuperAdmin() || authStore.isAdmin() ? [{ id: 'merchandise', label: 'Merchandise', icon: ShoppingCart }] : []),
    // Promos - visible to admin and super_admin only
    ...(authStore.isSuperAdmin() || authStore.isAdmin() ? [{ id: 'promos', label: 'Promos', icon: Tag }] : []),
    // Reservations - visible to admin and super_admin only
    ...(authStore.isSuperAdmin() || authStore.isAdmin() ? [{ id: 'reservations', label: 'Reservations', icon: Calendar }] : []),
    // Staff - visible to admin and super_admin only
    ...(authStore.isSuperAdmin() || authStore.isAdmin() ? [{ id: 'staff', label: 'Staff', icon: Users }] : []),
    // Settings - visible to admin and super_admin
    ...((authStore.isSuperAdmin() || authStore.isAdmin()) ? [{ id: 'settings', label: 'Settings', icon: Sliders }] : []),
  ] as const;

  const [activeTab, setActiveTab] = useState<Tab>(() => {
    // For staff users, always default to orders tab
    if (isStaffOnly) {
      return 'orders';
    }
    
    // For admin/super_admin, check stored preference
    const stored = localStorage.getItem('adminTab');
    if (stored && ['analytics','orders','menu','merchandise','promos','reservations','staff','settings'].includes(stored)) {
      // Check if the user has access to the stored tab
      if (
        (stored === 'analytics' && (authStore.isSuperAdmin() || authStore.isAdmin())) ||
        (stored === 'orders') ||
        (stored === 'menu' && (authStore.isSuperAdmin() || authStore.isAdmin())) ||
        (stored === 'merchandise' && (authStore.isSuperAdmin() || authStore.isAdmin())) ||
        (stored === 'promos' && (authStore.isSuperAdmin() || authStore.isAdmin())) ||
        (stored === 'reservations' && (authStore.isSuperAdmin() || authStore.isAdmin())) ||
        (stored === 'staff' && (authStore.isSuperAdmin() || authStore.isAdmin())) ||
        (stored === 'settings' && (authStore.isSuperAdmin() || authStore.isAdmin()))
      ) {
        return stored as Tab;
      }
    }
    // Default to orders for staff, analytics for admin/super_admin
    return authStore.isStaff() ? 'orders' : 'analytics';
  });

  function handleTabClick(id: Tab) {
    // Track tab switch for performance monitoring
    trackAdminTabSwitch(activeTab, id);
    
    // If switching to orders tab, reset the selectedOrderId to prevent auto-opening the modal
    if (id === 'orders') {
      setSelectedOrderId(null);
    }
    
    setActiveTab(id);
    localStorage.setItem('adminTab', id);
  }

  // For order modal
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  
  // Constants for configuration
  /* eslint-disable @typescript-eslint/no-unused-vars */
  const POLLING_INTERVAL = 5000; // 5 seconds - could be moved to a config file or environment variable
  const USE_WEBSOCKETS = true; // Enable WebSockets with polling fallback
  const WEBSOCKET_DEBUG = true; // Enable detailed WebSocket logging
  /* eslint-enable @typescript-eslint/no-unused-vars */
  // WebSocket configuration for debugging
  // USE_WEBSOCKETS: true, WEBSOCKET_DEBUG: true
  
  // Add event listener for service worker messages
  useEffect(() => {
    // Listen for messages from the service worker
    const handleMessage = (event: MessageEvent) => {
      // Check if the message is from our service worker
      if (event.data && event.data.type === 'SET_ADMIN_TAB') {
        console.log('[AdminDashboard] Received SET_ADMIN_TAB message:', event.data.tab);
        // Set the active tab based on the message
        if (event.data.tab && tabs.some(tab => tab.id === event.data.tab)) {
          handleTabClick(event.data.tab as Tab);
        }
      }
    };
    
    // Add the event listener
    navigator.serviceWorker.addEventListener('message', handleMessage);
    
    // Clean up the event listener when the component unmounts
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, []);

  // Set WebSocketManager admin context when component mounts/unmounts
  useEffect(() => {
    // Set admin context to true when component mounts
    webSocketManager.setAdminContext(true);
    
    return () => {
      // Set admin context to false when component unmounts
      webSocketManager.setAdminContext(false);
    };
  }, []);

  // Polling for new orders - track the highest order ID we've seen
  // Note: We no longer use localStorage to persist this value between sessions
  // because the server now handles first-time users and cache clears by tracking
  // global acknowledgment timestamps
  const [lastOrderId, setLastOrderId] = useState<number>(0);

  // Track unacknowledged orders
  const [unacknowledgedOrders, setUnacknowledgedOrders] = useState<Order[]>([]);
  
  // Stock notification states
   
  // Stock notification state - commented out as not currently in use
  // const [showStockNotifications, setShowStockNotifications] = useState(false);
  // const [stockAlertCount, setStockAlertCount] = useState(0);
   
  // Commented out getStockAlerts as stock notifications are not currently in use
  const { /* getStockAlerts, */ fetchNotifications } = useNotificationStore();
  const { menuItems } = useMenuStore();
  
  // Track acknowledged low stock items with their quantities to avoid showing the same notification repeatedly
  const [acknowledgedLowStockItems, setAcknowledgedLowStockItems] = useState<Record<string, number>>(() => {
    const stored = localStorage.getItem('acknowledgedLowStockItems');
    return stored ? JSON.parse(stored) : {};
  });
  
  // For editing menu item and inventory management
  /* eslint-disable @typescript-eslint/no-unused-vars */
  const [selectedMenuItemId, setSelectedMenuItemId] = useState<string | null>(null);
  /* eslint-enable @typescript-eslint/no-unused-vars */
  const [openInventoryForItem, setOpenInventoryForItem] = useState<string | null>(null);
  
  // Loading and success states for acknowledge all button
  const [isAcknowledgingAll, setIsAcknowledgingAll] = useState(false);
  const [acknowledgeSuccess, setAcknowledgeSuccess] = useState(false);

  // Function to acknowledge an order via the API
  const acknowledgeOrder = async (orderId: number) => {
    try {
      // First, dismiss all toast notifications for this order
      dismissAllToastsForOrder(orderId);
      
      // Find the notification ID associated with this order
      const notification = notificationStore.getState().notifications.find(
        (n: any) => n.notification_type === 'order' && n.data?.id === orderId
      );
      
      if (notification) {
        // Acknowledge the notification in the store
        try {
          await notificationStore.getState().acknowledgeOne(notification.id);
        } catch (notificationError) {
          console.error(`[ORDER_DEBUG] Error acknowledging notification in store:`, notificationError);
        }
      }
      
      // Call the API to acknowledge the order
      await api.post(`/orders/${orderId}/acknowledge`);
      
      // Remove from unacknowledged orders list
      setUnacknowledgedOrders(prev => {
        const newList = prev.filter(order => Number(order.id) !== orderId);
        return newList;
      });
      
      // Ensure the WebSocketManager knows this notification has been handled
      webSocketManager.markNotificationAsDisplayed(`order_${orderId}`);
    } catch (err) {
      console.error(`[ORDER_DEBUG] Failed to acknowledge order ${orderId}:`, err);
    }
  };
  
  // Helper function to dismiss all toast notifications for a specific order
  const dismissAllToastsForOrder = (orderId: number) => {
    // First try to dismiss using the global toast ID map
    if (window.orderToastIds && window.orderToastIds[orderId]) {
      const toastIds = window.orderToastIds[orderId];
      
      toastIds.forEach(id => {
        try {
          toastUtils.dismiss(id);
        } catch (error) {
          console.error(`[ORDER_DEBUG] Error dismissing toast with ID ${id}:`, error);
        }
      });
      
      // Clear the toast IDs for this order
      delete window.orderToastIds[orderId];
    }
    
    // As a fallback, also try to find and remove any toast elements in the DOM with this order ID
    const existingToasts = document.querySelectorAll(`[data-order-id="${orderId}"]`);
    if (existingToasts.length > 0) {
      // For each toast element, find its parent toast container and dismiss it
      existingToasts.forEach(toastElement => {
        try {
          // Find the closest toast container which should have a data-id attribute
          const container = toastElement.closest('[data-id]');
          if (container && container.getAttribute('data-id')) {
            const toastId = container.getAttribute('data-id') || '';
            if (toastId) {
              toastUtils.dismiss(toastId);
            }
          }
        } catch (error) {
          console.error(`[ORDER_DEBUG] Error dismissing toast from DOM:`, error);
        }
      });
    }
    
    // Finally, call dismissAll as a last resort if we still have toasts
    const remainingToasts = document.querySelectorAll(`[data-order-id="${orderId}"]`);
    if (remainingToasts.length > 0) {
      toastUtils.dismissAll();
    }
  };
  
  // Function to dismiss a specific notification and acknowledge the order in the backend
  // This prevents it from reappearing on page refresh by properly acknowledging it
  const dismissNotification = async (orderId: number, toastId: string) => {
    try {
      // First dismiss the specific toast from the UI
      toastUtils.dismiss(toastId);
      
      // Mark this notification as displayed in WebSocketManager
      webSocketManager.markNotificationAsDisplayed(`order_${orderId}`);
      
      // Find and acknowledge the notification in the notification store if it exists
      const notification = notificationStore.getState().notifications.find(
        (n: any) => n.notification_type === 'order' && n.data?.id === orderId
      );
      
      if (notification) {
        try {
          await notificationStore.getState().acknowledgeOne(notification.id);
        } catch (err) {
          console.error(`[ORDER_DEBUG] Error acknowledging notification in store:`, err);
        }
      }
      
      // IMPORTANT: Call the API to acknowledge the order in the backend
      await api.post(`/orders/${orderId}/acknowledge`);
      
      // Remove from unacknowledged orders list
      setUnacknowledgedOrders(prev => {
        const newList = prev.filter(order => Number(order.id) !== orderId);
        return newList;
      });
      
    } catch (error) {
      console.error(`[ORDER_DEBUG] Error acknowledging order ${orderId}:`, error);
      toastUtils.error(`Failed to acknowledge order ${orderId}`);
    }
  };
  
  // Function to acknowledge all unacknowledged orders
  const acknowledgeAllOrders = async () => {
    if (isAcknowledgingAll || unacknowledgedOrders.length === 0) return; // Prevent multiple clicks or empty acknowledgments
    
    try {
      setIsAcknowledgingAll(true);
      
      // Create a copy of the current unacknowledged orders and filter by current restaurant
      const ordersToAcknowledge = unacknowledgedOrders.filter(order => {
        // TENANT ISOLATION: Only acknowledge orders for the current restaurant
        return currentRestaurantId && order.restaurant_id && 
               String(order.restaurant_id) === String(currentRestaurantId);
      });
      
      // First dismiss all toast notifications for all unacknowledged orders
      // Using our improved dismissAllToastsForOrder function
      ordersToAcknowledge.forEach(order => {
        dismissAllToastsForOrder(Number(order.id));
      });
      
      // Create an array of promises to acknowledge each order
      const acknowledgePromises = ordersToAcknowledge.map(order => {
        return api.post(`/orders/${order.id}/acknowledge`)
          .then(() => {
            // Mark this notification as displayed in WebSocketManager
            webSocketManager.markNotificationAsDisplayed(`order_${order.id}`);
            return order.id;
          })
          .catch(err => {
            console.error(`[ORDER_DEBUG] Failed to acknowledge order ${order.id}:`, err);
            return null;
          });
      });
      
      // Wait for all acknowledgments to complete
      const results = await Promise.all(acknowledgePromises);
      
      // Filter out any failed acknowledgments
      const successfulAcknowledgments = results.filter(id => id !== null);
      
      // Clear the unacknowledged orders list
      setUnacknowledgedOrders([]);
      
      // Show success state
      setAcknowledgeSuccess(true);
      setTimeout(() => setAcknowledgeSuccess(false), 2000);
      
      // Show success toast
      toastUtils.success(`${successfulAcknowledgments.length} orders acknowledged`);
    } catch (err) {
      console.error('[ORDER_DEBUG] Failed to acknowledge all orders:', err);
      toastUtils.error('Failed to acknowledge all orders');
    } finally {
      setIsAcknowledgingAll(false);
    }
  };

  // Function to display order notification with improved handling and deduplication
  const displayOrderNotification = useCallback((order: Order) => {
    // ROLE CHECK: Only show notifications to admin and super_admin users, NOT staff
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return;
    }
    
    // TENANT ISOLATION: Skip notifications for other restaurants
    if (order.restaurant_id && currentRestaurantId && 
        String(order.restaurant_id) !== String(currentRestaurantId)) {
      return;
    }
    
    // Skip displaying notification if the order has already been acknowledged globally
    if (order.global_last_acknowledged_at) {
      return;
    }
    
    // Generate a unique notification ID for deduplication
    const notificationId = `order_${order.id}`;
    
    // First check if this order has already been acknowledged in our system
    if (webSocketManager.hasNotificationBeenDisplayed(notificationId)) {
      return;
    }
    
    // Also check if we've already displayed this notification in the DOM
    // This prevents duplicate notifications from appearing even if they come from different sources
    const existingToasts = document.querySelectorAll(`[data-order-id="${order.id}"]`);
    if (existingToasts.length > 0) {
      // Register this notification to prevent future duplicates
      webSocketManager.markNotificationAsDisplayed(notificationId);
      return;
    }
    
    // Register this notification with the WebSocketManager to prevent duplicates
    webSocketManager.markNotificationAsDisplayed(notificationId);
    
    // Check if toastUtils is available
    if (!toastUtils) {
      console.error(`[ORDER_DEBUG] toastUtils is not available:`, toastUtils);
      return;
    }
    
    // Handle both snake_case and camelCase date formats
    const createdAtStr = new Date(order.created_at || order.createdAt || Date.now()).toLocaleString();
    const totalPrice = (order.total ?? 0).toFixed(2);
    const contactName = (order as any).contact_name || 'N/A';

    // Get status badge color
    const getStatusBadgeColor = (status: string) => {
      const colors = {
        pending: 'bg-yellow-100 text-yellow-800',
        preparing: 'bg-blue-100 text-blue-800',
        ready: 'bg-green-100 text-green-800',
        completed: 'bg-gray-100 text-gray-800',
        cancelled: 'bg-red-100 text-red-800',
        confirmed: 'bg-purple-100 text-purple-800',
      };
      return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
    };
    
    // Format item names for display (limit to 2 items with "and X more")
    const formatItemNames = (items: any[]) => {
      if (!items || items.length === 0) return 'No items';
      
      const truncateName = (name: string, maxLength: number = 20) => {
        return name.length > maxLength ? name.substring(0, maxLength) + '...' : name;
      };
      
      if (items.length === 1) return truncateName(items[0].name);
      if (items.length === 2) return `${truncateName(items[0].name, 15)} and ${truncateName(items[1].name, 15)}`;
      return `${truncateName(items[0].name, 15)} and ${items.length - 1} more`;
    };

    // Register this notification with the WebSocketManager to prevent future duplicates
    webSocketManager.markNotificationAsDisplayed(notificationId);
    
    // Generate a unique toast ID that includes a timestamp to prevent collisions
    // This is different from the notification ID used for deduplication
    // Store this ID in a global map so we can dismiss it later
    const toastId = `order_${order.id}_${Date.now()}`;
    
    // Store the toast ID in a global map for later dismissal
    if (!window.orderToastIds) {
      window.orderToastIds = {};
    }
    
    // Add this toast ID to the list of toasts for this order
    if (!window.orderToastIds[order.id]) {
      window.orderToastIds[order.id] = [];
    }
    window.orderToastIds[order.id].push(toastId);
    
    // Create the notification with a guaranteed unique toast ID
    try {
      toastUtils.custom((t) => (
      <div
        className={`relative bg-white rounded-xl shadow-lg p-4 border border-gray-100 animate-slideUp transition-all duration-300 ${t.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        style={{ width: '350px', maxWidth: '95vw' }}
        data-order-id={order.id}
      >
        {/* Close button */}
        <button
          onClick={() => {
            try {
              toastUtils.dismiss(toastId);
            } catch (dismissError) {
              console.error(`[ORDER_DEBUG] Error dismissing notification: ${toastId}`, dismissError);
            }
            acknowledgeOrder(Number(order.id));
          }}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 transition-colors"
        >
          <XIcon className="h-4 w-4" />
        </button>

        {/* Header with icon, order number and status */}
        <div className="flex items-start mb-3">
          <div className="bg-[#c1902f] bg-opacity-10 p-2 rounded-lg mr-3 flex-shrink-0">
            <ShoppingBag className="h-5 w-5 text-[#c1902f]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-bold text-gray-900 truncate pr-2 w-full">
                New Order #{order.order_number || order.id}
              </h4>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(order.status)}`}>
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{createdAtStr}</p>
          </div>
        </div>

        {/* Order details */}
        <div className="space-y-3 mb-3">
          {/* Items preview */}
          <div className="bg-gray-50 rounded-lg p-2.5">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-medium text-gray-500">ITEMS</span>
              <span className="text-xs font-medium">${totalPrice}</span>
            </div>
            <p className="text-sm font-medium text-gray-800 truncate">
              {formatItemNames(order.items)}
            </p>
          </div>
          
          {/* Customer info */}
          <div className="flex items-center space-x-2">
            <div className="h-7 w-7 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-blue-700 font-medium text-sm">
                {contactName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-800 truncate w-full">{contactName}</p>
              <p className="text-xs text-gray-500 truncate">Customer</p>
            </div>
          </div>
          
          {/* Location info - only show if location exists */}
          {order.location && (
            <div className="flex items-center space-x-2 mt-2">
              <div className="h-7 w-7 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-green-700 font-medium text-sm">L</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-800 truncate w-full">{order.location.name}</p>
                <p className="text-xs text-gray-500 truncate">Location</p>
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex space-x-2">
          <button
            onClick={() => {
              // Dismiss notification and mark it as displayed to prevent it from reappearing
              dismissNotification(Number(order.id), toastId);
              
              // Use a Promise to ensure sequential execution for navigation
              Promise.resolve()
                .then(() => {
                  if (activeTab !== 'orders') {
                    setActiveTab('orders');
                    // Wait for tab switch
                    return new Promise(resolve => setTimeout(resolve, 100));
                  }
                })
                .then(() => {
                  setSelectedOrderId(null);
                  // Wait for state clear
                  return new Promise(resolve => setTimeout(resolve, 50));
                })
                .then(() => {
                  setSelectedOrderId(Number(order.id));
                })
                .catch(error => {
                  console.error(`[ORDER_DEBUG] Error during view order navigation:`, error);
                });
            }}
            className="flex-1 bg-[#c1902f] text-white px-3 py-2 rounded-lg font-medium text-sm hover:bg-[#d4a43f] transition-colors shadow-sm"
          >
            View Order
          </button>
          <button
            onClick={() => {
              // Dismiss notification and mark it as displayed to prevent it from reappearing
              dismissNotification(Number(order.id), toastId);
            }}
            className="w-24 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-200 transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    ), {
      duration: Infinity,
      id: toastId,
      position: 'top-right',
      // Ensure notifications stack instead of replacing each other
      style: {
        marginBottom: '1rem'
      }
    });
    } catch (error) {
      console.error(`[ORDER_DEBUG] Error creating toast notification for order ${order.id}:`, error);
    }
  }, [activeTab, acknowledgeOrder, user]);

  // Function to acknowledge a low stock item
  const acknowledgeLowStockItem = useCallback((itemId: string, currentQty: number) => {
    const updatedItems = { ...acknowledgedLowStockItems, [itemId]: currentQty };
    setAcknowledgedLowStockItems(updatedItems);
    localStorage.setItem('acknowledgedLowStockItems', JSON.stringify(updatedItems));
  }, [acknowledgedLowStockItems]);
  
  // Function to display low stock notification - memoized to prevent infinite loops
  const displayLowStockNotification = useCallback((item: MenuItem) => {
    const availableQty = calculateAvailableQuantity(item);
    
    toastUtils.custom((t) => (
      <div
              className={`relative bg-white rounded-xl shadow-md p-4 border border-gray-100 animate-slideUp transition-all duration-300 ${t.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
              style={{ width: '350px', maxWidth: '95vw' }}
            >
        {/* Close button */}
        <button
          onClick={() => {
            toastUtils.dismiss(`low_stock_${item.id}`);
            acknowledgeLowStockItem(item.id, availableQty);
          }}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 transition-colors"
        >
          <XIcon className="h-4 w-4" />
        </button>

        {/* Simple header with icon and item name */}
        <div className="flex items-center pb-2">
          <div className="text-orange-500 mr-2">
            <Package className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-medium text-gray-900 truncate w-full">
              {item.name} <span className="text-orange-500 font-normal">Low Stock</span>
              <span className="ml-2 text-orange-600 font-medium">{availableQty}</span>
            </p>
          </div>
        </div>

        {/* Action buttons - styled like the order notification */}
        <div className="pt-2 flex space-x-2">
          <button
            onClick={() => {
              toastUtils.dismiss(`low_stock_${item.id}`);
              acknowledgeLowStockItem(item.id, availableQty);
              setActiveTab('menu');
              setOpenInventoryForItem(item.id);
            }}
            className="flex-1 bg-[#c1902f] text-white px-3 py-2 rounded-lg font-medium text-sm hover:bg-[#d4a43f] transition-colors shadow-sm"
          >
            Manage
          </button>
          <button
            onClick={() => {
              toastUtils.dismiss(`low_stock_${item.id}`);
              acknowledgeLowStockItem(item.id, availableQty);
            }}
            className="w-24 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-200 transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    ), {
      duration: Infinity,
      id: `low_stock_${item.id}`,
    });
  }, [calculateAvailableQuantity, acknowledgeLowStockItem, setActiveTab, setOpenInventoryForItem]);
  
  // WebSocket integration for real-time updates with improved handling
  const handleNewOrder = useCallback((order: Order) => {
    // ROLE CHECK: Only process notifications for admin and super_admin users, NOT staff
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return;
    }
    
    // Skip staff-created orders and already acknowledged orders
    if (order.staff_created || order.global_last_acknowledged_at) {
      return;
    }
    
    // Immediately update the orders in the store to ensure UI updates
    useOrderStore.getState().handleNewOrder(order);
    
    // Update the last order ID if needed
    if (Number(order.id) > lastOrderId) {
      setLastOrderId(Number(order.id));
    }
    
    // Add to unacknowledged orders if not already present
    setUnacknowledgedOrders(prev => {
      // Check if order is already in the list
      const exists = prev.some(o => Number(o.id) === Number(order.id));
      if (exists) {
        return prev;
      }
      return [...prev, order];
    });
    
    // Display notification immediately (no delay for instant response)
    displayOrderNotification(order);
  }, [lastOrderId, displayOrderNotification, user]);
  
  const handleLowStock = useCallback((item: MenuItem) => {
    // Received low stock alert
    
    // TENANT ISOLATION: Validate that the item belongs to the current restaurant
    if (user?.restaurant_id && item.restaurant_id && 
        String(user.restaurant_id) !== String(item.restaurant_id)) {
      console.debug(`[AdminDashboard] Ignoring low stock notification for item ${item.id} from different restaurant: ${item.restaurant_id} (current: ${user.restaurant_id})`);
      return;
    }
    
    const availableQty = calculateAvailableQuantity(item);
    const acknowledgedQty = acknowledgedLowStockItems[item.id];
    
    // Show notification if:
    // 1. Item has never been acknowledged, or
    // 2. Current quantity is lower than when it was last acknowledged
    if (acknowledgedQty === undefined || availableQty < acknowledgedQty) {
      displayLowStockNotification(item);
    }
  }, [acknowledgedLowStockItems, calculateAvailableQuantity, displayLowStockNotification, user?.restaurant_id]);
  
  // Note: useWebSocket hook disabled in favor of centralized WebSocketManager
  // The centralized WebSocketManager now handles all WebSocket connections
  // Initialize local WebSocket connection (for restaurant channel only, not order notifications)
  const { isConnected, error: wsError, connect: connectWebSocket } = useWebSocket({
    autoConnect: false, // Disabled auto-connect since we use centralized manager
    onNewOrder: () => {}, // Disabled - handled by centralized manager
    onLowStock: handleLowStock, // Keep this for now
    onConnected: () => {
      // Clear any existing polling interval when WebSocket connects
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      
      // Initial fetch when connected
      fetchNotifications(24, 'low_stock');
      
      // Ensure we're subscribed to the order channel
      if (user?.restaurant_id) {
        // Force restart the order store WebSocket connection
        useOrderStore.getState().stopWebSocketConnection();
        setTimeout(() => {
          useOrderStore.getState().startWebSocketConnection();
        }, 100);
      }
    },
    onDisconnected: () => {
      // If WebSockets are still enabled but we got disconnected, attempt to reconnect
      if (USE_WEBSOCKETS && (user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'staff')) {
        // Will attempt to reconnect
      }
    },
    onError: (err) => {
      console.error('[WebSocket] Error:', err, {
        user: user?.id,
        restaurant: user?.restaurant_id,
        errorType: err?.name,
        errorMessage: err?.message,
        useWebsockets: USE_WEBSOCKETS,
        isPolling: !!pollingIntervalRef.current
      });
    }
  });

  // Log WebSocket status changes
  useEffect(() => {
    // Connection status tracking for internal use
  }, [isConnected, wsError]);
  
  // Add effect for stock notifications (fallback to polling if WebSockets fail)
  useEffect(() => {
    // Only run for admin and super_admin users (NOT staff)
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return;
    }
    
    // Fetch stock notifications on component mount
    fetchNotifications(24, 'low_stock');
    
    // Set up polling interval for stock notifications if WebSockets are disabled
    let interval: NodeJS.Timeout | null = null;
    
    if (!USE_WEBSOCKETS) {
      interval = setInterval(() => {
        // Polling: Fetching stock notifications
        fetchNotifications(24, 'low_stock');
      }, POLLING_INTERVAL * 2); // Poll at a slower rate than orders
    } else if (isConnected) {
      // WebSocket: Connected, disabling polling
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    }
    
    return () => {
      if (interval) {
        // Polling: Cleaning up polling interval
        clearInterval(interval);
      }
    };
  }, [fetchNotifications, user, isConnected]);
  
  // Stock alert count update - commented out as not currently in use
  /*
  useEffect(() => {
    const stockAlerts = getStockAlerts();
    // Ensure stockAlerts is an array before accessing length
    setStockAlertCount(Array.isArray(stockAlerts) ? stockAlerts.length : 0);
  }, [getStockAlerts]);
  */
  
  
  // Handle stock notification view - commented out as not currently in use
  /*
  const handleStockNotificationView = (notification: any) => {
    // Navigate to the menu tab
    setActiveTab('menu');
    
    // If the notification has an item ID, open the inventory modal for it
    if (notification.item_id) {
      setOpenInventoryForItem(notification.item_id);
    }
    
    // Close notification panel
    setShowStockNotifications(false);
  };
  */
  
  // Single WebSocket connection management with improved connection handling
  useEffect(() => {
    // Only run for admin and super_admin users (NOT staff)
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      // WebSocket: Skipping connection - not an admin or super_admin user
      return;
    }
    
    let wsCleanupTimeout: NodeJS.Timeout;
    let wsCheckInterval: NodeJS.Timeout;
    
    const initializeWebSocket = () => {
      if (USE_WEBSOCKETS && user?.restaurant_id) {
        // First, ensure any polling is stopped
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        
        // First clean up any existing AdminDashboard handlers to prevent duplicates
        webSocketManager.unregisterHandler(NotificationType.NEW_ORDER, undefined, 'AdminDashboard');
        
        // Check if WebSocket is already connected
        if (webSocketManager.isConnected()) {
          // Register AdminDashboard notification handlers with centralized manager
          webSocketManager.registerHandler(NotificationType.NEW_ORDER, handleNewOrder, 'AdminDashboard');
          
          // Even if already connected, ensure OrderStore handlers are registered
          useOrderStore.getState().startWebSocketConnection();
          return;
        }
        
        // Wait for cleanup before establishing new connections
        wsCleanupTimeout = setTimeout(() => {
          // Initialize the centralized WebSocketManager
          if (user.restaurant_id) {
            webSocketManager.initialize(user.restaurant_id);
          }
          
          // Set admin context
          webSocketManager.setAdminContext(true);
          
          // Clean up any existing handlers first to prevent duplicates
          webSocketManager.unregisterHandler(NotificationType.NEW_ORDER, undefined, 'AdminDashboard');
          
          // Register AdminDashboard notification handlers with centralized manager
          webSocketManager.registerHandler(NotificationType.NEW_ORDER, handleNewOrder, 'AdminDashboard');
          
          // Connect to the restaurant channel for admin notifications (if needed) - only for admin/super_admin
          if (USE_WEBSOCKETS && user?.role && ['admin', 'super_admin'].includes(user.role)) {
            connectWebSocket();
          }
          
          // Register OrderStore handlers
          useOrderStore.getState().startWebSocketConnection();
          
          // Double-check that polling is stopped after WebSocket connection
          setTimeout(() => {
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
          }, 1000);
        }, 500);
      }
    };
    
    // Initialize WebSocket connection
    initializeWebSocket();
    
    // Set up an interval to periodically check WebSocket status and restart if needed
    // Use a longer interval to reduce the frequency of checks
    wsCheckInterval = setInterval(() => {
      // Only check if WebSockets should be enabled
      if (USE_WEBSOCKETS && user?.restaurant_id) {
        const { websocketConnected } = useOrderStore.getState();
        const centralWebSocketConnected = webSocketManager.isConnected();
        const localWebSocketConnected = isConnected;
        
        // Only log if there's a change in connection status
        const lastConnectionStatus = connectionStatusRef.current;
        const currentConnectionStatus = { local: localWebSocketConnected, order: websocketConnected };
        
        // Check if status has changed
        if (lastConnectionStatus.local !== currentConnectionStatus.local || 
            lastConnectionStatus.order !== currentConnectionStatus.order) {
          // Update the connection status ref
          connectionStatusRef.current = currentConnectionStatus;
        }
        
        // If centralized WebSocket should be connected but isn't, try to reconnect
        if (!centralWebSocketConnected && !reconnectingRef.current) {
          reconnectingRef.current = true;
          
          // Use a timeout to prevent immediate reconnection attempts
          setTimeout(() => {
            initializeWebSocket();
            reconnectingRef.current = false;
          }, 2000);
        }
        
        // If WebSocket is connected but polling is still running, stop polling
        if (centralWebSocketConnected && pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      }
    }, 60000); // Check every 60 seconds instead of 30 to reduce frequency
    
    // Cleanup function
    return () => {
      if (wsCleanupTimeout) {
        clearTimeout(wsCleanupTimeout);
      }
      if (wsCheckInterval) {
        clearInterval(wsCheckInterval);
      }
      
      // Set admin context to false since we're leaving the admin dashboard
      webSocketManager.setAdminContext(false);
      
      // Unregister AdminDashboard notification handlers
      webSocketManager.unregisterHandler(NotificationType.NEW_ORDER, undefined, 'AdminDashboard');
      
      // Only unregister OrderStore handlers, don't disconnect the centralized connection
      // Other components may still need it
      useOrderStore.getState().stopWebSocketConnection();
      
      // Note: We don't call webSocketManager.disconnect() here because
      // other components (like OrderManager) may still need the connection
    };
  }, [user, USE_WEBSOCKETS, isConnected]);
  
  // Effect to check for low stock items and display notifications - TEMPORARILY DISABLED
  useEffect(() => {
    // Temporarily disabled low stock notifications
    
    // Clear any existing low stock notifications that might be displayed
    menuItems.forEach(item => {
      if (item.id) {
        toastUtils.dismiss(`low_stock_${item.id}`);
      }
    });
    
    // No-op for now - will be re-enabled when tenant isolation is fully implemented
    return;
  }, [menuItems]);

// SIMPLIFIED POLLING IMPLEMENTATION WITH WEBSOCKET PRIORITY
// Use a ref to track if the component is mounted and to store the polling interval
const mountedRef = useRef(false);
const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
// Track when we last checked WebSocket status to avoid excessive checks
const lastWebSocketCheckRef = useRef<number>(Date.now());
// Track the current connection status to avoid unnecessary logs
const connectionStatusRef = useRef<{local: boolean, order: boolean}>({local: false, order: false});
// Track if we're currently attempting to reconnect to prevent multiple reconnection attempts
const reconnectingRef = useRef<boolean>(false);
// Track if we're currently fetching notifications to prevent duplicate requests
const fetchingNotificationsRef = useRef<boolean>(false);

// This effect runs once on mount to check for unacknowledged orders
useEffect(() => {
  // Skip if not an admin or super_admin user (NOT staff)
  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return;
  }

  // Even if WebSockets are enabled and connected, still do an initial check
  // to make sure we don't miss any orders that came in before we connected
  // AdminDashboard: Performing initial order check on mount
  
  // Clear any existing polling interval
  if (pollingIntervalRef.current) {
    // WebSocket: Clearing existing polling interval on mount
    clearInterval(pollingIntervalRef.current);
    pollingIntervalRef.current = null;
  }

  // Mark as mounted
  mountedRef.current = true;
  
  // Function to check for unacknowledged orders
  const checkForUnacknowledgedOrders = async () => {
    if (!mountedRef.current) return;
    
    // Prevent duplicate API calls
    if (fetchingNotificationsRef.current) {
      // AdminDashboard: Already fetching notifications, skipping duplicate call
      return;
    }
    
    // Check WebSocket status before making API calls
    const orderStoreWebSocketConnected = useOrderStore.getState().websocketConnected;
    if (USE_WEBSOCKETS && (isConnected || orderStoreWebSocketConnected)) {
      // AdminDashboard: WebSocket connected, skipping polling for orders
      return;
    }
    
    try {
      fetchingNotificationsRef.current = true;
      // AdminDashboard: Checking for unacknowledged orders...
      
      // Get unacknowledged orders from the last 24 hours for the current restaurant only
      const url = `/orders/unacknowledged?hours=24${currentRestaurantId ? `&restaurant_id=${currentRestaurantId}` : ''}`;
      const fetchedOrders: Order[] = await api.get(url);
      
      if (!mountedRef.current) {
        fetchingNotificationsRef.current = false;
        return;
      }
      
      // AdminDashboard: Unacknowledged orders: ${fetchedOrders.length}
      
      // Filter out staff-created orders and orders that have already been acknowledged globally
      const nonStaffOrders = fetchedOrders.filter(order =>
        !order.staff_created && !order.global_last_acknowledged_at
      );
      
      // Update unacknowledged orders state with only non-staff orders that haven't been acknowledged globally
      setUnacknowledgedOrders(nonStaffOrders);
      
      // Display notifications for unacknowledged orders (already filtered)
      nonStaffOrders.forEach(order => {
        // AdminDashboard: Displaying notification for order: ${order.id}
        displayOrderNotification(order);
      });
      
      // Update lastOrderId if needed
      if (fetchedOrders.length > 0) {
        const maxId = Math.max(...fetchedOrders.map((o) => Number(o.id)));
        if (maxId > lastOrderId) {
          setLastOrderId(maxId);
        }
      }
      
      // Add a delay before allowing another fetch
      setTimeout(() => {
        fetchingNotificationsRef.current = false;
      }, 5000); // 5 second cooldown between fetches
    } catch (err) {
      console.error('[AdminDashboard] Failed to check for unacknowledged orders:', err);
      fetchingNotificationsRef.current = false;
    }
  };
  
  // Only check for unacknowledged orders if WebSockets are not enabled or not connected
  if (!USE_WEBSOCKETS || !isConnected) {
    checkForUnacknowledgedOrders();
  }
  
  // Clean up function
  return () => {
    mountedRef.current = false;
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [isConnected]); // Add isConnected to dependencies

// Simplified polling setup - only used when WebSockets are not available
useEffect(() => {
  // Get the WebSocket connection status directly from orderStore
  const orderStoreWebSocketConnected = useOrderStore.getState().websocketConnected;
  
  // Update connection status ref
  connectionStatusRef.current = {
    local: isConnected,
    order: orderStoreWebSocketConnected
  };
  
  // Skip if not an admin or super_admin user (NOT staff) or if WebSockets are working
  if (!user ||
      (user.role !== 'admin' && user.role !== 'super_admin') ||
      (USE_WEBSOCKETS && (isConnected || orderStoreWebSocketConnected))) {
    // If WebSockets are connected, clear any existing polling interval
    if (USE_WEBSOCKETS && (isConnected || orderStoreWebSocketConnected) && pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    return;
  }
  
  // Only set up polling if we don't already have an interval
  if (pollingIntervalRef.current) {
    return;
  }
  
      // Function to check for new orders
    const checkForNewOrders = async () => {
      // Prevent duplicate API calls
      if (fetchingNotificationsRef.current) {
        return;
      }
      
      // Get the latest WebSocket connection status from orderStore
      const currentOrderStoreWebSocketConnected = useOrderStore.getState().websocketConnected;
      
      // Update last check timestamp
      lastWebSocketCheckRef.current = Date.now();
      
      // Double-check WebSocket status before polling
      if (USE_WEBSOCKETS && (isConnected || currentOrderStoreWebSocketConnected)) {
        // If polling interval exists but WebSockets are connected, clear the interval
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        
        // If WebSocket is connected but we're still in this function, something might be wrong
        // Force reconnect the WebSocket to ensure it's working properly, but only if it's been a while
        if (Date.now() - lastWebSocketCheckRef.current > 120000 && !reconnectingRef.current) { // Only force reconnect if it's been more than 2 minutes
          reconnectingRef.current = true;
          
          setTimeout(() => {
            if (isConnected && USE_WEBSOCKETS && user?.role && ['admin', 'super_admin', 'staff'].includes(user.role)) {
              // Reconnect local WebSocket (restaurant channel only)
              connectWebSocket();
            }
            if (currentOrderStoreWebSocketConnected) {
              // Reconnect order store WebSocket
              useOrderStore.getState().stopWebSocketConnection();
              setTimeout(() => useOrderStore.getState().startWebSocketConnection(), 1000);
            }
            reconnectingRef.current = false;
          }, 2000);
        }
        
        return;
      }
    
    if (!mountedRef.current) return;
    
    try {
      fetchingNotificationsRef.current = true;
      // Polling: Checking for new orders since ID: ${lastOrderId}
      
      const url = `/orders/new_since/${lastOrderId}`;
      const newOrders: Order[] = await api.get(url);
      
      if (!mountedRef.current) {
        fetchingNotificationsRef.current = false;
        return;
      }
      
      if (newOrders.length > 0) {
        // Filter out staff-created orders and orders that have already been acknowledged globally
        const nonStaffOrders = newOrders.filter(order =>
          !order.staff_created && !order.global_last_acknowledged_at
        );
        
        // Display notifications for non-staff orders that haven't been acknowledged globally
        nonStaffOrders.forEach((order) => {
          displayOrderNotification(order);
        });
        
        // Add non-staff orders to unacknowledged orders
        setUnacknowledgedOrders(prev => [...prev, ...nonStaffOrders]);
        
        const maxId = Math.max(...newOrders.map((o) => Number(o.id)));
        setLastOrderId(maxId);
      }
      
      // Add a delay before allowing another fetch
      setTimeout(() => {
        fetchingNotificationsRef.current = false;
      }, 5000); // 5 second cooldown between fetches
    } catch (err) {
      console.error('[AdminDashboard] Failed to poll new orders:', err);
      fetchingNotificationsRef.current = false;
    }
  };
  
  // Clear any existing interval
  if (pollingIntervalRef.current) {
    clearInterval(pollingIntervalRef.current);
    pollingIntervalRef.current = null;
  }
  
  // Only set up polling if WebSockets are disabled or not connected
  // AdminDashboard: Setting up polling for new orders - WebSockets: ${USE_WEBSOCKETS}, connected: ${isConnected}
  
  // Use a longer polling interval to reduce server load
  pollingIntervalRef.current = setInterval(checkForNewOrders, POLLING_INTERVAL * 2);
  
  // Clean up function
  return () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    // Reset fetching flag on unmount
    fetchingNotificationsRef.current = false;
  };
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [lastOrderId, isConnected, USE_WEBSOCKETS]); // Add USE_WEBSOCKETS to dependencies

  return (
    <div className="min-h-screen bg-gray-50 relative">
  {/* Acknowledge All button using the new component */}
  <AcknowledgeAllButton
    count={unacknowledgedOrders.filter(order => 
      currentRestaurantId && order.restaurant_id && 
      String(order.restaurant_id) === String(currentRestaurantId)
    ).length}
    isLoading={isAcknowledgingAll}
    onClick={acknowledgeAllOrders}
    showSuccess={acknowledgeSuccess}
    type="order"
  />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {isStaffOnly ? 'Order Management Dashboard' : 'Admin Dashboard'}
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                {isStaffOnly 
                  ? 'Create, view, and manage customer orders' 
                  : 'Manage orders, menu items, promotions, and more'}
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Stock notification bell and panel - commented out as not currently in use */}
              
              {/* Restaurant selector removed - super admins now only see data for the current restaurant */}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          {/* Tab navigation */}
          <div className="border-b border-gray-200 overflow-x-auto overflow-y-hidden whitespace-nowrap">
            <nav className="flex -mb-px" role="tablist">
              {/* For staff users, simplify the UI by only showing the Orders tab */}
              {isStaffOnly ? (
                <div className="flex-shrink-0 whitespace-nowrap px-4 py-4 border-b-2 border-[#c1902f] text-center font-medium text-sm text-[#c1902f]">
                  <div className="flex items-center">
                    <ShoppingBag className="h-5 w-5 mx-auto mb-1" />
                    Order Management
                  </div>
                </div>
              ) : (
                // Regular tab navigation for admin/super_admin users
                tabs.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => handleTabClick(id as Tab)}
                    className={`
                      flex-shrink-0 whitespace-nowrap px-4 py-4 border-b-2
                      text-center font-medium text-sm
                      ${
                        activeTab === id
                          ? 'border-[#c1902f] text-[#c1902f]'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    <Icon className="h-5 w-5 mx-auto mb-1" />
                    {label}
                  </button>
                ))
              )}
            </nav>
          </div>

          {/* Tab content */}
          <div className="p-4 relative overflow-hidden">
            <div className={`transition-opacity duration-300 ${activeTab === 'analytics' ? 'opacity-100' : 'opacity-0 absolute inset-0 pointer-events-none'}`}>
              {activeTab === 'analytics' && <Suspense fallback={<TabLoadingPlaceholder />}>
                <AnalyticsManager restaurantId={currentRestaurantId} />
              </Suspense>}
            </div>
            
            <div className={`transition-opacity duration-300 ${activeTab === 'orders' ? 'opacity-100' : 'opacity-0 absolute inset-0 pointer-events-none'}`}>
              {activeTab === 'orders' && (
                <Suspense fallback={<TabLoadingPlaceholder />}>
                  <OrderManager
                    selectedOrderId={selectedOrderId}
                    setSelectedOrderId={setSelectedOrderId}
                    restaurantId={currentRestaurantId}
                  />
                </Suspense>
              )}
            </div>
            
            <div className={`transition-opacity duration-300 ${activeTab === 'menu' ? 'opacity-100' : 'opacity-0 absolute inset-0 pointer-events-none'}`}>
              {activeTab === 'menu' && (
                <Suspense fallback={<TabLoadingPlaceholder />}>
                  <MenuManager 
                    restaurantId={currentRestaurantId} 
                    selectedMenuItemId={selectedMenuItemId}
                    openInventoryForItem={openInventoryForItem}
                    onInventoryModalClose={() => setOpenInventoryForItem(null)}
                  />
                </Suspense>
              )}
            </div>
            
            <div className={`transition-opacity duration-300 ${activeTab === 'reservations' ? 'opacity-100' : 'opacity-0 absolute inset-0 pointer-events-none'}`}>
              {activeTab === 'reservations' && <Suspense fallback={<TabLoadingPlaceholder />}>
                <ReservationsManager />
              </Suspense>}
            </div>
            
            <div className={`transition-opacity duration-300 ${activeTab === 'promos' ? 'opacity-100' : 'opacity-0 absolute inset-0 pointer-events-none'}`}>
              {activeTab === 'promos' && <Suspense fallback={<TabLoadingPlaceholder />}>
                <PromoManager restaurantId={currentRestaurantId} />
              </Suspense>}
            </div>
            
            <div className={`transition-opacity duration-300 ${activeTab === 'merchandise' ? 'opacity-100' : 'opacity-0 absolute inset-0 pointer-events-none'}`}>
              {activeTab === 'merchandise' && <Suspense fallback={<TabLoadingPlaceholder />}>
                <MerchandiseManager />
              </Suspense>}
            </div>
            
            <div className={`transition-opacity duration-300 ${activeTab === 'staff' ? 'opacity-100' : 'opacity-0 absolute inset-0 pointer-events-none'}`}>
              {activeTab === 'staff' && <Suspense fallback={<TabLoadingPlaceholder />}>
                <StaffManagement />
              </Suspense>}
            </div>
            
            <div className={`transition-opacity duration-300 ${activeTab === 'settings' ? 'opacity-100' : 'opacity-0 absolute inset-0 pointer-events-none'}`}>
              {activeTab === 'settings' && <Suspense fallback={<TabLoadingPlaceholder />}>
                <SettingsManager restaurantId={currentRestaurantId} />
              </Suspense>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
