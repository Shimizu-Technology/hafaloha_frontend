// src/ordering/components/admin/settings/RestaurantSettings.tsx

import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Input, LoadingSpinner } from '../../../../shared/components/ui';
import { fetchRestaurant as apiFetchRestaurant, fetchRestaurants } from '../../../../shared/api/endpoints/restaurants';
import { MobileSelect } from '../../../../shared/components/ui/MobileSelect';
import { formatPhoneNumber } from '../../../../shared/utils/formatters';
import { useRestaurantStore, Restaurant } from '../../../../shared/store/restaurantStore';

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

export function RestaurantSettings({ restaurantId }: RestaurantSettingsProps) {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(false);
  const { updateRestaurant, fetchRestaurant } = useRestaurantStore();

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

  async function handleRestaurantUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!restaurant) return;

    setLoading(true);
    try {
      await updateRestaurant({
        name: restaurant.name,
        address: restaurant.address,
        phone_number: restaurant.phone_number,
        time_zone: restaurant.time_zone,
        time_slot_interval: restaurant.time_slot_interval,
        default_reservation_length: restaurant.default_reservation_length,
        frontend_id: restaurant.frontend_id
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
  }

  // If we're still loading for the very first time:
  if (loading && !restaurant) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner className="mx-auto" />
      </div>
    );
  }

  return (
    <div className="mt-4">
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

            {/* Frontend information - hidden from user editing */}
            <input 
              type="hidden" 
              name="frontend_id" 
              value={restaurant.frontend_id || 'hafaloha'} 
            />

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
