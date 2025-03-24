// src/ordering/components/Hero.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ReservationModal } from './reservation/ReservationModal';

import { useRestaurantStore } from '../../shared/store/restaurantStore';
import { useSiteSettingsStore } from '../store/siteSettingsStore';
import fallbackHero from '../assets/hafaloha_hero.webp';

// Typical hero image dimensions - adjust these to match your actual image
const HERO_WIDTH = 1920;
const HERO_HEIGHT = 1080;

export function Hero() {
  const [showReservationModal, setShowReservationModal] = useState(false);

  // Get the restaurant from the store
  const restaurant = useRestaurantStore((state) => state.restaurant);
  
  // Pull the dynamic heroImageUrl from the restaurant's admin_settings or fall back to the site settings
  const siteHeroImageUrl = useSiteSettingsStore((state) => state.heroImageUrl);
  const restaurantHeroImageUrl = restaurant?.admin_settings?.hero_image_url;
  
  // Priority: 1. Restaurant's hero image, 2. Site settings hero image, 3. Fallback image
  const backgroundImage = restaurantHeroImageUrl || siteHeroImageUrl || fallbackHero;

  return (
    <>
    <div className="relative bg-gray-900">
        <div className="absolute inset-0">
          {/* Add debugging for hero image */}
          <img
            className="w-full h-full object-cover"
            src={backgroundImage}
            alt="Hawaiian beach backdrop"
            width={HERO_WIDTH}
            height={HERO_HEIGHT}
            loading="eager"
            onError={(e) => {
              console.error('[Hero] Failed to load hero image:', backgroundImage, e);
            }}
            {...{ fetchpriority: "high" } as any}
          />
          <div className="absolute inset-0 bg-gray-900 opacity-75" />
        </div>

        <div className="relative max-w-7xl mx-auto py-16 sm:py-24 md:py-32 px-4 sm:px-6 lg:px-8">
          {/* Heading */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white">
            Experience the Flavors of Two Islands
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-gray-300 max-w-3xl">
            Where Chamorro and Hawaiian cuisines come together to create 
            an unforgettable dining experience
          </p>

          {/* Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <Link
              to="/menu"
              className="inline-flex items-center justify-center px-6 py-3
                         border border-transparent text-base font-medium rounded-md 
                         text-gray-900 bg-[#c1902f]
                         hover:bg-[#d4a43f] transition-colors duration-150"
            >
              Order Now
            </Link>
            {/* Book Your Table button temporarily hidden
            <button
              onClick={() => setShowReservationModal(true)}
              className="inline-flex items-center justify-center px-6 py-3
                         border-2 border-[#c1902f]
                         text-base font-medium rounded-md text-white
                         hover:bg-[#c1902f] transition-colors duration-150"
            >
              Book Your Table
            </button>
            */}
          </div>
        </div>

        {/* Reservation Modal */}
        <ReservationModal
          isOpen={showReservationModal}
          onClose={() => setShowReservationModal(false)}
        />
      </div>
    </>
  );
}
