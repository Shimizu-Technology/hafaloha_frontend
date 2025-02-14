// src/RootApp.tsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
        {/* Provide the Toast container at root level */}
        <Toaster position="top-right" reverseOrder={false} />

        <Routes>
          <Route element={<GlobalLayout />}>
            {/* /ordering/* => the Online Ordering routes */}
            <Route path="/ordering/*" element={<OnlineOrderingApp />} />

            {/* /reservations/* => the Reservations routes */}
            <Route path="/reservations/*" element={<ReservationsApp />} />

            {/* Catch-all => go to /ordering */}
            <Route path="*" element={<Navigate to="/ordering" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
