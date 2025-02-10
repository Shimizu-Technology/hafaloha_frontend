// src/RootApp.tsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';  // <-- so toasts can appear
import { AuthProvider } from './reservations/context/AuthContext';

import GlobalLayout from './GlobalLayout';
import ReservationsApp from './reservations/ReservationsApp';
import OnlineOrderingApp from './ordering/OnlineOrderingApp';
import { ScrollToTop } from './shared/ScrollToTop';

export default function RootApp() {
  return (
    <AuthProvider>
      <BrowserRouter>
        {/* So we scroll to top on route changes */}
        <ScrollToTop />

        {/* So toast notifications can appear */}
        <Toaster position="top-right" reverseOrder={false} />

        <Routes>
          {/* Wrap everything in GlobalLayout */}
          <Route element={<GlobalLayout />}>
            {/* Online Ordering => /ordering/* */}
            <Route path="/ordering/*" element={<OnlineOrderingApp />} />

            {/* Reservations => /reservations/* */}
            <Route path="/reservations/*" element={<ReservationsApp />} />

            {/* Default => go to /ordering (the "home page") */}
            <Route path="*" element={<Navigate to="/ordering" />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
