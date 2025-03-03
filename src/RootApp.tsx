// src/RootApp.tsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, ScrollToTop, RestaurantProvider } from './shared';

import GlobalLayout from './GlobalLayout';
import ReservationsApp from './reservations/ReservationsApp';
import OnlineOrderingApp from './ordering/OnlineOrderingApp';

export default function RootApp() {
  return (
    <AuthProvider>
      <RestaurantProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Toaster 
            position="top-right" 
            reverseOrder={false}
            containerStyle={{
              maxHeight: '100vh',
              overflow: 'auto',
              paddingRight: '10px',
              scrollBehavior: 'smooth'
            }}
            containerClassName="scrollable-toast-container"
            gutter={8}
            toastOptions={{
              // Customize for different screen sizes
              className: '',
              style: {
                maxWidth: '100%',
                width: 'auto'
              },
              // Ensure mobile devices can dismiss with swipe
              duration: Infinity
            }}
          />

          <Routes>
            <Route element={<GlobalLayout />}>
              {/* Serve Reservations at /reservations/* */}
              <Route path="/reservations/*" element={<ReservationsApp />} />

              {/* Everything else => OnlineOrderingApp at the root */}
              <Route path="/*" element={<OnlineOrderingApp />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </RestaurantProvider>
    </AuthProvider>
  );
}
