// src/RootApp.tsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import GlobalLayout from './GlobalLayout';
import ReservationsApp from './reservations/ReservationsApp';
import OnlineOrderingApp from './ordering/OnlineOrderingApp';
import { ScrollToTop } from './shared/ScrollToTop';

export default function RootApp() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Toaster position="top-right" reverseOrder={false} />

      <Routes>
        <Route element={<GlobalLayout />}>
          <Route path="/ordering/*" element={<OnlineOrderingApp />} />
          <Route path="/reservations/*" element={<ReservationsApp />} />

          {/* Default => go to /ordering */}
          <Route path="*" element={<Navigate to="/ordering" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
