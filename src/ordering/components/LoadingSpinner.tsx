// src/ordering/components/LoadingSpinner.tsx
import React from 'react';
import { useSiteSettingsStore } from '../store/siteSettingsStore';
import fallbackSpinner from '../assets/Hafaloha-Fat-Pua.png';

export function LoadingSpinner() {
  // Grab the dynamic spinner URL
  const spinnerUrl = useSiteSettingsStore((state) => state.spinnerImageUrl);
  const finalSpinner = spinnerUrl || fallbackSpinner;

  return (
    <div className="bg-gray-200 p-2 rounded flex items-center justify-center">
      <img
        src={finalSpinner}
        alt="Loading..."
        className="h-24 w-24 animate-spin object-contain"
      />
    </div>
  );
}
