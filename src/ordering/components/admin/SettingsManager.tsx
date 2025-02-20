// src/ordering/components/admin/SettingsManager.tsx
import React, { useState } from 'react';
import { CategoriesSettings } from './settings/CategoriesSettings'; 
// or inline the code if you prefer
// import { OperatingHoursSettings } from './settings/OperatingHoursSettings';
// import { GeneralSettings } from './settings/GeneralSettings';

type SettingsTab = 'general' | 'categories';

export function SettingsManager() {
  const [activeSettingsTab, setActiveSettingsTab] = useState<SettingsTab>('general');

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'categories', label: 'Categories' },
    // e.g. { id:'hours', label:'Operating Hours' }
  ];

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Admin Settings</h2>

      {/* Sub-tabs for different sections of settings */}
      <div className="mb-4 border-b border-gray-200 flex space-x-2">
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

      {/* Render the active sub-tab */}
      {activeSettingsTab === 'general' && (
        <div>
          <h3 className="text-lg font-semibold mb-2">General Settings</h3>
          <p className="text-sm text-gray-600">
            (Restaurant name, address, etc. here, or anything else considered “general.”)
          </p>
          {/* <GeneralSettings /> */}
        </div>
      )}

      {activeSettingsTab === 'categories' && (
        <div>
          <h3 className="text-lg font-semibold mb-2">Categories</h3>
          <CategoriesSettings />
        </div>
      )}
    </div>
  );
}
