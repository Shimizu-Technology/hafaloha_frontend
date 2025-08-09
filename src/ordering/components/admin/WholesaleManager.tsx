// src/ordering/components/admin/WholesaleManager.tsx

import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Users, 
  ShoppingBag, 
  BarChart3, 
  Download,
  Settings
} from 'lucide-react';
import { useRestaurantStore } from '../../../shared/store/restaurantStore';
import { apiClient } from '../../../shared/api/apiClient';
import FundraiserManager from './wholesale/FundraiserManager';
import ItemManager from './wholesale/ItemManager';
import ParticipantManager from './wholesale/ParticipantManager';
import OrderManager from './wholesale/OrderManager';
import AnalyticsManager from './wholesale/AnalyticsManager';
import FundraiserDetailPage from './wholesale/FundraiserDetailPage';

// Tab definitions for wholesale management
type WholesaleTab = 'fundraisers' | 'items' | 'participants' | 'orders' | 'analytics' | 'settings';

interface Fundraiser {
  id: number;
  name: string;
  slug: string;
  description: string;
  start_date: string;
  end_date: string;
  contact_email: string;
  status: string;
  active: boolean;
  participant_count: number;
  item_count: number;
  total_orders: number;
  total_revenue: number;
  created_at: string;
}

interface WholesaleManagerProps {
  restaurantId?: string;
}

// Tab configuration
const tabs: Array<{
  id: WholesaleTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}> = [
  {
    id: 'fundraisers',
    label: 'Fundraisers',
    icon: Package,
    description: 'Manage fundraising campaigns and events'
  },
  {
    id: 'items',
    label: 'Items',
    icon: ShoppingBag,
    description: 'Manage wholesale products and inventory'
  },
  {
    id: 'participants',
    label: 'Participants',
    icon: Users,
    description: 'Manage fundraiser participants and goals'
  },
  {
    id: 'orders',
    label: 'Orders',
    icon: ShoppingBag,
    description: 'Process and fulfill wholesale orders'
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
    description: 'View fundraiser performance and metrics'
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    description: 'Configure wholesale system settings'
  }
];

export function WholesaleManager({ restaurantId }: WholesaleManagerProps) {
  const { restaurant } = useRestaurantStore();
  
  // Use the provided restaurantId or fall back to the current restaurant
  const currentRestaurantId = restaurantId || restaurant?.id?.toString() || '1';
  
  // Tab state management - keeping for temporary compatibility
  const [activeTab, setActiveTab] = useState<WholesaleTab>(() => {
    // Try to restore from localStorage
    const saved = localStorage.getItem('wholesaleTab');
    if (saved && tabs.some(tab => tab.id === saved)) {
      return saved as WholesaleTab;
    }
    return 'fundraisers'; // Default to fundraisers tab
  });

  // Save tab preference
  useEffect(() => {
    localStorage.setItem('wholesaleTab', activeTab);
  }, [activeTab]);

  // New state for dashboard mode vs legacy tab mode
  const [showLegacyTabs, setShowLegacyTabs] = useState(false);

  // State for fundraiser detail view
  const [selectedFundraiser, setSelectedFundraiser] = useState<Fundraiser | null>(null);
  
  // State to track if we need to trigger editing when we return to list view
  const [editingFundraiser, setEditingFundraiser] = useState<Fundraiser | null>(null);

  // Quick stats state (placeholder for now)
  const [stats, setStats] = useState({
    totalFundraisers: 0,
    activeFundraisers: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    totalParticipants: 0
  });

  // Load quick stats on mount
  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await apiClient.get('/wholesale/admin/analytics?period=30d');
        
        if (response.data.success && response.data.data) {
          setStats({
            totalFundraisers: response.data.data.totalFundraisers || 0,
            activeFundraisers: response.data.data.activeFundraisers || 0,
            totalOrders: response.data.data.totalOrders || 0,
            totalRevenue: response.data.data.totalRevenue || 0,
            pendingOrders: response.data.data.pendingOrders || 0,
            totalParticipants: response.data.data.totalParticipants || 0
          });
        } else {
          // Set empty stats when no data
          setStats({
            totalFundraisers: 0,
            activeFundraisers: 0,
            totalOrders: 0,
            totalRevenue: 0,
            pendingOrders: 0,
            totalParticipants: 0
          });
        }
      } catch (err) {
        console.error('Error loading wholesale stats:', err);
        // Set empty stats on error
        setStats({
          totalFundraisers: 0,
          activeFundraisers: 0,
          totalOrders: 0,
          totalRevenue: 0,
          pendingOrders: 0,
          totalParticipants: 0
        });
      }
    };

    loadStats();
  }, [currentRestaurantId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const handleTabChange = (tabId: WholesaleTab) => {
    setActiveTab(tabId);
  };

  const handleManageFundraiser = (fundraiser: Fundraiser) => {
    setSelectedFundraiser(fundraiser);
  };

  const handleBackToFundraisers = () => {
    setSelectedFundraiser(null);
  };

  const handleEditFundraiser = (fundraiser: Fundraiser) => {
    // Go back to list view and trigger edit
    setSelectedFundraiser(null);
    // We need to pass this edit request to the FundraiserManager
    // We'll do this by setting a state that FundraiserManager can pick up
    setEditingFundraiser(fundraiser);
  };

  // Tab content renderer
  const renderTabContent = () => {
    switch (activeTab) {
      case 'fundraisers':
        return <FundraiserManager restaurantId={currentRestaurantId} onManage={handleManageFundraiser} />;
        
      case 'items':
        return <ItemManager restaurantId={currentRestaurantId} />;
        
      case 'participants':
        return <ParticipantManager restaurantId={currentRestaurantId} />;
        
      case 'orders':
        return <OrderManager restaurantId={currentRestaurantId} />;
        
      case 'analytics':
        return <AnalyticsManager restaurantId={currentRestaurantId} />;
        
      case 'settings':
        return (
          <div className="text-center py-12">
            <Settings className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Wholesale Settings</h3>
            <p className="text-gray-600 mb-6">
              Configure wholesale system preferences, payment settings, and notifications.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md mx-auto">
              <p className="text-sm text-yellow-800">
                <strong>Coming Soon:</strong> System configuration and preference management
              </p>
            </div>
          </div>
        );
        
      default:
        return (
          <div className="text-center py-12">
            <p className="text-gray-500">Tab content not found</p>
          </div>
        );
    }
  };

  return (
    <div className="wholesale-manager">
      {/* Header with quick stats */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Wholesale Management</h1>
            <p className="text-gray-600">
              Manage fundraisers, products, participants, and orders for {restaurant?.name || 'your restaurant'}
            </p>
          </div>
          
          {/* Navigation mode indicator and controls */}
          <div className="flex items-center space-x-3">
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
              <Download className="w-4 h-4 mr-2" />
              Export Data
            </button>
            
            {/* Mode indicator with breadcrumb-style navigation */}
            <div className="flex items-center bg-gray-50 rounded-lg p-1 border">
              <button
                onClick={() => {
                  setShowLegacyTabs(false);
                  setSelectedFundraiser(null); // Reset fundraiser selection
                }}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  !showLegacyTabs 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                📋 Fundraiser View
              </button>
              <button
                onClick={() => setShowLegacyTabs(true)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  showLegacyTabs 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                📊 Global View
              </button>
            </div>
          </div>
        </div>

        {/* Quick stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <Package className="w-8 h-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Fundraisers</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalFundraisers}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <Package className="w-8 h-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Active Now</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.activeFundraisers}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <ShoppingBag className="w-8 h-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalOrders}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <BarChart3 className="w-8 h-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-xl font-semibold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <ShoppingBag className="w-8 h-8 text-orange-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Pending Orders</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.pendingOrders}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-indigo-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Participants</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalParticipants}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content area */}
      {showLegacyTabs ? (
        /* Global view with tab navigation */
        <div className="bg-white rounded-lg shadow-sm border">
          {/* Header for global view */}
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  📊 Global View
                  <span className="ml-2 text-sm text-gray-500">- Cross-fundraiser management</span>
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Manage all {tabs.find(t => t.id === activeTab)?.label.toLowerCase()} across all fundraisers
                </p>
              </div>
            </div>
          </div>

          <div className="border-b border-gray-200">
            <nav className="flex -mb-px overflow-x-auto" role="tablist">
              {tabs.map(({ id, label, icon: Icon, description }) => (
                <button
                  key={id}
                  onClick={() => handleTabChange(id)}
                  className={`
                    flex-shrink-0 px-6 py-4 border-b-2 font-medium text-sm transition-colors
                    ${
                      activeTab === id
                        ? 'border-blue-500 text-blue-600 bg-blue-50'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                  title={description}
                >
                  <Icon className="w-5 h-5 mr-2" />
                  {label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab content */}
          <div className="p-6">
            {renderTabContent()}
          </div>
        </div>
      ) : (
        /* Fundraiser-centric layout */
        <div className="space-y-6">
          
          {/* Main fundraiser management section */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                    📋 Fundraiser View
                    <span className="ml-2 text-sm text-gray-500">- Individual campaign management</span>
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedFundraiser 
                      ? `Managing: ${selectedFundraiser.name}` 
                      : 'Create and manage individual fundraising campaigns'
                    }
                  </p>
                </div>
              </div>
            </div>
            
            {/* Main fundraiser content */}
            <div className="p-6">
              {selectedFundraiser ? (
                <FundraiserDetailPage
                  fundraiser={selectedFundraiser}
                  restaurantId={currentRestaurantId}
                  onBack={handleBackToFundraisers}
                  onEdit={handleEditFundraiser}
                />
              ) : (
                <FundraiserManager 
                  restaurantId={currentRestaurantId} 
                  onManage={handleManageFundraiser}
                  editingFundraiser={editingFundraiser}
                  onEditComplete={() => setEditingFundraiser(null)}
                />
              )}
            </div>
          </div>
          
          {/* Quick access panels for global management */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <BarChart3 className="w-8 h-8 text-blue-600 mr-3" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Global Analytics</h3>
                    <p className="text-sm text-gray-600">Cross-fundraiser performance insights</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowLegacyTabs(true);
                    setActiveTab('analytics');
                  }}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                >
                  📊 Global View
                </button>
              </div>
              <div className="text-sm text-gray-600">
                Compare performance, track trends, and analyze data across all fundraisers.
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <ShoppingBag className="w-8 h-8 text-green-600 mr-3" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Global Orders</h3>
                    <p className="text-sm text-gray-600">All orders across fundraisers</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowLegacyTabs(true);
                    setActiveTab('orders');
                  }}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
                >
                  📊 Global View
                </button>
              </div>
              <div className="text-sm text-gray-600">
                Process, fulfill, and manage orders from all active fundraisers in one place.
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Package className="w-8 h-8 text-purple-600 mr-3" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Global Items</h3>
                    <p className="text-sm text-gray-600">All products across fundraisers</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowLegacyTabs(true);
                    setActiveTab('items');
                  }}
                  className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm"
                >
                  📊 Global View
                </button>
              </div>
              <div className="text-sm text-gray-600">
                Manage products, inventory, and pricing across all fundraising campaigns.
              </div>
            </div>
          </div>
          
        </div>
      )}
    </div>
  );
}

export default WholesaleManager;