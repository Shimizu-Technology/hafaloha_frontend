// src/pages/HomePage.tsx
import React, { useState } from 'react';
import { MapPin, Phone, Clock, X } from 'lucide-react';  // pruned imports for clarity
import ReservationForm from './ReservationForm';

// 1) Import your local images
import burgerImg from '../assets/Hafaloha_Burger.webp';
import pokeImg from '../assets/Hafaloha_Poke.webp';
import shavedIceImg from '../assets/Hafaloha_ShaveIce.webp';

// The modal for reservations:
function ReservationModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-500 hover:text-gray-700"
        >
          <X className="h-6 w-6" />
        </button>
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold mb-2">Make a Reservation</h2>
          <p className="text-gray-600">
            Book your seat at our restaurant for a unique dining experience
          </p>
        </div>

        {/* Use your existing ReservationForm */}
        <ReservationForm />
      </div>
    </div>
  );
}

export default function HomePage() {
  const [isReservationOpen, setIsReservationOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* ========== Hero Section ========== */}
      <div
        className="
          relative
          h-[300px] 
          md:h-[500px]
          bg-cover bg-center
        "
        style={{
          backgroundImage:
            'url("https://images.unsplash.com/photo-1540648639573-8c848de23f0a?auto=format&fit=crop&w=1920&q=80")'
        }}
      >
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative max-w-7xl mx-auto px-4 h-full flex items-center">
          <div className="text-white max-w-2xl">
            <h1 className="text-3xl md:text-5xl font-bold mb-3">
              Experience the Flavors of Two Islands
            </h1>
            <p className="text-base md:text-xl mb-6">
              Where Chamorro and Hawaiian cuisines come together 
              to create an unforgettable dining experience
            </p>
            <button
              onClick={() => setIsReservationOpen(true)}
              className="
                bg-hafaloha-pink 
                hover:bg-hafaloha-coral 
                text-white 
                px-6 md:px-8 
                py-2 md:py-3 
                rounded-full 
                text-base md:text-lg 
                transition-colors
              "
            >
              Book Your Table
            </button>
          </div>
        </div>
      </div>

      {/* ========== Quick Info ========== */}
      <div className="bg-white py-8">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
          <div className="flex items-center space-x-3 md:space-x-4">
            <Clock className="h-6 w-6 text-hafaloha-pink" />
            <div>
              <h3 className="font-semibold text-base md:text-lg">Hours</h3>
              <p className="text-gray-600 text-sm md:text-base">Tues-Thu: 11AM-9PM</p>
              <p className="text-gray-600 text-sm md:text-base">Fri-Sat: 11AM-10PM</p>
              <p className="text-gray-600 text-sm md:text-base">Sun: 11AM-9PM</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 md:space-x-4">
            <MapPin className="h-6 w-6 text-hafaloha-pink" />
            <div>
              <h3 className="font-semibold text-base md:text-lg">Location</h3>
              <p className="text-gray-600 text-sm md:text-base">955 Pale San Vitores Rd</p>
              <p className="text-gray-600 text-sm md:text-base">Tamuning, Guam 96913</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 md:space-x-4">
            <Phone className="h-6 w-6 text-hafaloha-pink" />
            <div>
              <h3 className="font-semibold text-base md:text-lg">Contact</h3>
              <p className="text-gray-600 text-sm md:text-base">(671) 123-4567</p>
              <p className="text-gray-600 text-sm md:text-base">info@hafaloha.com</p>
            </div>
          </div>
        </div>
      </div>

      {/* ========== Featured Dishes ========== */}
      <div className="bg-gray-50 py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 md:mb-12">
            Popular Dishes
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            {/* 1) Poke Bowl */}
            <div className="bg-white rounded-lg overflow-hidden shadow-sm">
              <img 
                src={pokeImg}          // <-- using local import
                alt="Fresh Poke Bowl" 
                className="w-full h-48 object-cover"
              />
              <div className="p-6">
                <h3 className="font-semibold text-lg mb-2">Fresh Poke Bowls</h3>
                <p className="text-gray-600 text-sm">
                  Hawaiian-style fresh fish with your choice of toppings
                </p>
              </div>
            </div>

            {/* 2) Island Shaved Ice */}
            <div className="bg-white rounded-lg overflow-hidden shadow-sm">
              <img 
                src={shavedIceImg}    // <-- using local import
                alt="Island Shaved Ice" 
                className="w-full h-48 object-cover"
              />
              <div className="p-6">
                <h3 className="font-semibold text-lg mb-2">Island Shaved Ice</h3>
                <p className="text-gray-600 text-sm">
                  Refreshing tropical flavors topped with fresh fruit
                </p>
              </div>
            </div>

            {/* 3) Island Burger */}
            <div className="bg-white rounded-lg overflow-hidden shadow-sm">
              <img 
                src={burgerImg}       // <-- using local import
                alt="Island Burger" 
                className="w-full h-48 object-cover"
              />
              <div className="p-6">
                <h3 className="font-semibold text-lg mb-2">Island Burgers</h3>
                <p className="text-gray-600 text-sm">
                  Signature burgers with a tropical twist
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========== About Section ========== */}
      <div className="bg-white py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6">Our Story</h2>
            <p className="text-gray-600 mb-4 text-sm md:text-base">
              Hafaloha represents the beautiful union of Chamorro and Hawaiian cultures. 
              Our journey began with shaved ice and acai bowls, growing into a full-service 
              restaurant that celebrates the best of both islands.
            </p>
            <p className="text-gray-600 text-sm md:text-base">
              Today, we’re proud to serve a diverse menu that includes traditional dishes 
              from both cultures, along with creative fusion items that bring together 
              the best of both worlds.
            </p>
          </div>
        </div>
      </div>

      {/* ========== Footer ========== */}
      <footer className="bg-gray-900 text-white py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-semibold text-lg mb-4">Hours</h3>
              <p className="text-gray-400">Mon-Thu: 11AM-9PM</p>
              <p className="text-gray-400">Fri-Sat: 11AM-10PM</p>
              <p className="text-gray-400">Sun: 11AM-9PM</p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-4">Contact</h3>
              <p className="text-gray-400">(671) 123-4567</p>
              <p className="text-gray-400">info@hafaloha.com</p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-4">Location</h3>
              <p className="text-gray-400">955 Pale San Vitores Rd</p>
              <p className="text-gray-400">Tamuning, Guam 96913</p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-4">Follow Us</h3>
              <p className="text-gray-400">@hafaloha</p>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400 text-sm">
            <p>© {new Date().getFullYear()} Hafaloha. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* ========== Reservation Modal ========== */}
      <ReservationModal
        isOpen={isReservationOpen}
        onClose={() => setIsReservationOpen(false)}
      />
    </div>
  );
}
