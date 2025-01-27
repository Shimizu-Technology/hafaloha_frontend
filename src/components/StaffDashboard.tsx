// src/components/StaffDashboard.tsx

import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';

/**
 * StaffDashboard
 * A simple container with brand-colored NavTabs for sub-routes.
 */
export default function StaffDashboard() {
  const location = useLocation();

  return (
    <div className="bg-white min-h-screen">
      {/* Nav Tabs */}
      <div className="max-w-7xl mx-auto px-4 mt-6">
        <div
          className="
            bg-hafaloha-pink/5
            rounded-md
            shadow
            p-3
            flex
            items-center
            space-x-2
            overflow-x-auto
          "
        >
          <NavTab
            to="/dashboard/reservations"
            label="Reservations"
            currentPath={location.pathname}
          />
          <NavTab
            to="/dashboard/waitlist"
            label="Waitlist"
            currentPath={location.pathname}
          />
          <NavTab
            to="/dashboard/seating"
            label="Seating"
            currentPath={location.pathname}
          />
          <NavTab
            to="/dashboard/layout"
            label="Layout"
            currentPath={location.pathname}
          />
          <NavTab
            to="/dashboard/settings"
            label="Settings"
            currentPath={location.pathname}
          />
        </div>
      </div>

      {/* Child routes */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Outlet />
      </div>
    </div>
  );
}

/**
 * NavTab
 * Highlights the active tab in Hafaloha brand style.
 */
function NavTab({
  to,
  label,
  currentPath
}: {
  to: string;
  label: string;
  currentPath: string;
}) {
  // We'll consider a route "active" if its path is included in currentPath.
  const isActive = currentPath.includes(to.replace('/dashboard', ''));

  // Active => pink background, white text
  // Inactive => lightly tinted background, pink text hover
  return (
    <Link
      to={to}
      className={`
        px-4 py-2
        rounded-md
        text-sm font-medium
        transition-colors
        ${
          isActive
            ? 'bg-hafaloha-pink text-white shadow'
            : 'bg-hafaloha-pink/10 text-hafaloha-pink hover:bg-hafaloha-pink/20'
        }
      `}
    >
      {label}
    </Link>
  );
}
