import React from 'react';

/**
 * StripeFieldsSkeleton
 * 
 * A skeleton UI component that mimics the appearance of Stripe payment fields
 * while they are loading. This improves perceived performance by showing
 * a placeholder immediately.
 */
export function StripeFieldsSkeleton() {
  return (
    <div className="stripe-skeleton animate-pulse">
      {/* Card number field skeleton */}
      <div className="mb-4">
        <div className="h-4 w-24 bg-gray-200 rounded mb-2"></div>
        <div className="h-10 bg-gray-200 rounded-md w-full"></div>
      </div>
      
      {/* Expiry and CVC fields skeleton - side by side */}
      <div className="flex space-x-4 mb-4">
        <div className="flex-1">
          <div className="h-4 w-20 bg-gray-200 rounded mb-2"></div>
          <div className="h-10 bg-gray-200 rounded-md w-full"></div>
        </div>
        <div className="flex-1">
          <div className="h-4 w-12 bg-gray-200 rounded mb-2"></div>
          <div className="h-10 bg-gray-200 rounded-md w-full"></div>
        </div>
      </div>
      
      {/* Postal code field skeleton */}
      <div className="mb-4">
        <div className="h-4 w-24 bg-gray-200 rounded mb-2"></div>
        <div className="h-10 bg-gray-200 rounded-md w-full"></div>
      </div>
    </div>
  );
}