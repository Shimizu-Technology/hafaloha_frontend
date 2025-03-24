import React, { useEffect } from 'react';
import posthog from 'posthog-js';
import { PostHogProvider as OriginalPostHogProvider } from 'posthog-js/react';
import { useAuthStore } from '../../auth';
import { useRestaurantStore } from '../../store/restaurantStore';

// Options for PostHog initialization
const posthogOptions = {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
  autocapture: true,
  capture_pageview: true,
  capture_pageleave: true,
  disable_session_recording: false, // Enable session recording
};

// Create wrapper component to handle restaurant context
const PostHogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthStore();
  const { restaurant } = useRestaurantStore();
  
  useEffect(() => {
    // Identify user when they log in
    if (user) {
      posthog.identify(
        user.id.toString(), 
        {
          email: user.email,
          name: user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim(),
          role: user.role,
          restaurant_id: user.restaurant_id,
          phone_verified: user.phone_verified
        }
      );
    }
    
    // Set up restaurant as a group when available
    if (restaurant) {
      posthog.group('restaurant', restaurant.id.toString(), {
        name: restaurant.name,
        address: restaurant.address,
        time_zone: restaurant.time_zone,
        vip_enabled: restaurant.vip_enabled
      });
    }
  }, [user, restaurant]);

  return (
    <OriginalPostHogProvider 
      apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_KEY}
      options={posthogOptions}
    >
      {children}
    </OriginalPostHogProvider>
  );
};

export default PostHogProvider;
