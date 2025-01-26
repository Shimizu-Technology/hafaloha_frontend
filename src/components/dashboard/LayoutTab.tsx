// src/components/dashboard/LayoutTab.tsx

import React from 'react';
import SeatLayoutEditor from '../SeatLayoutEditor';

/**
 * The "Layout" tab was extremely simple in StaffDashboard:
 * it just rendered <SeatLayoutEditor /> inside a container.
 * There was no extra data or logic to pass in, so we replicate that here.
 */
export default function LayoutTab() {
  return (
    <div className="bg-white shadow rounded-md p-4">
      {/* Optional heading if you want it to appear above the editor: */}
      <h2 className="text-xl font-bold mb-4">Layout</h2>
      
      {/* The actual layout editor component, same as StaffDashboard: */}
      <SeatLayoutEditor />
    </div>
  );
}
