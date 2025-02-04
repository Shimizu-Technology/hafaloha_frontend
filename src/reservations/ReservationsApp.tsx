// src/reservations/ReservationsApp.tsx

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

import LoginPage from './components/LoginPage';
import SignupPage from './components/SignupPage';
import ProfilePage from './components/ProfilePage';
import StaffDashboard from './components/StaffDashboard';
import ReservationsTab from './components/dashboard/ReservationsTab';
import WaitlistTab from './components/dashboard/WaitlistTab';
import SeatingTab from './components/dashboard/SeatingTab';
import LayoutTab from './components/dashboard/LayoutTab';
import SettingsTab from './components/dashboard/SettingsTab';

import { DateFilterProvider } from './context/DateFilterContext';

/** A minimal route guard that requires a user to be logged in. */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div>Loading...</div>;
  if (!user) return <Navigate to="login" />;
  return <>{children}</>;
}

export default function ReservationsApp() {
  return (
    <Routes>
      {/* Public routes for Reservations domain */}
      <Route path="login" element={<LoginPage />} />
      <Route path="signup" element={<SignupPage />} />

      {/* Example protected route => /reservations/profile */}
      <Route
        path="profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />

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
        <Route path="waitlist"     element={<WaitlistTab />} />
        <Route path="seating"      element={<SeatingTab />} />
        <Route path="layout"       element={<LayoutTab />} />
        <Route path="settings"     element={<SettingsTab />} />

        {/* default => go to “reservations” tab */}
        <Route index element={<Navigate to="reservations" />} />
      </Route>

      {/* Fallback => if user goes to an invalid route in /reservations, go to /reservations/login */}
      <Route path="*" element={<Navigate to="login" />} />
    </Routes>
  );
}
