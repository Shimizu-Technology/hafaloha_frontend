// src/components/HomePage.tsx
import React from 'react';
import ReservationForm from './ReservationForm';
import StaffBanner from './StaffBanner';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 
        NavBar is in App.tsx 
      */}

      {/* Hero Section */}
      <div
        className="
          relative 
          bg-cover bg-center 
          h-[300px]   /* Shorter height on smaller screens */
          md:h-[500px] /* Use 500px height on md+ breakpoints */
        "
        style={{
          backgroundImage:
            'url("https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&q=80&w=1920")',
        }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-50" />
        
        {/* Hero Content */}
        <div className="relative max-w-7xl mx-auto px-4 h-full flex flex-col items-center justify-center text-center">
          {/* Possibly reduce the logo size on smaller screens */}
          <img
            src="https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&q=80&w=120"
            alt="Rotary Sushi Logo"
            className="
              w-20 h-20 
              md:w-24 md:h-24 /* Slightly bigger on md+ screens */
              rounded-full border-4 border-white 
              shadow-lg mb-4 /* a bit less margin for smaller screens */
            "
          />
          <h1 
            className="
              text-3xl 
              md:text-5xl 
              font-bold 
              text-white 
              mb-2 
              md:mb-4
            "
          >
            Welcome to Rotary Sushi
          </h1>
          <p 
            className="
              text-lg 
              md:text-xl 
              text-white 
              mb-4 
              md:mb-8
            "
          >
            Experience the finest conveyor belt sushi in town
          </p>
        </div>
      </div>

      {/* Reservation Section */}
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        <div className="text-center mb-6 md:mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
            Make a Reservation
          </h2>
          <p className="mt-2 text-gray-600">
            Book your seat at our conveyor belt for a unique dining experience
          </p>
        </div>

        <ReservationForm />
      </div>

      {/* Staff Banner */}
      <StaffBanner />

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-6 md:py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-xs md:text-sm">
            © {new Date().getFullYear()} Rotary Sushi. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
