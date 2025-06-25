// src/GlobalLayout.tsx
import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Header, Footer } from './shared/components/navigation';

export default function GlobalLayout() {
  // Handle viewport height for both mobile and desktop
  useEffect(() => {
    const setVhProperty = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    
    setVhProperty();
    window.addEventListener('resize', setVhProperty);
    window.addEventListener('orientationchange', () => {
      setTimeout(setVhProperty, 100);
    });
    
    return () => {
      window.removeEventListener('resize', setVhProperty);
      window.removeEventListener('orientationchange', setVhProperty);
    };
  }, []);

  return (
    <div className="min-h-screen min-h-[calc(var(--vh,1vh)*100)] bg-gray-50 flex flex-col">
      {/* Shared header for ALL routes */}
      <Header />

      {/* Main content area with responsive padding */}
      <main className="flex-grow tropical-pattern px-4 sm:px-6 lg:px-8">
        <Outlet />
      </main>

      {/* The Online Ordering Footer at the bottom */}
      <Footer />
    </div>
  );
}
