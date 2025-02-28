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

  useEffect(() => {
    // Only run polling for admin users
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return;
    }

    // Set up polling with visibility detection
    let pollingInterval: number | null = null;
    
    // Function to check for new orders
    const checkForNewOrders = async () => {
      try {
        const url = `/orders/new_since/${lastOrderId}`;
        const newOrders: Order[] = await api.get(url);

        if (newOrders.length > 0) {
          newOrders.forEach((order) => {
            const createdAtStr = new Date(order.createdAt).toLocaleString();
            const itemCount = order.items?.length || 0;
            const totalPrice = (order.total ?? 0).toFixed(2);
            const contactName = (order as any).contact_name || 'N/A';

            toast.custom((t) => (
              <div
                className="relative bg-white rounded-lg shadow-lg p-4 max-w-sm border border-gray-200"
                style={{ minWidth: '260px' }}
              >
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
                >
                  <XIcon className="h-4 w-4" />
                </button>

                <div className="flex items-center space-x-2">
                  <ShoppingBag className="h-6 w-6 text-[#c1902f]" />
                  <h4 className="text-sm font-semibold text-gray-900">
                    New Order #{order.id}
                  </h4>
                </div>

                <div className="mt-3 text-sm text-gray-700">
                  <p className="text-xs text-gray-500">Created: {createdAtStr}</p>
                  <p className="mt-1">
                    {itemCount} item{itemCount !== 1 ? 's' : ''} • ${totalPrice}
                  </p>
                  <p className="mt-1">
                    <span className="font-medium">Name:</span> {contactName}
                  </p>
                </div>

                <div className="mt-4 text-right flex space-x-2 justify-end">
                  <button
                    onClick={() => {
                      toast.dismiss(t.id);
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
                    className="bg-[#c1902f] text-white px-3 py-1 rounded hover:bg-[#d4a43f] text-sm"
                  >
                    View Order
                  </button>
                  <button
                    onClick={() => toast.dismiss(t.id)}
                    className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ), {
              duration: Infinity,
              id: `new_order_${order.id}`,
            });
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
