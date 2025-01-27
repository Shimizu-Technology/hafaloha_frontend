// src/App.tsx (example)
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';

// Our new provider:
import { DateFilterProvider } from './context/DateFilterContext';

// Import main layout + child tabs:
import NavBar from './components/NavBar';
import HomePage from './components/HomePage';
import LoginPage from './components/LoginPage';
import SignupPage from './components/SignupPage';
import ProfilePage from './components/ProfilePage';

// The parent layout for /dashboard:
import StaffDashboard from './components/StaffDashboard';
// Child routes (ReservationsTab, WaitlistTab, etc.)
import ReservationsTab from './components/dashboard/ReservationsTab';
import WaitlistTab from './components/dashboard/WaitlistTab';
import SeatingTab from './components/dashboard/SeatingTab';
import LayoutTab from './components/dashboard/LayoutTab';
import SettingsTab from './components/dashboard/SettingsTab';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Router>
      <NavBar />

      <Routes>
        {/* Public routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Protected routes */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        {/* Dashboard with nested routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              {/*
                Wrap the staff area in <DateFilterProvider>.
                All child routes can now read/update the shared date.
              */}
              <DateFilterProvider>
                <StaffDashboard />
              </DateFilterProvider>
            </ProtectedRoute>
          }
        >
          {/* Child “tab” routes */}
          <Route path="reservations" element={<ReservationsTab />} />
          <Route path="waitlist"     element={<WaitlistTab />} />
          <Route path="seating"      element={<SeatingTab />} />
          <Route path="layout"       element={<LayoutTab />} />
          <Route path="settings"     element={<SettingsTab />} />

          {/* Default => go to reservations */}
          <Route index element={<Navigate to="reservations" />} />
        </Route>
      </Routes>

      <Toaster position="top-right" reverseOrder={false} />
    </Router>
  );
}
