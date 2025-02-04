// src/RootApp.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './reservations/context/AuthContext';

import GlobalLayout from './GlobalLayout';
import ReservationsApp from './reservations/ReservationsApp';
import OnlineOrderingApp from './ordering/OnlineOrderingApp';

export default function RootApp() {
  return (
    <AuthProvider>
      <BrowserRouter>
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
