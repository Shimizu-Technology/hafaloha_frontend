// src/ordering/components/admin/AdminDashboard.tsx

import React, { useState, useEffect } from 'react';
import { MenuManager } from './MenuManager';
import { OrderManager } from './OrderManager';
import { PromoManager } from './PromoManager';
import { AnalyticsManager } from './AnalyticsManager';
import { SettingsManager } from './SettingsManager';
import RestaurantSelector from './RestaurantSelector';
import {
  BarChart2,
  ShoppingBag,
  LayoutGrid,
  Tag,
  Sliders,
  X as XIcon
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { Order, OrderManagerProps, ManagerProps } from '../../types/order';

type Tab = 'analytics' | 'orders' | 'menu' | 'promos' | 'settings';

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
    { id: 'promos',    label: 'Promos',    icon: Tag },
    { id: 'settings',  label: 'Settings',  icon: Sliders },
  ] as const;

  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const stored = localStorage.getItem('adminTab');
    if (stored && ['analytics','orders','menu','promos','settings'].includes(stored)) {
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

  // Polling for new orders
  const [lastOrderId, setLastOrderId] = useState<number>(() => {
    const stored = localStorage.getItem('adminLastOrderId');
    return stored ? parseInt(stored, 10) || 0 : 0;
  });

  // Function to acknowledge an order via the API
  const acknowledgeOrder = async (orderId: number) => {
    try {
      await api.post(`/orders/${orderId}/acknowledge`);
      console.log(`[AdminDashboard] Order ${orderId} acknowledged`);
    } catch (err) {
      console.error(`[AdminDashboard] Failed to acknowledge order ${orderId}:`, err);
    }
  };

  // Function to display order notification
  const displayOrderNotification = (order: Order) => {
    const createdAtStr = new Date(order.createdAt).toLocaleString();
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
      
      if (items.length === 1) {
        return items[0].name;
      }
      
      if (items.length === 2) {
        return `${items[0].name} and ${items[1].name}`;
      }
      
      return `${items[0].name} and ${items.length - 1} more`;
    };
    
    toast.custom((t) => (
      <div
        className="relative bg-white rounded-xl shadow-lg p-4 max-w-sm border border-gray-100"
        style={{ minWidth: '280px', maxWidth: '95vw' }}
      >
        {/* Close button */}
        <button
          onClick={() => {
            toast.dismiss(t.id);
            // Acknowledge the order when dismissed
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
              <h4 className="text-base font-bold text-gray-900 truncate pr-2">
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
              <p className="text-sm font-medium text-gray-800 truncate">{contactName}</p>
              <p className="text-xs text-gray-500">Customer</p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex space-x-2">
          <button
            onClick={() => {
              toast.dismiss(t.id);
              // Acknowledge the order when viewing it
              acknowledgeOrder(Number(order.id));
              
              // If we're on Orders, force a re-render so the modal opens
              if (activeTab === 'orders') {
                setSelectedOrderId(null);
                setTimeout(() => {
                  setSelectedOrderId(Number(order.id));
                }, 50);
              } else {
                // Switch tab first
                setActiveTab('orders');
                setSelectedOrderId(Number(order.id));
              }
            }}
            className="flex-1 bg-[#c1902f] text-white px-3 py-2 rounded-lg font-medium text-sm hover:bg-[#d4a43f] transition-colors shadow-sm"
          >
            View Order
          </button>
          <button
            onClick={() => {
              toast.dismiss(t.id);
              // Acknowledge the order when dismissed
              acknowledgeOrder(Number(order.id));
            }}
            className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-200 transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    ), {
      duration: Infinity,
      id: `new_order_${order.id}`,
    });
  };

  useEffect(() => {
    // Only run polling for admin users
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return;
    }

    // Check for unacknowledged orders on mount
    const checkForUnacknowledgedOrders = async () => {
      try {
        console.log('[AdminDashboard] Checking for unacknowledged orders...');
        
        // Get unacknowledged orders from the last 24 hours
        const url = `/orders/unacknowledged?hours=24`;
        const unacknowledgedOrders: Order[] = await api.get(url);
        
        console.log('[AdminDashboard] Unacknowledged orders:', unacknowledgedOrders.length);
        
        // Display notifications for unacknowledged orders
        unacknowledgedOrders.forEach(order => {
          console.log('[AdminDashboard] Displaying notification for order:', order.id);
          displayOrderNotification(order);
        });
        
        // Update lastOrderId if needed
        if (unacknowledgedOrders.length > 0) {
          const maxId = Math.max(...unacknowledgedOrders.map((o) => Number(o.id)));
          if (maxId > lastOrderId) {
            setLastOrderId(maxId);
            localStorage.setItem('adminLastOrderId', String(maxId));
          }
        }
      } catch (err) {
        console.error('[AdminDashboard] Failed to check for unacknowledged orders:', err);
      }
    };
    
    // Check for unacknowledged orders when component mounts
    checkForUnacknowledgedOrders();

    // Set up polling with visibility detection
    let pollingInterval: number | null = null;
    
    // Function to check for new orders
    const checkForNewOrders = async () => {
      try {
        const url = `/orders/new_since/${lastOrderId}`;
        const newOrders: Order[] = await api.get(url);

        if (newOrders.length > 0) {
          // Display notifications for new orders
          newOrders.forEach((order) => {
            displayOrderNotification(order);
          });

          const maxId = Math.max(...newOrders.map((o) => Number(o.id)));
          setLastOrderId(maxId);
          localStorage.setItem('adminLastOrderId', String(maxId));
        }
      } catch (err) {
        console.error('[AdminDashboard] Failed to poll new orders:', err);
        // Error is logged but polling continues
      }
    };
    
    // Function to start polling
    const startPolling = () => {
      // Clear any existing interval first
      if (pollingInterval) clearInterval(pollingInterval);
      
      // Set up new interval
      pollingInterval = setInterval(() => {
        checkForNewOrders().catch(error => {
          console.error('[AdminDashboard] Error checking for new orders:', error);
          // Continue polling even if there's an error
        });
      }, POLLING_INTERVAL);
    };
    
    // Function to stop polling
    const stopPolling = () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
      }
    };
    
    // Start polling immediately
    startPolling();
    
    // Set up visibility change detection to pause polling when tab is not visible
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        // When becoming visible again, check immediately then start polling
        checkForNewOrders().catch(console.error);
        startPolling();
      }
    };
    
    // Add visibility change listener
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Clean up on component unmount
    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, lastOrderId, activeTab]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="mt-2 text-sm text-gray-600">
                Manage orders, menu items, promotions, and more
              </p>
            </div>
            
            {/* Only show for super_admin users who can manage multiple restaurants */}
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
          <div className="p-4">
            {activeTab === 'analytics' && <AnalyticsManager restaurantId={currentRestaurantId} />}
            {activeTab === 'orders' && (
              <OrderManager
                selectedOrderId={selectedOrderId}
                setSelectedOrderId={setSelectedOrderId}
                restaurantId={currentRestaurantId}
              />
            )}
            {activeTab === 'menu' && <MenuManager restaurantId={currentRestaurantId} />}
            {activeTab === 'promos' && <PromoManager restaurantId={currentRestaurantId} />}
            {activeTab === 'settings' && <SettingsManager restaurantId={currentRestaurantId} />}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
