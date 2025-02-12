// src/reservations/ReservationsApp.tsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';

import StaffDashboard from './components/StaffDashboard';
import ReservationsTab from './components/dashboard/ReservationsTab';
import WaitlistTab from './components/dashboard/WaitlistTab';
import SeatingTab from './components/dashboard/SeatingTab';
import LayoutTab from './components/dashboard/LayoutTab';
import SettingsTab from './components/dashboard/SettingsTab';
import { DateFilterProvider } from './context/DateFilterContext';

/** A minimal route guard that requires a user to be logged in via Auth0. */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth0();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    // If user not logged in, redirect to the ordering login route
    return <Navigate to="/ordering/login" replace />;
  }

  return <>{children}</>;
}

export default function ReservationsApp() {
  return (
    <Routes>
      {/* Staff Dashboard with nested “Tab” routes => /reservations/dashboard/... */}
      <Route
        path="dashboard"
        element={
          <ProtectedRoute>
            <DateFilterProvider>
              <StaffDashboard />
            </DateFilterProvider>
          </ProtectedRoute>
        }
      >
        <Route path="reservations" element={<ReservationsTab />} />
        <Route path="waitlist" element={<WaitlistTab />} />
        <Route path="seating" element={<SeatingTab />} />
        <Route path="layout" element={<LayoutTab />} />
        <Route path="settings" element={<SettingsTab />} />

        {/* Default => go to the "reservations" tab */}
        <Route index element={<Navigate to="reservations" />} />
      </Route>

      {/* Fallback => if user goes to an invalid route in /reservations,
          also redirect to /ordering/login */}
      <Route path="*" element={<Navigate to="/ordering/login" replace />} />
    </Routes>
  );
}
