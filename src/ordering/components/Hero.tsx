// src/ordering/components/Hero.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ReservationModal } from './reservation/ReservationModal';
import heroImage from '../assets/hafaloha_hero.jpg';

export function Hero() {
  const [showReservationModal, setShowReservationModal] = useState(false);

  return (
    <div className="relative bg-gray-900">
      <div className="absolute inset-0">
        <img
          className="w-full h-full object-cover"
          src={heroImage}
          alt="Hawaiian beach backdrop"
        />
        <div className="absolute inset-0 bg-gray-900 opacity-75" />
      </div>

      <div className="relative max-w-7xl mx-auto py-24 px-4 sm:py-32 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
          Experience the Flavors of Two Islands
        </h1>
        <p className="mt-6 text-xl text-gray-300 max-w-3xl">
          Where Chamorro and Hawaiian cuisines come together to create an unforgettable dining experience
        </p>
        <div className="mt-10 space-x-4">
          <Link
            to="/ordering/menu"
            className="inline-flex items-center px-6 py-3 border border-transparent
                       text-base font-medium rounded-md text-gray-900 bg-[#c1902f]
                       hover:bg-[#d4a43f] transition-colors duration-150"
          >
            Order Now
          </Link>
          <button
            onClick={() => setShowReservationModal(true)}
            className="inline-flex items-center px-6 py-3 border-2 border-[#c1902f]
                       text-base font-medium rounded-md text-white hover:bg-[#c1902f]
                       transition-colors duration-150"
          >
            Book Your Table
          </button>
        </div>
      </div>

      {/* Always render the modal, pass isOpen */}
      <ReservationModal
        isOpen={showReservationModal}
        onClose={() => setShowReservationModal(false)}
      />
    </div>
  );
}
