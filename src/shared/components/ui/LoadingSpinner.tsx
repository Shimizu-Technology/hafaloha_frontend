// src/shared/components/ui/LoadingSpinner.tsx
import React from 'react';
import { useSiteSettingsStore } from '../../store/siteSettingsStore';
import fallbackSpinner from '../../assets/Hafaloha-Fat-Pua.png';

interface LoadingSpinnerProps {
  className?: string;
  showText?: boolean;
}

export function LoadingSpinner({ className = '', showText = true }: LoadingSpinnerProps) {
  // Grab the dynamic spinner URL
  const spinnerUrl = useSiteSettingsStore((state) => state.spinnerImageUrl);
  const finalSpinner = spinnerUrl || fallbackSpinner;

  return (
    <div className={`bg-gray-800 p-4 rounded flex flex-col items-center justify-center ${className}`}>
      <div className="bg-white p-2 rounded mb-2">
        <img
          src={finalSpinner}
          alt="Loading..."
          className="h-16 w-16 animate-spin object-contain"
        />
      </div>
      {showText && (
        <p className="text-white font-medium">Loading...</p>
      )}
    </div>
  );
}
