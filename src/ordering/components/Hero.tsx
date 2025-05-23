// src/ordering/components/Hero.tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ReservationModal } from './reservation/ReservationModal';

import { useRestaurantStore } from '../../shared/store/restaurantStore';
import { useSiteSettingsStore } from '../store/siteSettingsStore';
import fallbackHero from '../assets/hafaloha_hero.webp';
import OptimizedImage from '../../shared/components/ui/OptimizedImage';

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
    <div className="relative bg-gray-900">
      <div className="absolute inset-0">
        <OptimizedImage
          className="w-full h-full object-cover"
          src={backgroundImage}
          alt="Hawaiian beach backdrop"
          width="1920"
          height="1080"
          priority={true}
          fetchPriority="high"
          context="hero"
        />
        <div className="absolute inset-0 bg-gray-900 opacity-75" />
      </div>

      <div className="relative max-w-7xl mx-auto py-16 sm:py-24 md:py-32 px-4 sm:px-6 lg:px-8">
        {/* Content container with subtle animation */}
        <div className="animate-fadeIn">
          {/* Heading with text shadow for better readability */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white drop-shadow-sm">
            Experience the Flavors of Two Islands
          </h1>
          
          {/* Subheading with improved contrast */}
          <p className="mt-6 text-lg sm:text-xl text-white text-opacity-90 max-w-3xl font-light drop-shadow-sm">
            Where Chamorro and Hawaiian cuisines come together to create 
            an unforgettable dining experience
          </p>

          {/* Buttons with improved styling and hover effects */}
          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <Link
              to="/menu"
              className="inline-flex items-center justify-center px-6 py-3.5
                        border border-transparent text-base font-medium rounded-md 
                        text-white bg-[#c1902f] shadow-md
                        hover:bg-[#d4a43f] hover:shadow-lg transform hover:-translate-y-0.5
                        transition-all duration-200 ease-in-out"
            >
              Order Now
            </Link>
            {/* Only show Book Your Table button if enabled in settings */}
            {restaurant?.admin_settings?.reservations?.enable_reservations_button !== false && (
              <button
                onClick={() => setShowReservationModal(true)}
                className="inline-flex items-center justify-center px-6 py-3.5
                          border-2 border-white border-opacity-80 shadow-md
                          text-base font-medium rounded-md text-white
                          hover:bg-white hover:bg-opacity-10 hover:border-opacity-100 hover:shadow-lg
                          transform hover:-translate-y-0.5
                          transition-all duration-200 ease-in-out"
              >
                Book Your Table
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Reservation Modal */}
      <ReservationModal
        isOpen={showReservationModal}
        onClose={() => setShowReservationModal(false)}
      />
    </div>
  );
}
