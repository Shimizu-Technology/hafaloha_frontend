// src/ordering/components/admin/AdminDashboard.tsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MenuManager } from './MenuManager';
import { OrderManager } from './OrderManager';
import { PromoManager } from './PromoManager';
import { AnalyticsManager } from './AnalyticsManager';
import { SettingsManager } from './SettingsManager';
import MerchandiseManager from './MerchandiseManager';
import RestaurantSelector from './RestaurantSelector';
import NotificationContainer from '../../../shared/components/notifications/NotificationContainer';
import {
  BarChart2,
  ShoppingBag,
  LayoutGrid,
  Tag,
  Sliders,
  X as XIcon,
  CheckCircle,
  ShoppingCart,
  AlertCircle,
  Bell,
  Package
} from 'lucide-react';
import AcknowledgeAllButton from '../../../shared/components/notifications/AcknowledgeAllButton';
import { api } from '../../lib/api';
import toastUtils from '../../../shared/utils/toastUtils';
import { useAuthStore } from '../../store/authStore';
import useNotificationStore from '../../store/notificationStore';
import { Order, OrderManagerProps, ManagerProps } from '../../types/order';
import { MenuItem } from '../../types/menu';
import { useMenuStore } from '../../store/menuStore';
import { useOrderStore } from '../../store/orderStore';
import { calculateAvailableQuantity } from '../../utils/inventoryUtils';
import useWebSocket from '../../../shared/hooks/useWebSocket';

type Tab = 'analytics' | 'orders' | 'menu' | 'promos' | 'settings' | 'merchandise';

export function AdminDashboard() {
  const { user } = useAuthStore();
  const [currentRestaurantId, setCurrentRestaurantId] = useState<string | undefined>(
    user?.restaurant_id
  );

  // List of tabs
  const tabs = [
    { id: 'analytics', label: 'Analytics', icon: BarChart2 },
    { id: 'orders',    label: 'Orders',    icon: ShoppingBag },
    { id: 'menu',      label: 'Menu',      icon: LayoutGrid },
    { id: 'merchandise', label: 'Merchandise', icon: ShoppingCart },
    { id: 'promos',    label: 'Promos',    icon: Tag },
    { id: 'settings',  label: 'Settings',  icon: Sliders },
  ] as const;

  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const stored = localStorage.getItem('adminTab');
    if (stored && ['analytics','orders','menu','merchandise','promos','settings'].includes(stored)) {
      return stored as Tab;
    }
    return 'analytics';
  });

  function handleTabClick(id: Tab) {
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
const POLLING_INTERVAL = 5000; // 5 seconds - could be moved to a config file or environment variable
const USE_WEBSOCKETS = true; // Enable WebSockets with polling fallback
const WEBSOCKET_DEBUG = true; // Enable detailed WebSocket logging
console.log('[AdminDashboard] WEBSOCKET CONFIG:', { USE_WEBSOCKETS, WEBSOCKET_DEBUG });


  // Polling for new orders - track the highest order ID we've seen
  // Note: We no longer use localStorage to persist this value between sessions
  // because the server now handles first-time users and cache clears by tracking
  // global acknowledgment timestamps
  const [lastOrderId, setLastOrderId] = useState<number>(0);

  // Track unacknowledged orders
  const [unacknowledgedOrders, setUnacknowledgedOrders] = useState<Order[]>([]);
  
  // Stock notification states
  const [showStockNotifications, setShowStockNotifications] = useState(false);
  const [stockAlertCount, setStockAlertCount] = useState(0);
  const { getStockAlerts, hasUnacknowledgedNotifications, fetchNotifications } = useNotificationStore();
  const { menuItems } = useMenuStore();
  
  // Track acknowledged low stock items with their quantities to avoid showing the same notification repeatedly
  const [acknowledgedLowStockItems, setAcknowledgedLowStockItems] = useState<Record<string, number>>(() => {
    const stored = localStorage.getItem('acknowledgedLowStockItems');
    return stored ? JSON.parse(stored) : {};
  });
  
  // For editing menu item and inventory management
  const [selectedMenuItemId, setSelectedMenuItemId] = useState<string | null>(null);
  const [openInventoryForItem, setOpenInventoryForItem] = useState<string | null>(null);
  
  // Loading and success states for acknowledge all button
  const [isAcknowledgingAll, setIsAcknowledgingAll] = useState(false);
  const [acknowledgeSuccess, setAcknowledgeSuccess] = useState(false);

  // Function to acknowledge an order via the API
  const acknowledgeOrder = async (orderId: number) => {
    try {
      await api.post(`/orders/${orderId}/acknowledge`);
      console.log(`[AdminDashboard] Order ${orderId} acknowledged`);
      
      // Remove from unacknowledged orders list
      setUnacknowledgedOrders(prev => prev.filter(order => Number(order.id) !== orderId));
    } catch (err) {
      console.error(`[AdminDashboard] Failed to acknowledge order ${orderId}:`, err);
    }
  };
  
  // Function to acknowledge all unacknowledged orders
  const acknowledgeAllOrders = async () => {
    if (isAcknowledgingAll) return; // Prevent multiple clicks
    
    try {
      setIsAcknowledgingAll(true);
      
      // Create a copy of the current unacknowledged orders
      const ordersToAcknowledge = [...unacknowledgedOrders];
      
      // Clear toast notifications for all unacknowledged orders
      ordersToAcknowledge.forEach(order => {
        toastUtils.dismiss(`new_order_${order.id}`);
      });
      
      // Acknowledge each order
      for (const order of ordersToAcknowledge) {
        await acknowledgeOrder(Number(order.id));
      }
      
      // Clear the unacknowledged orders list
      setUnacknowledgedOrders([]);
      
      // Show success state
      setAcknowledgeSuccess(true);
      setTimeout(() => setAcknowledgeSuccess(false), 2000);
      
      // Show success toast
      toastUtils.success(`${ordersToAcknowledge.length} orders acknowledged`);
    } catch (err) {
      console.error('[AdminDashboard] Failed to acknowledge all orders:', err);
      toastUtils.error('Failed to acknowledge all orders');
    } finally {
      setIsAcknowledgingAll(false);
    }
  };

  // Function to display order notification with improved handling
  const displayOrderNotification = useCallback((order: Order) => {
    // Skip displaying notification if the order has already been acknowledged globally
    if (order.global_last_acknowledged_at) {
      console.log(`[Notification] Skipping already acknowledged order: ${order.id}`);
      return;
    }

    console.log(`[Notification] Displaying notification for order: ${order.id}`, {
      status: order.status,
      items: order.items?.length,
      timestamp: new Date().toISOString()
    });
    
    // Handle both snake_case and camelCase date formats
    const createdAtStr = new Date(order.created_at || order.createdAt || Date.now()).toLocaleString();
    const itemCount = order.items?.length || 0;
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

    // Generate a unique ID that includes a timestamp to prevent collisions
    const notificationId = `new_order_${order.id}_${Date.now()}`;
    
    // Create the notification with a guaranteed unique ID
    toastUtils.custom((t) => (
      <div
        className={`relative bg-white rounded-xl shadow-lg p-4 border border-gray-100 animate-slideUp transition-all duration-300 ${t.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        style={{ width: '350px', maxWidth: '95vw' }}
      >
        {/* Close button */}
        <button
          onClick={() => {
            console.log(`[Notification] Dismissing notification: ${notificationId}`);
            toastUtils.dismiss(notificationId);
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
                New Order #{order.id}
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
        </div>

        {/* Action buttons */}
        <div className="flex space-x-2">
          <button
            onClick={() => {
              console.log(`[Notification] Viewing order: ${order.id}`);
              toastUtils.dismiss(notificationId);
              acknowledgeOrder(Number(order.id));
              
              // Use a Promise to ensure sequential execution
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
                });
            }}
            className="flex-1 bg-[#c1902f] text-white px-3 py-2 rounded-lg font-medium text-sm hover:bg-[#d4a43f] transition-colors shadow-sm"
          >
            View Order
          </button>
          <button
            onClick={() => {
              console.log(`[Notification] Dismissing order: ${order.id}`);
              toastUtils.dismiss(notificationId);
              acknowledgeOrder(Number(order.id));
            }}
            className="w-24 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-200 transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    ), {
      duration: Infinity,
      id: notificationId,
      position: 'top-right',
      // Ensure notifications stack instead of replacing each other
      style: {
        marginBottom: '1rem'
      }
    });
  }, [activeTab, acknowledgeOrder]);

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
    console.log('[WebSocket] Processing new order:', order.id, {
      isStaffCreated: order.staff_created,
      isAcknowledged: !!order.global_last_acknowledged_at,
      currentLastOrderId: lastOrderId
    });
    
    // Skip staff-created orders and already acknowledged orders
    if (order.staff_created || order.global_last_acknowledged_at) {
      console.log('[WebSocket] Skipping notification for staff-created or acknowledged order:', order.id);
      return;
    }
    
    // Force update the orders in the store to ensure UI updates
    useOrderStore.getState().handleNewOrder(order);
    
    // Update the last order ID if needed
    if (Number(order.id) > lastOrderId) {
      console.log('[WebSocket] Updating lastOrderId:', {
        previous: lastOrderId,
        new: Number(order.id)
      });
      setLastOrderId(Number(order.id));
    }
    
    // Add to unacknowledged orders if not already present
    setUnacknowledgedOrders(prev => {
      // Check if order is already in the list
      const exists = prev.some(o => Number(o.id) === Number(order.id));
      if (exists) {
        console.log('[WebSocket] Order already in unacknowledged list:', order.id);
        return prev;
      }
      console.log('[WebSocket] Adding order to unacknowledged list:', order.id);
      return [...prev, order];
    });
    
    // Ensure notification is displayed with a slight delay to prevent race conditions
    setTimeout(() => {
      console.log('[WebSocket] Displaying notification for order:', order.id);
      displayOrderNotification(order);
    }, 100);
  }, [lastOrderId, displayOrderNotification]);
  
  const handleLowStock = useCallback((item: MenuItem) => {
    console.log('[WebSocket] Received low stock alert:', item);
    
    const availableQty = calculateAvailableQuantity(item);
    const acknowledgedQty = acknowledgedLowStockItems[item.id];
    
    // Show notification if:
    // 1. Item has never been acknowledged, or
    // 2. Current quantity is lower than when it was last acknowledged
    if (acknowledgedQty === undefined || availableQty < acknowledgedQty) {
      displayLowStockNotification(item);
    }
  }, [acknowledgedLowStockItems, calculateAvailableQuantity, displayLowStockNotification]);
  
  // Initialize WebSocket connection
  const { isConnected, error: wsError, connect: connectWebSocket } = useWebSocket({
    autoConnect: USE_WEBSOCKETS && !!user && (user.role === 'admin' || user.role === 'super_admin'),
    onNewOrder: handleNewOrder,
    onLowStock: handleLowStock,
    onConnected: () => {
      console.debug('[WebSocket] Connected successfully', {
        user: user?.id,
        restaurant: user?.restaurant_id,
        role: user?.role,
        useWebsockets: USE_WEBSOCKETS,
        isPolling: !!pollingIntervalRef.current
      });
      
      // Clear any existing polling interval when WebSocket connects
      if (pollingIntervalRef.current) {
        console.debug('[WebSocket] Clearing existing polling interval');
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      
      // Initial fetch when connected
      fetchNotifications(24, 'low_stock');
      
      // Ensure we're subscribed to the order channel
      if (user?.restaurant_id) {
        console.debug('[WebSocket] Ensuring order WebSocket connection is active on connect');
        // Force restart the order store WebSocket connection
        useOrderStore.getState().stopWebSocketConnection();
        setTimeout(() => {
          useOrderStore.getState().startWebSocketConnection();
        }, 100);
      }
    },
    onDisconnected: () => {
      console.debug('[WebSocket] Disconnected, may fall back to polling', {
        user: user?.id,
        restaurant: user?.restaurant_id,
        wasConnected: isConnected,
        useWebsockets: USE_WEBSOCKETS,
        isPolling: !!pollingIntervalRef.current
      });
      
      // If WebSockets are still enabled but we got disconnected, attempt to reconnect
      if (USE_WEBSOCKETS && user?.role === 'admin' || user?.role === 'super_admin') {
        console.debug('[WebSocket] Will attempt to reconnect');
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
    console.debug('[WebSocket] Connection status changed', {
      isConnected,
      useWebsockets: USE_WEBSOCKETS,
      isPolling: !!pollingIntervalRef.current,
      error: wsError?.message
    });
  }, [isConnected, wsError]);
  
  // Add effect for stock notifications (fallback to polling if WebSockets fail)
  useEffect(() => {
    // Only run for admin users
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return;
    }
    
    // Fetch stock notifications on component mount
    fetchNotifications(24, 'low_stock');
    
    // Set up polling interval for stock notifications if WebSockets are disabled
    let interval: NodeJS.Timeout | null = null;
    
    if (!USE_WEBSOCKETS) {
      interval = setInterval(() => {
        console.debug('[Polling] Fetching stock notifications');
        fetchNotifications(24, 'low_stock');
      }, POLLING_INTERVAL * 2); // Poll at a slower rate than orders
    } else if (isConnected) {
      console.debug('[WebSocket] Connected, disabling polling');
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    }
    
    return () => {
      if (interval) {
        console.debug('[Polling] Cleaning up polling interval');
        clearInterval(interval);
      }
    };
  }, [fetchNotifications, user, isConnected]);
  
  // Update stock alert count when notifications change
  useEffect(() => {
    const stockAlerts = getStockAlerts();
    // Ensure stockAlerts is an array before accessing length
    setStockAlertCount(Array.isArray(stockAlerts) ? stockAlerts.length : 0);
  }, [getStockAlerts]);
  
  
  // Handle stock notification view
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
  
  // Single WebSocket connection management
  useEffect(() => {
    // Only run for admin users
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      console.log('[WebSocket] Skipping connection - not an admin user');
      return;
    }
    
    let wsCleanupTimeout: NodeJS.Timeout;
    
    const initializeWebSocket = () => {
      if (USE_WEBSOCKETS && user?.restaurant_id) {
        console.log('[WebSocket] Initializing connection', {
          userId: user.id,
          restaurantId: user.restaurant_id,
          role: user.role
        });
        
        // Clear any existing connections first
        useOrderStore.getState().stopWebSocketConnection();
        
        // Wait for cleanup before establishing new connections
        wsCleanupTimeout = setTimeout(() => {
          console.log('[WebSocket] Establishing new connections');
          connectWebSocket();
          useOrderStore.getState().startWebSocketConnection();
        }, 500);
      }
    };
    
    // Initialize WebSocket connection
    initializeWebSocket();
    
    // Cleanup function
    return () => {
      console.log('[WebSocket] Cleaning up connections');
      if (wsCleanupTimeout) {
        clearTimeout(wsCleanupTimeout);
      }
      useOrderStore.getState().stopWebSocketConnection();
    };
  }, [user, USE_WEBSOCKETS]);
  
  // Effect to check for low stock items and display notifications
  useEffect(() => {
    // Only run for admin users
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return;
    }
    
    // Check for low stock items
    const lowStockItems = menuItems.filter(item => {
      if (!item.enable_stock_tracking) return false;
      
      const availableQty = calculateAvailableQuantity(item);
      const threshold = item.low_stock_threshold || 10;
      
      return availableQty > 0 && availableQty <= threshold;
    });
    
    // Display notifications for low stock items that haven't been acknowledged
    // or where the quantity has decreased since last acknowledgment
    lowStockItems.forEach(item => {
      const availableQty = calculateAvailableQuantity(item);
      const acknowledgedQty = acknowledgedLowStockItems[item.id];
      
      // Show notification if:
      // 1. Item has never been acknowledged, or
      // 2. Current quantity is lower than when it was last acknowledged
      if (acknowledgedQty === undefined || availableQty < acknowledgedQty) {
        displayLowStockNotification(item);
      }
    });
  }, [menuItems, acknowledgedLowStockItems, user, calculateAvailableQuantity, displayLowStockNotification]);

// SIMPLIFIED POLLING IMPLEMENTATION
// Use a ref to track if the component is mounted and to store the polling interval
const mountedRef = useRef(false);
const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

// This effect runs once on mount to check for unacknowledged orders
useEffect(() => {
  // Skip if not an admin user
  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return;
  }

  // Even if WebSockets are enabled and connected, still do an initial check
  // to make sure we don't miss any orders that came in before we connected
  console.debug('[AdminDashboard] Performing initial order check on mount');
  
  // Clear any existing polling interval
  if (pollingIntervalRef.current) {
    console.debug('[WebSocket] Clearing existing polling interval on mount');
    clearInterval(pollingIntervalRef.current);
    pollingIntervalRef.current = null;
  }

  // Mark as mounted
  mountedRef.current = true;
  
  // Function to check for unacknowledged orders
  const checkForUnacknowledgedOrders = async () => {
    if (!mountedRef.current) return;
    
    try {
      console.log('[AdminDashboard] Checking for unacknowledged orders...');
      
      // Get unacknowledged orders from the last 24 hours
      const url = `/orders/unacknowledged?hours=24`;
      const fetchedOrders: Order[] = await api.get(url);
      
      if (!mountedRef.current) return;
      
      console.log('[AdminDashboard] Unacknowledged orders:', fetchedOrders.length);
      
      // Filter out staff-created orders and orders that have already been acknowledged globally
      const nonStaffOrders = fetchedOrders.filter(order =>
        !order.staff_created && !order.global_last_acknowledged_at
      );
      
      // Update unacknowledged orders state with only non-staff orders that haven't been acknowledged globally
      setUnacknowledgedOrders(nonStaffOrders);
      
      // Display notifications for unacknowledged orders (already filtered)
      nonStaffOrders.forEach(order => {
        console.log('[AdminDashboard] Displaying notification for order:', order.id);
        displayOrderNotification(order);
      });
      
      // Update lastOrderId if needed
      if (fetchedOrders.length > 0) {
        const maxId = Math.max(...fetchedOrders.map((o) => Number(o.id)));
        if (maxId > lastOrderId) {
          setLastOrderId(maxId);
        }
      }
    } catch (err) {
      console.error('[AdminDashboard] Failed to check for unacknowledged orders:', err);
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
  // Skip if not an admin user or if WebSockets are working
  if (!user ||
      (user.role !== 'admin' && user.role !== 'super_admin') ||
      (USE_WEBSOCKETS && isConnected)) {
    return;
  }

  console.log('[Polling] Setting up polling fallback', {
    useWebsockets: USE_WEBSOCKETS,
    isConnected,
    hasPollingInterval: !!pollingIntervalRef.current
  });
  
  // Function to check for new orders
  const checkForNewOrders = async () => {
    // Double-check WebSocket status before polling
    if (USE_WEBSOCKETS && isConnected) {
      console.debug('[Polling] WebSocket is connected, skipping polling');
      // Double-check that we're subscribed to the order channel
      if (user?.restaurant_id && !useOrderStore.getState().websocketConnected) {
        console.debug('[Polling] WebSocket is connected but orderStore is not, reconnecting');
        // Force restart the order store WebSocket connection
        useOrderStore.getState().stopWebSocketConnection();
        setTimeout(() => {
          useOrderStore.getState().startWebSocketConnection();
        }, 100);
      }
      return;
    }
    
    if (!mountedRef.current) return;
    
    try {
      console.log('[Polling] Checking for new orders since ID:', lastOrderId, {
        useWebsockets: USE_WEBSOCKETS,
        isConnected,
        hasPollingInterval: !!pollingIntervalRef.current
      });
      
      const url = `/orders/new_since/${lastOrderId}`;
      const newOrders: Order[] = await api.get(url);
      
      if (!mountedRef.current) return;
      
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
    } catch (err) {
      console.error('[AdminDashboard] Failed to poll new orders:', err);
    }
  };
  
  // Clear any existing interval
  if (pollingIntervalRef.current) {
    clearInterval(pollingIntervalRef.current);
    pollingIntervalRef.current = null;
  }
  
  // Only set up polling if WebSockets are disabled or not connected
  console.log('[AdminDashboard] Setting up polling for new orders', {
    useWebsockets: USE_WEBSOCKETS,
    isConnected,
    hasPollingInterval: !!pollingIntervalRef.current
  });
  
  pollingIntervalRef.current = setInterval(checkForNewOrders, POLLING_INTERVAL);
  
  // Clean up function
  return () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [lastOrderId, isConnected, USE_WEBSOCKETS]); // Add USE_WEBSOCKETS to dependencies

  return (
    <div className="min-h-screen bg-gray-50 relative">
  {/* Acknowledge All button using the new component */}
  <AcknowledgeAllButton
    count={unacknowledgedOrders.length}
    isLoading={isAcknowledgingAll}
    onClick={acknowledgeAllOrders}
    showSuccess={acknowledgeSuccess}
    type="order"
  />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="mt-2 text-sm text-gray-600">
                Manage orders, menu items, promotions, and more
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Stock notification bell */}
              <div className="relative">
                <button
                  onClick={() => setShowStockNotifications(!showStockNotifications)}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors relative focus:outline-none"
                >
                  <Bell className="h-6 w-6 text-gray-500" />
                  {stockAlertCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {stockAlertCount > 9 ? '9+' : stockAlertCount}
                    </span>
                  )}
                </button>
                
                {/* Stock notification panel */}
                {showStockNotifications && (
                  <div className="absolute right-0 mt-2 z-50 w-96 max-w-[95vw]">
                    <NotificationContainer 
                      notificationType="low_stock"
                      title="Stock Alerts"
                      maxDisplayed={10} // Increased from 5 to allow more notifications
                      onClose={() => setShowStockNotifications(false)}
                      onView={handleStockNotificationView}
                      className="border-t-4 border-yellow-500"
                    />
                  </div>
                )}
              </div>
              
              {/* Restaurant selector - only for super admins */}
              {user?.role === 'super_admin' && (
                <div className="mt-4 md:mt-0 md:ml-4 w-full md:w-64">
                  <RestaurantSelector 
                    onRestaurantChange={(restaurantId) => {
                      setCurrentRestaurantId(restaurantId);
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          {/* Tab navigation */}
          <div className="border-b border-gray-200 overflow-x-auto">
            <nav className="flex -mb-px" role="tablist">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => handleTabClick(id)}
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
              ))}
            </nav>
          </div>

          {/* Tab content */}
          <div className="p-4 relative overflow-hidden">
            <div className={`transition-opacity duration-300 ${activeTab === 'analytics' ? 'opacity-100' : 'opacity-0 absolute inset-0 pointer-events-none'}`}>
              {activeTab === 'analytics' && <AnalyticsManager restaurantId={currentRestaurantId} />}
            </div>
            
            <div className={`transition-opacity duration-300 ${activeTab === 'orders' ? 'opacity-100' : 'opacity-0 absolute inset-0 pointer-events-none'}`}>
              {activeTab === 'orders' && (
                <OrderManager
                  selectedOrderId={selectedOrderId}
                  setSelectedOrderId={setSelectedOrderId}
                  restaurantId={currentRestaurantId}
                />
              )}
            </div>
            
            <div className={`transition-opacity duration-300 ${activeTab === 'menu' ? 'opacity-100' : 'opacity-0 absolute inset-0 pointer-events-none'}`}>
              {activeTab === 'menu' && (
                <MenuManager 
                  restaurantId={currentRestaurantId} 
                  selectedMenuItemId={selectedMenuItemId}
                  openInventoryForItem={openInventoryForItem}
                  onInventoryModalClose={() => setOpenInventoryForItem(null)}
                />
              )}
            </div>
            
            <div className={`transition-opacity duration-300 ${activeTab === 'promos' ? 'opacity-100' : 'opacity-0 absolute inset-0 pointer-events-none'}`}>
              {activeTab === 'promos' && <PromoManager restaurantId={currentRestaurantId} />}
            </div>
            
            <div className={`transition-opacity duration-300 ${activeTab === 'merchandise' ? 'opacity-100' : 'opacity-0 absolute inset-0 pointer-events-none'}`}>
              {activeTab === 'merchandise' && <MerchandiseManager />}
            </div>
            
            <div className={`transition-opacity duration-300 ${activeTab === 'settings' ? 'opacity-100' : 'opacity-0 absolute inset-0 pointer-events-none'}`}>
              {activeTab === 'settings' && <SettingsManager restaurantId={currentRestaurantId} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
