// src/ordering/components/admin/settings/RestaurantSettings.tsx

import React, { useEffect, useState, useRef } from 'react';
import { config } from '../../../../shared/config';
import toastUtils from '../../../../shared/utils/toastUtils';
import { Input, LoadingSpinner, SettingsHeader, MobileSelect } from '../../../../shared/components/ui';
import { Settings } from 'lucide-react';
import { 
  updateRestaurant as apiUpdateRestaurant,
  uploadRestaurantImages
} from '../../../../shared/api/endpoints/restaurants';
import { formatPhoneNumber } from '../../../../shared/utils/formatters';
import { useRestaurantStore, Restaurant } from '../../../../shared/store/restaurantStore';
import ReactDOM from 'react-dom/client';

// Helper function to create an object URL for preview (faster than base64)
const createImagePreview = (file: File): string => {
  return URL.createObjectURL(file);
};

// Helper function to compress an image before uploading
const compressImage = async (file: File, maxSizeMB = 1): Promise<File> => {
  // If the file is already small, don't compress it
  if (file.size < maxSizeMB * 1024 * 1024) {
    return file;
  }

  // Use canvas to compress the image
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      
      // Calculate new dimensions while maintaining aspect ratio
      let width = img.width;
      let height = img.height;
      const maxDimension = 1200; // Max width or height
      
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round(height * (maxDimension / width));
          width = maxDimension;
        } else {
          width = Math.round(width * (maxDimension / height));
          height = maxDimension;
        }
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to blob with reduced quality
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Could not create blob'));
            return;
          }
          
          // Create a new file from the blob
          const newFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          
          resolve(newFile);
        },
        'image/jpeg',
        0.7 // Quality (0.7 = 70%)
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };
  });
};

// List of common timezones
const timezoneOptions = [
  { value: 'Pacific/Guam', label: 'Pacific/Guam (UTC+10:00)' },
  { value: 'Pacific/Honolulu', label: 'Pacific/Honolulu (UTC-10:00)' },
  { value: 'America/Anchorage', label: 'America/Anchorage (UTC-09:00)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (UTC-08:00)' },
  { value: 'America/Denver', label: 'America/Denver (UTC-07:00)' },
  { value: 'America/Chicago', label: 'America/Chicago (UTC-06:00)' },
  { value: 'America/New_York', label: 'America/New_York (UTC-05:00)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (UTC+09:00)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (UTC+08:00)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (UTC+11:00)' },
  { value: 'Europe/London', label: 'Europe/London (UTC+00:00)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (UTC+01:00)' },
];

interface RestaurantSettingsProps {
  restaurantId?: string;
}

export function RestaurantSettings({ restaurantId }: RestaurantSettingsProps): JSX.Element {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [spinnerFile, setSpinnerFile] = useState<File | null>(null);
  const [fallbackFile, setFallbackFile] = useState<File | null>(null);
  const [heroPreview, setHeroPreview] = useState<string | null>(null);
  const [spinnerPreview, setSpinnerPreview] = useState<string | null>(null);
  const [fallbackPreview, setFallbackPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { fetchRestaurant } = useRestaurantStore();
  const hasLoadedRef = useRef<boolean>(false);

  // Helper function to update notification channel settings
  function updateNotificationChannel(
    notificationType: 'orders' | 'reservations',
    channel: 'email' | 'sms',
    enabled: boolean
  ) {
    const currentSettings = restaurant?.admin_settings || {};
    const notificationChannels = currentSettings.notification_channels || {};
    const typeSettings = notificationChannels[notificationType] || {};
    
    setRestaurant({
      ...restaurant!,
      admin_settings: {
        ...currentSettings,
        notification_channels: {
          ...notificationChannels,
          [notificationType]: {
            ...typeSettings,
            [channel]: enabled
          }
        }
      }
    });
  }

  // Clean up object URLs when component unmounts or when previews change
  useEffect(() => {
    return () => {
      if (heroPreview && heroPreview.startsWith('blob:')) {
        URL.revokeObjectURL(heroPreview);
      }
      if (spinnerPreview && spinnerPreview.startsWith('blob:')) {
        URL.revokeObjectURL(spinnerPreview);
      }
      if (fallbackPreview && fallbackPreview.startsWith('blob:')) {
        URL.revokeObjectURL(fallbackPreview);
      }
    };
  }, [heroPreview, spinnerPreview, fallbackPreview]);

  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      fetchRestaurantData();
    }
  }, []);

  async function fetchRestaurantData() {
    // Set up a timer to show loading state only if the request takes longer than 500ms
    const loadingTimer = setTimeout(() => {
      setLoading(true);
    }, 500);
    
    try {
      // Get the restaurant ID from the URL params or props
      // This ensures we're using the restaurant the user is currently logged into
      const urlParams = new URLSearchParams(window.location.search);
      const urlRestaurantId = urlParams.get('restaurant_id');
      
      // For super_admins, we need to ensure we're using the restaurant ID they're currently viewing
      // rather than defaulting to a specific restaurant
      let targetRestaurantId;
      
      // PRIORITY ORDER FOR RESTAURANT ID:
      // 1. URL parameters (highest priority for super_admins) - this is what they're currently viewing
      if (urlRestaurantId) {
        targetRestaurantId = parseInt(urlRestaurantId, 10);
        console.log(`Using restaurant ID from URL: ${targetRestaurantId}`);
      }
      // 2. Props passed by parent component
      else if (restaurantId) {
        targetRestaurantId = parseInt(restaurantId, 10);
        console.log(`Using restaurant ID from props: ${targetRestaurantId}`);
      }
      // Finally, try to extract restaurant_id from JWT token
      else {
        try {
          const token = localStorage.getItem('token') || '';
          if (token) {
            // JWT tokens are in format: header.payload.signature
            const payload = token.split('.')[1];
            if (payload) {
              // Decode the base64 payload
              const decodedPayload = JSON.parse(atob(payload));
              if (decodedPayload.restaurant_id) {
                targetRestaurantId = parseInt(decodedPayload.restaurant_id, 10);
              }
            }
          }
        } catch (error) {
          console.error('Error extracting restaurant ID from token:', error);
        }
      }
      
      // If all else fails, use the config default
      if (!targetRestaurantId || isNaN(targetRestaurantId)) {
        targetRestaurantId = parseInt(config.restaurantId, 10);
      }
      
      console.log(`Fetching restaurant with ID: ${targetRestaurantId}`);
      
      try {
        // Use API base URL from config instead of hardcoded value
        const token = localStorage.getItem('token') || '';
        const currentOrigin = window.location.origin;
        
        // For the URL path, we use the targetRestaurantId to specify which restaurant data we want to fetch
        // For the query parameter, we also use targetRestaurantId to set the tenant context
        // This ensures super_admins see data for the restaurant they're currently viewing
        const response = await fetch(`${config.apiBaseUrl}/restaurants/${targetRestaurantId}?restaurant_id=${targetRestaurantId}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': token,
            'X-Restaurant-Id': targetRestaurantId.toString(),
            'X-Frontend-Id': 'hafaloha',
            'X-Frontend-Restaurant-Id': targetRestaurantId.toString(),
            'Origin': currentOrigin,
            'Referer': currentOrigin
          }
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          console.error('Received non-JSON response:', text.substring(0, 100) + '...');
          throw new Error('Received non-JSON response from server');
        }
        
        const singleRestaurant = await response.json();
        if (singleRestaurant) {
          console.log(`Successfully fetched restaurant data for ID: ${targetRestaurantId}`, singleRestaurant);
          setRestaurant(singleRestaurant as Restaurant);
          
          // Clear loading state
          clearTimeout(loadingTimer);
          setLoading(false);
          return; // Exit if successful
        }
      } catch (fetchError) {
        console.error(`Failed to fetch restaurant with ID ${targetRestaurantId}:`, fetchError);
        // Only proceed to fallback if there was an error
      }
      
      // Do not fall back to default restaurant ID
      // This ensures super admins always see data for the restaurant they're currently viewing
      console.error(`Failed to fetch restaurant data for ID: ${targetRestaurantId}. No fallback will be used.`);
      
      // If we get here, the primary request failed
      toastUtils.error('Could not load restaurant data. Please try refreshing the page.');
      
      // If we get here, all attempts failed
      toastUtils.error('Could not load restaurant data. Please try refreshing the page.');
    
    } catch (err: any) {
      console.error('Failed to load restaurant data:', err);
      toastUtils.error('Failed to load restaurant data');
      
      // Create a default restaurant object if we can't fetch one
      // This allows the form to still be displayed with default values
      setRestaurant({
        id: 1,
        name: 'Restaurant',
        address: '',
        phone_number: '',
        time_zone: 'Pacific/Guam',
        time_slot_interval: 30,
        default_reservation_length: 60,
        admin_settings: {},
        allowed_origins: []
      });
    } finally {
      // Clear the timer and set loading to false
      clearTimeout(loadingTimer);
      setLoading(false);
    }
  }

  // Function to handle image file selection - compress the image and show a preview
  async function handleImageFileChange(file: File, imageType: 'hero' | 'spinner' | 'fallback') {
    if (!file) return;
    
    try {
      // Create a preview URL (faster than base64)
      const previewUrl = createImagePreview(file);
      
      // Compress the image in the background
      const compressedFile = await compressImage(file);
      
      // Store the file and preview in the component state
      if (imageType === 'hero') {
        setHeroFile(compressedFile);
        setHeroPreview(previewUrl);
      } else if (imageType === 'spinner') {
        setSpinnerFile(compressedFile);
        setSpinnerPreview(previewUrl);
      } else if (imageType === 'fallback') {
        setFallbackFile(compressedFile);
        setFallbackPreview(previewUrl);
      }
    } catch (error) {
      console.error(`Error processing ${imageType} image preview:`, error);
      toastUtils.error(`Failed to generate preview for ${imageType} image`);
    }
  }

  async function handleRestaurantUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!restaurant) return;

    // If no new files, just update the text fields
    if (!heroFile && !spinnerFile && !fallbackFile) {
      setLoading(true);
      try {
        await apiUpdateRestaurant(restaurant.id, {
          name: restaurant.name,
          address: restaurant.address,
          custom_pickup_location: restaurant.custom_pickup_location,
          phone_number: restaurant.phone_number,
          contact_email: restaurant.contact_email,
          facebook_url: restaurant.facebook_url,
          instagram_url: restaurant.instagram_url,
          twitter_url: restaurant.twitter_url,
          primary_frontend_url: restaurant.primary_frontend_url,
          time_zone: restaurant.time_zone,
          time_slot_interval: restaurant.time_slot_interval,
          default_reservation_length: restaurant.default_reservation_length,
          admin_settings: restaurant.admin_settings
        });
        
        // Fetch the updated restaurant data to ensure all components have the latest data
        await fetchRestaurant();
        
        toastUtils.success('Restaurant settings updated!');
      } catch (err: any) {
        console.error('Failed to update restaurant settings:', err);
        toastUtils.error('Failed to update restaurant settings');
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    
    try {
      // Create a loading overlay element
      const loadingOverlay = document.createElement('div');
      loadingOverlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
      
      // Create a div to hold the LoadingSpinner component
      const spinnerContainer = document.createElement('div');
      spinnerContainer.id = 'loading-spinner-container';
      loadingOverlay.appendChild(spinnerContainer);
      
      // Add to the document
      document.body.appendChild(loadingOverlay);
      
      // Create a root and render the LoadingSpinner
      const root = ReactDOM.createRoot(
        document.getElementById('loading-spinner-container')!
      );
      root.render(<LoadingSpinner showText={true} />);
      
      // Run text update and image upload in parallel for better performance
      const updatePromises = [];
      
          // Update restaurant text fields
          const textUpdatePromise = apiUpdateRestaurant(restaurant.id, {
            name: restaurant.name,
            address: restaurant.address,
            custom_pickup_location: restaurant.custom_pickup_location,
            phone_number: restaurant.phone_number,
            contact_email: restaurant.contact_email,
            facebook_url: restaurant.facebook_url,
            instagram_url: restaurant.instagram_url,
            twitter_url: restaurant.twitter_url,
            primary_frontend_url: restaurant.primary_frontend_url,
            time_zone: restaurant.time_zone,
            time_slot_interval: restaurant.time_slot_interval,
            default_reservation_length: restaurant.default_reservation_length,
            admin_settings: restaurant.admin_settings
          });
      updatePromises.push(textUpdatePromise);
      
      // Upload the images using FormData
      if (heroFile || spinnerFile || fallbackFile) {
        const formData = new FormData();
        if (heroFile) formData.append('hero_image', heroFile);
        if (spinnerFile) formData.append('spinner_image', spinnerFile);
        if (fallbackFile) formData.append('fallback_image', fallbackFile);
        
        // Include an empty restaurant parameter to satisfy the backend
        formData.append('restaurant[name]', restaurant.name);
        
        // Upload the images
        const imageUploadPromise = uploadRestaurantImages(restaurant.id, formData)
          .then((updatedRestaurant) => {
            // Update the restaurant state with the new data
            setRestaurant(updatedRestaurant as Restaurant);
          });
        updatePromises.push(imageUploadPromise);
      }
      
      // Wait for all updates to complete
      await Promise.all(updatePromises);
      
      // Clear the file inputs
      setHeroFile(null);
      setSpinnerFile(null);
      setFallbackFile(null);
      
      // Clean up object URLs
      if (heroPreview && heroPreview.startsWith('blob:')) {
        URL.revokeObjectURL(heroPreview);
      }
      if (spinnerPreview && spinnerPreview.startsWith('blob:')) {
        URL.revokeObjectURL(spinnerPreview);
      }
      if (fallbackPreview && fallbackPreview.startsWith('blob:')) {
        URL.revokeObjectURL(fallbackPreview);
      }
      
      setHeroPreview(null);
      setSpinnerPreview(null);
      setFallbackPreview(null);
      
      // Fetch the updated restaurant data to ensure all components have the latest data
      await fetchRestaurant();
      
      // Remove the loading overlay
      document.body.removeChild(loadingOverlay);
      
      toastUtils.success('Restaurant settings updated!');
    } catch (err: any) {
      console.error('Failed to update restaurant settings:', err);
      toastUtils.error('Failed to update restaurant settings');
      
      // Remove the loading overlay in case of error
      const errorOverlay = document.querySelector('.fixed.inset-0.bg-black.bg-opacity-50.flex.items-center.justify-center.z-50');
      if (errorOverlay && errorOverlay.parentNode) {
        errorOverlay.parentNode.removeChild(errorOverlay);
      }
    } finally {
      setLoading(false);
    }
  }

  // Initial loading state (no restaurant data yet)
  if (loading && !restaurant) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner className="mx-auto" />
      </div>
    );
  }

  return (
    <div>
      <SettingsHeader 
        title="Restaurant Settings"
        description="Configure your restaurant's information, branding, and reservation settings."
        icon={<Settings className="h-6 w-6" />}
      />
      
      {/* Loading overlay */}
      {loading && restaurant && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity duration-300">
          <LoadingSpinner showText={true} />
        </div>
      )}
      
      {restaurant && (
        <form onSubmit={handleRestaurantUpdate} className="space-y-8 mt-6">
          {/* Basic Information Section */}
          <div className="bg-white border border-gray-100 rounded-lg shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-100">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-[#c1902f]" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14a6 6 0 110-12 6 6 0 010 12z" clipRule="evenodd" />
                </svg>
                Basic Information
              </h3>
            </div>
            
            <div className="p-5 space-y-4">
              <Input
                label="Restaurant Name"
                value={restaurant.name}
                onChange={(e) => setRestaurant({...restaurant, name: e.target.value})}
                placeholder="Enter restaurant name"
                required
              />
              
              <Input
                label="Address"
                value={restaurant.address || ''}
                onChange={(e) => setRestaurant({...restaurant, address: e.target.value})}
                placeholder="Enter restaurant address"
              />
              
              <Input
                label="Custom Pickup Location"
                value={restaurant.custom_pickup_location || ''}
                onChange={(e) => setRestaurant({...restaurant, custom_pickup_location: e.target.value})}
                placeholder="Enter special pickup location (e.g., Concert Venue, Beach Event)"
              />
              <p className="mt-1 text-sm text-gray-500 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Only set this when pickup is not at the usual restaurant address. Leave empty to use regular address.
              </p>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Custom Pickup Instructions
                </label>
                <textarea
                  value={restaurant.admin_settings?.custom_pickup_instructions || ''}
                  onChange={(e) => setRestaurant({
                    ...restaurant, 
                    admin_settings: {
                      ...restaurant.admin_settings,
                      custom_pickup_instructions: e.target.value
                    }
                  })}
                  placeholder="Enter custom pickup instructions for special events or temporary changes..."
                  rows={3}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#c1902f] focus:border-[#c1902f] sm:text-sm transition-all duration-200"
                />
                <p className="mt-1 text-sm text-gray-500 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  When set, these instructions will override the default pickup instructions. Leave empty to use default instructions.
                </p>
              </div>

              <Input
                label="Contact Email"
                value={restaurant.contact_email || ''}
                onChange={(e) => setRestaurant({
                  ...restaurant, 
                  contact_email: e.target.value
                })}
                placeholder="Enter contact email"
                type="email"
              />

              <div className="space-y-4 mt-4 pt-4 border-t border-gray-100">
                <h4 className="text-base font-medium text-gray-700">Website & Social Media</h4>
                
                <Input
                  label="Primary Frontend URL"
                  value={restaurant.primary_frontend_url || ''}
                  onChange={(e) => setRestaurant({
                    ...restaurant, 
                    primary_frontend_url: e.target.value
                  })}
                  placeholder="e.g., https://hafaloha-orders.com"
                  type="url"
                />
                
                <p className="text-sm text-gray-500 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  This URL will be used for email links and redirects. If not set, the system will use allowed origins or environment variables.
                </p>
                
                <Input
                  label="Facebook URL"
                  value={restaurant.facebook_url || ''}
                  onChange={(e) => setRestaurant({
                    ...restaurant, 
                    facebook_url: e.target.value
                  })}
                  placeholder="e.g., https://facebook.com/hafaloha"
                  type="url"
                />
                
                <Input
                  label="Instagram URL"
                  value={restaurant.instagram_url || ''}
                  onChange={(e) => setRestaurant({
                    ...restaurant, 
                    instagram_url: e.target.value
                  })}
                  placeholder="e.g., https://instagram.com/hafaloha"
                  type="url"
                />
                
                <Input
                  label="Twitter URL"
                  value={restaurant.twitter_url || ''}
                  onChange={(e) => setRestaurant({
                    ...restaurant, 
                    twitter_url: e.target.value
                  })}
                  placeholder="e.g., https://twitter.com/hafaloha"
                  type="url"
                />
                
                <p className="text-sm text-gray-500 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Leave social media fields empty to hide their respective icons in the footer.
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 flex items-center">
                  Phone Number
                  <span className="ml-1 text-gray-500 text-xs rounded-full bg-gray-100 w-4 h-4 inline-flex items-center justify-center" title="Enter in format: +16719893444">ⓘ</span>
                </label>
                <input
                  type="text"
                  value={restaurant.phone_number || ''}
                  onChange={(e) => setRestaurant({...restaurant, phone_number: e.target.value})}
                  placeholder="Enter restaurant phone number"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#c1902f] focus:border-[#c1902f] sm:text-sm transition-all duration-200"
                />
                {restaurant.phone_number && (
                  <p className="mt-1 text-sm text-gray-500 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                    </svg>
                    Will display as: {formatPhoneNumber(restaurant.phone_number)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Notification Settings Section */}
          <div className="bg-white border border-gray-100 rounded-lg shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-100">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-[#c1902f]" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                </svg>
                Notification Settings
              </h3>
            </div>
            
            <div className="p-5 space-y-5">
              <div className="bg-gray-50 p-4 rounded-md border border-gray-100">
                <label className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  WhatsApp Group ID
                  <span className="ml-1 text-gray-500 text-xs rounded-full bg-gray-100 w-4 h-4 inline-flex items-center justify-center" title="The WhatsApp group ID for order notifications">ⓘ</span>
                </label>
                <input
                  type="text"
                  value={restaurant.admin_settings?.whatsapp_group_id || ''}
                  onChange={(e) => setRestaurant({
                    ...restaurant, 
                    admin_settings: {
                      ...restaurant.admin_settings,
                      whatsapp_group_id: e.target.value
                    }
                  })}
                  placeholder="Enter WhatsApp group ID (e.g., 123456789@g.us)"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#c1902f] focus:border-[#c1902f] sm:text-sm transition-all duration-200"
                />
                <p className="mt-2 text-sm text-gray-500 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  This ID is used to send order notifications to a WhatsApp group.
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-md border border-gray-100">
                <label className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  Email Header Color
                  <span className="ml-1 text-gray-500 text-xs rounded-full bg-gray-100 w-4 h-4 inline-flex items-center justify-center" title="The color used for email headers">ⓘ</span>
                </label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <input
                    type="color"
                    value={restaurant.admin_settings?.email_header_color || '#c1902f'}
                    onChange={(e) => setRestaurant({
                      ...restaurant, 
                      admin_settings: {
                        ...restaurant.admin_settings,
                        email_header_color: e.target.value
                      }
                    })}
                    className="h-10 w-full sm:w-20 p-0 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={restaurant.admin_settings?.email_header_color || '#c1902f'}
                    onChange={(e) => setRestaurant({
                      ...restaurant, 
                      admin_settings: {
                        ...restaurant.admin_settings,
                        email_header_color: e.target.value
                      }
                    })}
                    placeholder="#c1902f"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#c1902f] focus:border-[#c1902f] sm:text-sm transition-all duration-200"
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  This color is used for the header background in email notifications.
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-md border border-gray-100">
                <h4 className="text-base font-semibold mb-3 text-gray-800">Notification Channels</h4>
                
                {/* Order Notifications */}
                <div className="mb-4">
                  <h5 className="text-sm font-medium mb-2">Order Notifications</h5>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="order-email"
                        checked={restaurant.admin_settings?.notification_channels?.orders?.email ?? true}
                        onChange={(e) => updateNotificationChannel('orders', 'email', e.target.checked)}
                        className="h-4 w-4 text-[#c1902f] focus:ring-[#c1902f] border-gray-300 rounded"
                      />
                      <label htmlFor="order-email" className="ml-2 block text-sm text-gray-700">
                        Send email notifications
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="order-sms"
                        checked={restaurant.admin_settings?.notification_channels?.orders?.sms ?? true}
                        onChange={(e) => updateNotificationChannel('orders', 'sms', e.target.checked)}
                        className="h-4 w-4 text-[#c1902f] focus:ring-[#c1902f] border-gray-300 rounded"
                      />
                      <label htmlFor="order-sms" className="ml-2 block text-sm text-gray-700">
                        Send SMS notifications
                      </label>
                    </div>
                  </div>
                </div>
                
                {/* Reservation Notifications */}
                <div>
                  <h5 className="text-sm font-medium mb-2">Reservation Notifications</h5>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="reservation-email"
                        checked={restaurant.admin_settings?.notification_channels?.reservations?.email ?? true}
                        onChange={(e) => updateNotificationChannel('reservations', 'email', e.target.checked)}
                        className="h-4 w-4 text-[#c1902f] focus:ring-[#c1902f] border-gray-300 rounded"
                      />
                      <label htmlFor="reservation-email" className="ml-2 block text-sm text-gray-700">
                        Send email notifications
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="reservation-sms"
                        checked={restaurant.admin_settings?.notification_channels?.reservations?.sms ?? true}
                        onChange={(e) => updateNotificationChannel('reservations', 'sms', e.target.checked)}
                        className="h-4 w-4 text-[#c1902f] focus:ring-[#c1902f] border-gray-300 rounded"
                      />
                      <label htmlFor="reservation-sms" className="ml-2 block text-sm text-gray-700">
                        Send SMS notifications
                      </label>
                    </div>
                  </div>
                </div>
                
                <p className="mt-3 text-sm text-gray-500 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Configure which notification channels are used for different types of customer communications.
                </p>
              </div>
            </div>
          </div>

          {/* Brand Images Section */}
          <div className="bg-white border border-gray-100 rounded-lg shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-100">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-[#c1902f]" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                </svg>
                Brand Images
              </h3>
            </div>
            
            <div className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* HERO IMAGE CARD */}
                <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 flex flex-col">
                  <h4 className="text-base font-semibold mb-3 text-gray-800">Hero Image</h4>

                  {/* Show preview if available, otherwise show the saved image */}
                  {heroPreview ? (
                    <div className="relative">
                      <img
                        src={heroPreview}
                        alt="Hero Preview"
                        className="mb-3 w-full h-48 object-contain border rounded-md bg-white"
                      />
                      <div className="absolute top-0 right-0 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-bl-md">
                        Preview
                      </div>
                    </div>
                  ) : restaurant.admin_settings?.hero_image_url ? (
                    <div className="relative">
                      <img
                        src={restaurant.admin_settings.hero_image_url}
                        alt="Current Hero"
                        className="mb-3 w-full h-48 object-contain border rounded-md bg-white"
                      />
                    </div>
                  ) : (
                    <div className="mb-3 w-full h-48 flex items-center justify-center bg-white border border-dashed border-gray-300 rounded-md">
                      <p className="text-sm text-gray-500">No hero image set yet</p>
                    </div>
                  )}

                  <label className="block mt-2">
                    <span className="text-sm font-medium text-gray-700">Choose a new file:</span>
                    <input
                      type="file"
                      name="hero_image"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleImageFileChange(file, 'hero');
                        }
                      }}
                      className="mt-1 block w-full cursor-pointer text-sm
                                file:mr-4 file:py-2 file:px-4
                                file:rounded file:border-0
                                file:text-sm file:font-semibold
                                file:bg-[#c1902f] file:text-white
                                hover:file:bg-[#d4a43f]"
                    />
                  </label>
                </div>

                {/* SPINNER IMAGE CARD */}
                <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 flex flex-col">
                  <h4 className="text-base font-semibold mb-3 text-gray-800">Spinner Image</h4>

                  {/* Show preview if available, otherwise show the saved image */}
                  {spinnerPreview ? (
                    <div className="relative">
                      <img
                        src={spinnerPreview}
                        alt="Spinner Preview"
                        className="mb-3 w-full h-48 object-contain border rounded-md bg-white"
                      />
                      <div className="absolute top-0 right-0 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-bl-md">
                        Preview
                      </div>
                    </div>
                  ) : restaurant.admin_settings?.spinner_image_url ? (
                    <div className="relative">
                      <img
                        src={restaurant.admin_settings.spinner_image_url}
                        alt="Current Spinner"
                        className="mb-3 w-full h-48 object-contain border rounded-md bg-white"
                      />
                    </div>
                  ) : (
                    <div className="mb-3 w-full h-48 flex items-center justify-center bg-white border border-dashed border-gray-300 rounded-md">
                      <p className="text-sm text-gray-500">No spinner image set yet</p>
                    </div>
                  )}

                  <label className="block mt-2">
                    <span className="text-sm font-medium text-gray-700">Choose a new file:</span>
                    <input
                      type="file"
                      name="spinner_image"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleImageFileChange(file, 'spinner');
                        }
                      }}
                      className="mt-1 block w-full cursor-pointer text-sm
                                file:mr-4 file:py-2 file:px-4
                                file:rounded file:border-0
                                file:text-sm file:font-semibold
                                file:bg-[#c1902f] file:text-white
                                hover:file:bg-[#d4a43f]"
                    />
                  </label>
                </div>

                {/* FALLBACK IMAGE CARD */}
                <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 flex flex-col">
                  <h4 className="text-base font-semibold mb-3 text-gray-800">Menu Fallback Image</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    This image will be shown when a menu item doesn't have an image.
                  </p>

                  {/* Show preview if available, otherwise show the saved image */}
                  {fallbackPreview ? (
                    <div className="relative">
                      <img
                        src={fallbackPreview}
                        alt="Fallback Preview"
                        className="mb-3 w-full h-48 object-contain border rounded-md bg-white"
                      />
                      <div className="absolute top-0 right-0 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-bl-md">
                        Preview
                      </div>
                    </div>
                  ) : restaurant.admin_settings?.fallback_image_url ? (
                    <div className="relative">
                      <img
                        src={restaurant.admin_settings.fallback_image_url}
                        alt="Current Fallback"
                        className="mb-3 w-full h-48 object-contain border rounded-md bg-white"
                      />
                    </div>
                  ) : (
                    <div className="mb-3 w-full h-48 flex items-center justify-center bg-white border border-dashed border-gray-300 rounded-md">
                      <p className="text-sm text-gray-500">No fallback image set yet</p>
                    </div>
                  )}

                  <label className="block mt-2">
                    <span className="text-sm font-medium text-gray-700">Choose a new file:</span>
                    <input
                      type="file"
                      name="fallback_image"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleImageFileChange(file, 'fallback');
                        }
                      }}
                      className="mt-1 block w-full cursor-pointer text-sm
                                file:mr-4 file:py-2 file:px-4
                                file:rounded file:border-0
                                file:text-sm file:font-semibold
                                file:bg-[#c1902f] file:text-white
                                hover:file:bg-[#d4a43f]"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Menu Layout Settings Section */}
          <div className="bg-white border border-gray-100 rounded-lg shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-100">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-[#c1902f]" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                </svg>
                Menu Layout Settings
              </h3>
            </div>
            
            <div className="p-5 space-y-4">
              <div>
                <div className="flex items-center mb-1">
                  <label className="text-sm font-medium text-gray-700 flex items-center">
                    Default Menu Layout
                    <span className="ml-1 text-gray-500 text-xs rounded-full bg-gray-100 w-4 h-4 inline-flex items-center justify-center" title="The default layout for displaying menu items">ⓘ</span>
                  </label>
                </div>
                <MobileSelect
                  options={[
                    { value: 'gallery', label: 'Gallery View (Grid)' },
                    { value: 'list', label: 'List View' }
                  ]}
                  value={restaurant.admin_settings?.menu_layout_preferences?.default_layout || 'gallery'}
                  onChange={(value) => setRestaurant({
                    ...restaurant,
                    admin_settings: {
                      ...restaurant.admin_settings,
                      menu_layout_preferences: {
                        ...restaurant.admin_settings?.menu_layout_preferences,
                        default_layout: value as 'gallery' | 'list'
                      }
                    }
                  })}
                  className="mt-1"
                  placeholder="Select layout type"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Gallery view displays menu items in a grid with larger images, while list view shows items in a compact list format.
                </p>
              </div>
              
              <div className="mt-4">
                <div className="flex items-center">
                  <input
                    id="allow-layout-switching"
                    type="checkbox"
                    checked={restaurant.admin_settings?.menu_layout_preferences?.allow_layout_switching ?? true}
                    onChange={(e) => setRestaurant({
                      ...restaurant,
                      admin_settings: {
                        ...restaurant.admin_settings,
                        menu_layout_preferences: {
                          ...restaurant.admin_settings?.menu_layout_preferences,
                          allow_layout_switching: e.target.checked
                        }
                      }
                    })}
                    className="h-4 w-4 text-[#c1902f] focus:ring-[#c1902f] border-gray-300 rounded"
                  />
                  <label htmlFor="allow-layout-switching" className="ml-2 block text-sm font-medium text-gray-700">
                    Allow users to switch between layouts
                  </label>
                </div>
                <p className="mt-1 text-sm text-gray-500 ml-6">
                  When disabled, users will only see the default layout and cannot switch to another view.
                </p>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-5 py-2 bg-[#c1902f] text-white font-medium 
                        rounded-md hover:bg-[#d4a43f]
                        focus:outline-none focus:ring-2 focus:ring-[#c1902f]
                        transition-colors shadow-sm"
            >
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
