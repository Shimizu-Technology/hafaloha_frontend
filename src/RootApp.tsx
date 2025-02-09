// src/RootApp.tsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './reservations/context/AuthContext';

import GlobalLayout from './GlobalLayout';
import ReservationsApp from './reservations/ReservationsApp';
import OnlineOrderingApp from './ordering/OnlineOrderingApp';
import { ScrollToTop } from './shared/ScrollToTop';

export default function RootApp() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />

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
