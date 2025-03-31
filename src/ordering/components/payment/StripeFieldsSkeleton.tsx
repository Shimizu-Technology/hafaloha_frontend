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
    <div className="stripe-skeleton animate-pulse w-full px-4 py-3 flex flex-col items-center transition-opacity duration-300 ease-in-out opacity-100">
      <div className="w-full max-w-md min-h-[250px]">
        {/* Payment method options skeleton */}
        <div className="mb-6">
          <div className="flex space-x-2 mb-4">
            <div className="h-10 bg-gray-200 rounded-md w-24 flex-shrink-0"></div>
            <div className="h-10 bg-gray-200 rounded-md w-24 flex-shrink-0"></div>
            <div className="h-10 bg-gray-200 rounded-md w-24 flex-shrink-0"></div>
          </div>
        </div>
        
        {/* Card number field skeleton */}
        <div className="mb-4">
          <div className="h-4 w-24 bg-gray-200 rounded mb-2"></div>
          <div className="h-12 bg-gray-200 rounded-md w-full"></div>
        </div>
        
        {/* Expiry and CVC fields skeleton - side by side */}
        <div className="flex space-x-4 mb-4">
          <div className="flex-1">
            <div className="h-4 w-20 bg-gray-200 rounded mb-2"></div>
            <div className="h-12 bg-gray-200 rounded-md w-full"></div>
          </div>
          <div className="flex-1">
            <div className="h-4 w-12 bg-gray-200 rounded mb-2"></div>
            <div className="h-12 bg-gray-200 rounded-md w-full"></div>
          </div>
        </div>
        
        {/* Country/postal code field skeleton */}
        <div className="mb-4">
          <div className="h-4 w-24 bg-gray-200 rounded mb-2"></div>
          <div className="h-12 bg-gray-200 rounded-md w-full"></div>
        </div>
      </div>
    </div>
  );
}