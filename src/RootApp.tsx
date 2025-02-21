// src/RootApp.tsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
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
        <Toaster position="top-right" reverseOrder={false} />

        <Routes>
          <Route element={<GlobalLayout />}>
            {/* Serve Reservations at /reservations/* */}
            <Route path="/reservations/*" element={<ReservationsApp />} />

            {/* Everything else => OnlineOrderingApp at the root */}
            <Route path="/*" element={<OnlineOrderingApp />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
