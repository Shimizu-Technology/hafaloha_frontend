// src/GlobalLayout.tsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './ordering/components/Header';   // from your ordering side
import { Footer } from './ordering/components/Footer';

export default function GlobalLayout() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* The Online Ordering Header at the top for ALL routes */}
      <Header />

      {/* Main content area — child routes go here */}
      <main className="flex-grow tropical-pattern">
        <Outlet />
      </main>

      {/* The Online Ordering Footer at the bottom */}
      <Footer />
    </div>
  );
}
