// src/components/StaffDashboard.tsx
import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';

export default function StaffDashboard() {
  const location = useLocation();

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Tabs as links to each sub-route */}
      <div className="max-w-7xl mx-auto px-4 mt-6">
        <div
          className="
            bg-white rounded-md shadow 
            p-3 flex 
            items-center space-x-2
            overflow-x-auto
          "
        >
          <NavTab to="/dashboard/reservations" label="Reservations" currentPath={location.pathname} />
          <NavTab to="/dashboard/waitlist"     label="Waitlist"     currentPath={location.pathname} />
          <NavTab to="/dashboard/seating"      label="Seating"      currentPath={location.pathname} />
          <NavTab to="/dashboard/layout"       label="Layout"       currentPath={location.pathname} />
          <NavTab to="/dashboard/settings"     label="Settings"     currentPath={location.pathname} />
        </div>
      </div>

      {/* Child routes render here */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Outlet />
      </div>
    </div>
  );
}

// A small helper component to highlight the active tab
function NavTab({
  to,
  label,
  currentPath
}: {
  to: string;
  label: string;
  currentPath: string;
}) {
  const isActive = currentPath.includes(to.replace('/dashboard', ''));
  return (
    <Link
      to={to}
      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
        isActive
          ? 'bg-orange-50 text-orange-700 border border-orange-300'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {label}
    </Link>
  );
}
