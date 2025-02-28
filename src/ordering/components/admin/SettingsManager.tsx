// src/ordering/components/admin/SettingsManager.tsx

import React, { useState, lazy, Suspense } from 'react';

// Lazy load the settings components to improve performance
const GeneralSettings = lazy(() => import('./settings/GeneralSettings').then(module => ({ default: module.GeneralSettings })));
const RestaurantSettings = lazy(() => import('./settings/RestaurantSettings').then(module => ({ default: module.RestaurantSettings })));
const CategoriesSettings = lazy(() => import('./settings/CategoriesSettings').then(module => ({ default: module.CategoriesSettings })));
const UsersSettings = lazy(() => import('./settings/UsersSettings').then(module => ({ default: module.UsersSettings })));

type SettingsTab = 'branding' | 'restaurant' | 'categories' | 'users';

export function SettingsManager() {
  const [activeSettingsTab, setActiveSettingsTab] = useState<SettingsTab>('branding');

  const tabs = [
    { id: 'branding', label: 'Branding' },
    { id: 'restaurant', label: 'Restaurant' },
    { id: 'categories', label: 'Categories' },
    { id: 'users', label: 'Users' },
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
        return <GeneralSettings />;
      case 'restaurant':
        return <RestaurantSettings />;
      case 'categories':
        return (
          <div>
            <h3 className="text-lg font-semibold mb-4">Categories</h3>
            <CategoriesSettings />
          </div>
        );
      case 'users':
        return (
          <div>
            <h3 className="text-lg font-semibold mb-4">User Management</h3>
            <UsersSettings />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Admin Settings</h2>

      <div className="mb-6 border-b border-gray-200 flex space-x-2">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveSettingsTab(id as SettingsTab)}
            className={`px-4 py-2 border-b-2 ${
              activeSettingsTab === id
                ? 'border-[#c1902f] text-[#c1902f]'
                : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <Suspense fallback={<TabLoadingPlaceholder />}>
        {renderTabContent()}
      </Suspense>
    </div>
  );
}
