// src/ordering/components/admin/SettingsManager.tsx

import React, { useState, lazy, Suspense } from 'react';
import { Palette, Store, List, Users, Bell } from 'lucide-react';

// Lazy load the settings components to improve performance
const GeneralSettings = lazy(() => import('./settings/GeneralSettings').then(module => ({ default: module.GeneralSettings })));
const RestaurantSettings = lazy(() => import('./settings/RestaurantSettings').then(module => ({ default: module.RestaurantSettings })));
const CategoriesSettings = lazy(() => import('./settings/CategoriesSettings').then(module => ({ default: module.CategoriesSettings })));
const UsersSettings = lazy(() => import('./settings/UsersSettings').then(module => ({ default: module.UsersSettings })));
const NotificationTemplatesManager = lazy(() => import('./settings/NotificationTemplatesManager').then(module => ({ default: module.NotificationTemplatesManager })));

type SettingsTab = 'branding' | 'restaurant' | 'categories' | 'users' | 'notifications';

interface SettingsManagerProps {
  restaurantId?: string;
}

export function SettingsManager({ restaurantId }: SettingsManagerProps) {
  const [activeSettingsTab, setActiveSettingsTab] = useState<SettingsTab>('branding');

  const tabs = [
    { id: 'branding', label: 'Branding', icon: Palette },
    { id: 'restaurant', label: 'Restaurant', icon: Store },
    { id: 'categories', label: 'Categories', icon: List },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  // Render a placeholder while the tab content is loading
  const TabLoadingPlaceholder = () => (
    <div className="flex justify-center items-center h-64">
      <div className="text-gray-400">Loading...</div>
    </div>
  );

  // Render the active tab content
  const renderTabContent = () => {
    switch (activeSettingsTab) {
      case 'branding':
        return <GeneralSettings restaurantId={restaurantId} />;
      case 'restaurant':
        return <RestaurantSettings restaurantId={restaurantId} />;
      case 'categories':
        return (
          <div>
            <h3 className="text-lg font-semibold mb-4">Categories</h3>
            <CategoriesSettings restaurantId={restaurantId} />
          </div>
        );
      case 'users':
        return (
          <div>
            <h3 className="text-lg font-semibold mb-4">User Management</h3>
            <UsersSettings restaurantId={restaurantId} />
          </div>
        );
      case 'notifications':
        return (
          <div>
            <h3 className="text-lg font-semibold mb-4">Notification Templates</h3>
            <NotificationTemplatesManager restaurantId={restaurantId} />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-4">
      {/* Header section */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Admin Settings</h2>
        <p className="text-gray-600 text-sm">Configure system settings and preferences</p>
      </div>

      {/* Mobile-friendly tab navigation similar to main admin dashboard */}
      <div className="mb-6 border-b border-gray-200 overflow-x-auto">
        <nav className="flex -mb-px" role="tablist">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSettingsTab(id as SettingsTab)}
              className={`
                flex-shrink-0 whitespace-nowrap px-4 py-4 border-b-2
                text-center font-medium text-sm
                ${
                  activeSettingsTab === id
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

      <Suspense fallback={<TabLoadingPlaceholder />}>
        {renderTabContent()}
      </Suspense>
    </div>
  );
}
