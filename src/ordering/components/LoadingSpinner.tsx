// src/ordering/components/LoadingSpinner.tsx
import React from 'react';
import HafalohaLogo from '../assets/hafaloha-logo.png';

export function LoadingSpinner() {

  return (
    <div className="bg-gray-200 p-2 rounded flex items-center justify-center">
      <img
        src={HafalohaLogo}
        alt="Loading..."
        className="h-24 w-24 animate-spin object-contain"
      />
    </div>
  );
}
