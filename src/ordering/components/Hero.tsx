// src/ordering/components/Hero.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ReservationModal } from './reservation/ReservationModal';

import { useSiteSettingsStore } from '../store/siteSettingsStore';
import fallbackHero from '../assets/hafaloha_hero.jpg';

export function Hero() {
  const [showReservationModal, setShowReservationModal] = useState(false);
  const { t } = useTranslation();

  // Pull the dynamic heroImageUrl from the store
  const heroImageUrl = useSiteSettingsStore((state) => state.heroImageUrl);

  // If the dynamic URL is null/empty, use the fallback image
  const backgroundImage = heroImageUrl || fallbackHero;

  return (
    <div className="relative bg-gray-900">
      <div className="absolute inset-0">
        <img
          className="w-full h-full object-cover"
          src={backgroundImage}
          alt="Hawaiian beach backdrop"
        />
        <div className="absolute inset-0 bg-gray-900 opacity-75" />
      </div>

      <div className="relative max-w-7xl mx-auto py-16 sm:py-24 md:py-32 px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white">
          {t('hero.title')}
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-gray-300 max-w-3xl">
          {t('hero.subtitle')}
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
            {t('buttons.orderNow')}
          </Link>
          <button
            onClick={() => setShowReservationModal(true)}
            className="inline-flex items-center justify-center px-6 py-3
                       border-2 border-[#c1902f]
                       text-base font-medium rounded-md text-white
                       hover:bg-[#c1902f] transition-colors duration-150"
          >
            {t('buttons.bookTable')}
          </button>
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
