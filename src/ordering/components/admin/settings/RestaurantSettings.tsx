// src/ordering/components/admin/settings/RestaurantSettings.tsx

import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Input, LoadingSpinner } from '../../../../shared/components/ui';
import { 
  fetchRestaurant as apiFetchRestaurant, 
  fetchRestaurants,
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
  const [heroPreview, setHeroPreview] = useState<string | null>(null);
  const [spinnerPreview, setSpinnerPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { fetchRestaurant } = useRestaurantStore();

  // Clean up object URLs when component unmounts or when previews change
  useEffect(() => {
    return () => {
      if (heroPreview && heroPreview.startsWith('blob:')) {
        URL.revokeObjectURL(heroPreview);
      }
      if (spinnerPreview && spinnerPreview.startsWith('blob:')) {
        URL.revokeObjectURL(spinnerPreview);
      }
    };
  }, [heroPreview, spinnerPreview]);

  useEffect(() => {
    fetchRestaurantData();
  }, []);

  async function fetchRestaurantData() {
    // Set up a timer to show loading state only if the request takes longer than 500ms
    const loadingTimer = setTimeout(() => {
      setLoading(true);
    }, 500);
    
    try {
      // First try to get all restaurants
      try {
        const response = await fetchRestaurants();
        // Check if response is an array and has items
        if (Array.isArray(response) && response.length > 0) {
          setRestaurant(response[0]); // Assuming the first restaurant is the current one
          return; // Exit if successful
        } else if (response && typeof response === 'object') {
          // If it's a single restaurant object
          setRestaurant(response as Restaurant);
          return; // Exit if successful
        }
      } catch (fetchError) {
        console.warn('Could not fetch restaurants list, trying with ID 1:', fetchError);
      }
      
      // Fallback: try to get restaurant with ID 1 if the above fails
      try {
        const singleRestaurant = await apiFetchRestaurant(1);
        if (singleRestaurant) {
          setRestaurant(singleRestaurant as Restaurant);
        }
      } catch (singleFetchError) {
        // If both methods fail, throw the error to be caught by the outer catch
        throw singleFetchError;
      }
    } catch (err: any) {
      console.error('Failed to load restaurant data:', err);
      toast.error('Failed to load restaurant data');
      
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
  async function handleImageFileChange(file: File, imageType: 'hero' | 'spinner') {
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
      } else {
        setSpinnerFile(compressedFile);
        setSpinnerPreview(previewUrl);
      }
    } catch (error) {
      console.error(`Error processing ${imageType} image preview:`, error);
      toast.error(`Failed to generate preview for ${imageType} image`);
    }
  }

  async function handleRestaurantUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!restaurant) return;

    // If no new files, just update the text fields
    if (!heroFile && !spinnerFile) {
      setLoading(true);
      try {
        await apiUpdateRestaurant(restaurant.id, {
          name: restaurant.name,
          address: restaurant.address,
          phone_number: restaurant.phone_number,
          time_zone: restaurant.time_zone,
          time_slot_interval: restaurant.time_slot_interval,
          default_reservation_length: restaurant.default_reservation_length,
          admin_settings: restaurant.admin_settings
        });
        
        // Fetch the updated restaurant data to ensure all components have the latest data
        await fetchRestaurant();
        
        toast.success('Restaurant settings updated!');
      } catch (err: any) {
        console.error('Failed to update restaurant settings:', err);
        toast.error('Failed to update restaurant settings');
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
        phone_number: restaurant.phone_number,
        time_zone: restaurant.time_zone,
        time_slot_interval: restaurant.time_slot_interval,
        default_reservation_length: restaurant.default_reservation_length,
        admin_settings: restaurant.admin_settings
      });
      updatePromises.push(textUpdatePromise);
      
      // Upload the images using FormData
      if (heroFile || spinnerFile) {
        const formData = new FormData();
        if (heroFile) formData.append('hero_image', heroFile);
        if (spinnerFile) formData.append('spinner_image', spinnerFile);
        
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
      
      // Clean up object URLs
      if (heroPreview && heroPreview.startsWith('blob:')) {
        URL.revokeObjectURL(heroPreview);
      }
      if (spinnerPreview && spinnerPreview.startsWith('blob:')) {
        URL.revokeObjectURL(spinnerPreview);
      }
      
      setHeroPreview(null);
      setSpinnerPreview(null);
      
      // Fetch the updated restaurant data to ensure all components have the latest data
      await fetchRestaurant();
      
      // Remove the loading overlay
      document.body.removeChild(loadingOverlay);
      
      toast.success('Restaurant settings updated!');
    } catch (err: any) {
      console.error('Failed to update restaurant settings:', err);
      toast.error('Failed to update restaurant settings');
      
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
    <div className="mt-4 relative">
      {/* Loading overlay - styled to match the image provided */}
      {loading && restaurant && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <LoadingSpinner showText={true} />
        </div>
      )}
      
      {restaurant && (
        <div>
          <p className="text-sm text-gray-600 mb-6">
            Configure your restaurant's basic information and reservation settings.
          </p>
          
          <form onSubmit={handleRestaurantUpdate} className="space-y-8">
            {/* Basic Information Section */}
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 pb-2 border-b border-gray-200">Basic Information</h3>
              
              <div className="space-y-4">
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                    <span className="ml-1 text-gray-500 text-xs" title="Enter in format: +16719893444">ⓘ</span>
                  </label>
                  <input
                    type="text"
                    value={restaurant.phone_number || ''}
                    onChange={(e) => setRestaurant({...restaurant, phone_number: e.target.value})}
                    placeholder="Enter restaurant phone number"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#c1902f] focus:border-[#c1902f] sm:text-sm"
                  />
                  {restaurant.phone_number && (
                    <p className="mt-1 text-sm text-gray-500">
                      Will display as: {formatPhoneNumber(restaurant.phone_number)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Notification Settings Section */}
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 pb-2 border-b border-gray-200">Notification Settings</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    WhatsApp Group ID
                    <span className="ml-1 text-gray-500 text-xs" title="The WhatsApp group ID for order notifications">ⓘ</span>
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
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#c1902f] focus:border-[#c1902f] sm:text-sm"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    This ID is used to send order notifications to a WhatsApp group.
                  </p>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Header Color
                    <span className="ml-1 text-gray-500 text-xs" title="The color used for email headers">ⓘ</span>
                  </label>
                  <div className="flex items-center">
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
                      className="h-10 w-20 p-0 border border-gray-300 rounded"
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
                      className="ml-2 block w-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#c1902f] focus:border-[#c1902f] sm:text-sm"
                    />
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    This color is used for the header background in email notifications.
                  </p>
                </div>
              </div>
            </div>

            {/* Brand Images Section */}
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 pb-2 border-b border-gray-200">Brand Images</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* HERO IMAGE CARD */}
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 flex flex-col">
                  <h4 className="text-base font-semibold mb-4 text-gray-800">
                    Hero Image
                  </h4>

                  {/* Show preview if available, otherwise show the saved image */}
                  {heroPreview ? (
                    <div className="relative">
                      <img
                        src={heroPreview}
                        alt="Hero Preview"
                        className="mb-3 w-full max-h-48 object-contain border rounded-md"
                      />
                      <div className="absolute top-0 right-0 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-bl-md">
                        Preview
                      </div>
                    </div>
                  ) : restaurant.admin_settings?.hero_image_url ? (
                    <img
                      src={restaurant.admin_settings.hero_image_url}
                      alt="Current Hero"
                      className="mb-3 w-full max-h-48 object-contain border rounded-md"
                    />
                  ) : (
                    <div className="mb-3 w-full h-32 flex items-center justify-center bg-gray-50 border border-dashed border-gray-300 rounded-md">
                      <p className="text-sm text-gray-500">No hero image set yet</p>
                    </div>
                  )}

                  <label className="block">
                    <span className="text-sm font-medium text-gray-700">
                      Choose a new file:
                    </span>
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
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 flex flex-col">
                  <h4 className="text-base font-semibold mb-4 text-gray-800">
                    Spinner Image
                  </h4>

                  {/* Show preview if available, otherwise show the saved image */}
                  {spinnerPreview ? (
                    <div className="relative">
                      <img
                        src={spinnerPreview}
                        alt="Spinner Preview"
                        className="mb-3 w-full max-h-48 object-contain border rounded-md"
                      />
                      <div className="absolute top-0 right-0 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-bl-md">
                        Preview
                      </div>
                    </div>
                  ) : restaurant.admin_settings?.spinner_image_url ? (
                    <img
                      src={restaurant.admin_settings.spinner_image_url}
                      alt="Current Spinner"
                      className="mb-3 w-full max-h-48 object-contain border rounded-md"
                    />
                  ) : (
                    <div className="mb-3 w-full h-32 flex items-center justify-center bg-gray-50 border border-dashed border-gray-300 rounded-md">
                      <p className="text-sm text-gray-500">No spinner image set yet</p>
                    </div>
                  )}

                  <label className="block">
                    <span className="text-sm font-medium text-gray-700">
                      Choose a new file:
                    </span>
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
              </div>
            </div>

            {/* Reservation Settings Section */}
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 pb-2 border-b border-gray-200">Reservation Settings</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time Zone</label>
                  <select
                    value={restaurant.time_zone}
                    onChange={(e) => setRestaurant({...restaurant, time_zone: e.target.value})}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#c1902f] focus:border-[#c1902f] sm:text-sm rounded-md"
                  >
                    {timezoneOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Time Slot Interval (minutes)
                      <span className="ml-1 text-gray-500 text-xs" title="The interval in minutes between available reservation time slots">ⓘ</span>
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="60"
                      value={restaurant.time_slot_interval.toString()}
                      onChange={(e) => setRestaurant({...restaurant, time_slot_interval: parseInt(e.target.value) || 30})}
                      placeholder="30"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#c1902f] focus:border-[#c1902f] sm:text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Default Reservation Length (minutes)
                      <span className="ml-1 text-gray-500 text-xs" title="The default duration for reservations in minutes">ⓘ</span>
                    </label>
                    <input
                      type="number"
                      min="15"
                      max="240"
                      value={restaurant.default_reservation_length.toString()}
                      onChange={(e) => setRestaurant({...restaurant, default_reservation_length: parseInt(e.target.value) || 60})}
                      placeholder="60"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#c1902f] focus:border-[#c1902f] sm:text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button - Full width on mobile */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto sm:ml-auto sm:flex sm:items-center px-5 py-2
                          bg-[#c1902f] text-white font-medium 
                          rounded-md hover:bg-[#d4a43f]
                          focus:outline-none focus:ring-2 focus:ring-[#c1902f]
                          transition-colors"
              >
                {loading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
