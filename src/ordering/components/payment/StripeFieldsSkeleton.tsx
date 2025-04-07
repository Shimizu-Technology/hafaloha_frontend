// Using JSX requires the React import even if not directly referenced
// React is needed for JSX transformation even if not explicitly used
// @ts-ignore
import React from 'react';

/**
 * StripeFieldsSkeleton
 *
 * A skeleton UI component that mimics the appearance of Stripe payment fields
 * while they are loading. This improves perceived performance by showing
 * a placeholder immediately with consistent sizing to prevent layout shifts.
 */
export function StripeFieldsSkeleton() {
  return (
    <div className="stripe-skeleton animate-pulse w-full px-4 py-3 min-h-[200px] flex flex-col justify-center">
      {/* Card number field skeleton */}
      <div className="mb-5">
        <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
        <div className="h-12 bg-gray-200 rounded-md w-full"></div>
      </div>
      
      {/* Expiry and CVC fields skeleton - side by side */}
      <div className="flex space-x-4 mb-5">
        <div className="flex-1">
          <div className="h-4 w-24 bg-gray-200 rounded mb-2"></div>
          <div className="h-12 bg-gray-200 rounded-md w-full"></div>
        </div>
        <div className="flex-1">
          <div className="h-4 w-16 bg-gray-200 rounded mb-2"></div>
          <div className="h-12 bg-gray-200 rounded-md w-full"></div>
        </div>
      </div>
      
      {/* Postal code field skeleton */}
      <div className="mb-4">
        <div className="h-4 w-28 bg-gray-200 rounded mb-2"></div>
        <div className="h-12 bg-gray-200 rounded-md w-full"></div>
      </div>
      
      {/* Subtle loading indicator */}
      <div className="flex justify-center mt-4">
        <div className="w-8 h-1 bg-gray-200 rounded-full mx-1"></div>
        <div className="w-8 h-1 bg-gray-300 rounded-full mx-1 animate-pulse"></div>
        <div className="w-8 h-1 bg-gray-200 rounded-full mx-1"></div>
      </div>
    </div>
  );
}