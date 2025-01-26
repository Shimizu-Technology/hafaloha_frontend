// src/components/dashboard/SettingsTab.tsx

import React from 'react';
import AdminSettings from '../AdminSettings';

/**
 * The "Settings" tab in the StaffDashboard also
 * just rendered <AdminSettings /> with no extra logic.
 */
export default function SettingsTab() {
  return (
    <div className="bg-white shadow rounded-md p-4">
      {/* Optional heading if you want it: */}
      <h2 className="text-xl font-bold mb-4">Admin Settings</h2>

      {/* The same AdminSettings component that was rendered in StaffDashboard */}
      <AdminSettings />
    </div>
  );
}
