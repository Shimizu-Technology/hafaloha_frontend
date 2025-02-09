// src/components/admin/AdminDashboard.tsx
import React, { useState } from 'react';
import { MenuManager } from './MenuManager';
import { InventoryManager } from './InventoryManager';
import { OrderManager } from './OrderManager';
import { PromoManager } from './PromoManager';
import { AnalyticsManager } from './AnalyticsManager';
import { BarChart2, ShoppingBag, LayoutGrid, Package, Tag } from 'lucide-react';

type Tab = 'analytics' | 'orders' | 'menu' | 'inventory' | 'promos';

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const stored = localStorage.getItem('adminTab');
    if (
      stored === 'analytics' ||
      stored === 'orders' ||
      stored === 'menu' ||
      stored === 'inventory' ||
      stored === 'promos'
    ) {
      return stored as Tab;
    }
    return 'analytics';
  });

  const handleTabClick = (id: Tab) => {
    setActiveTab(id);
    localStorage.setItem('adminTab', id);
  };

  const tabs = [
    { id: 'analytics', label: 'Analytics', icon: BarChart2 },
    { id: 'orders',    label: 'Orders',    icon: ShoppingBag },
    { id: 'menu',      label: 'Menu',      icon: LayoutGrid },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'promos',    label: 'Promos',    icon: Tag },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage orders, menu items, inventory, and promotions
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => handleTabClick(id)}
                  className={`flex-1 px-4 py-4 text-center border-b-2 font-medium text-sm ${
                    activeTab === id
                      ? 'border-[#c1902f] text-[#c1902f]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-5 w-5 mx-auto mb-1" />
                  {label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-4">
            {activeTab === 'analytics' && <AnalyticsManager />}
            {activeTab === 'orders'    && <OrderManager />}
            {activeTab === 'menu'      && <MenuManager />}
            {activeTab === 'inventory' && <InventoryManager />}
            {activeTab === 'promos'    && <PromoManager />}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
