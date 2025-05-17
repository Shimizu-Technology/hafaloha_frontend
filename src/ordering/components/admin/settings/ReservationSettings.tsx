// src/ordering/components/admin/settings/ReservationSettings.tsx

import { useState, useEffect } from 'react';
import { Restaurant } from '../../../../shared/store/restaurantStore';
import { Clock, Calendar, Hourglass, Users, Plus } from 'lucide-react';
import toastUtils from '../../../../shared/utils/toastUtils';
import * as tenantUtils from '../../../../shared/utils/tenantUtils';
import { MobileSelect } from '../../../../shared/components/ui';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

// Import the shared API client directly
import { api } from '../../../lib/api';

// Type definitions for Operating Hours and Special Events
interface OperatingHour {
  id: number;
  day_of_week: number; // 0 = Sunday, 1 = Monday, etc.
  open_time: string | null;
  close_time: string | null;
  closed: boolean;
}

interface SpecialEvent {
  id: number;
  event_date_obj: Date | null;
  start_time: string | null;
  end_time: string | null;
  closed: boolean;
  exclusive_booking: boolean;
  max_capacity: number;
  description: string;
  _deleted?: boolean;
}

// Helper functions for date and time formatting
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Utility functions for time handling
const shortTime = (dbTime: string | Date | null): string => {
  if (!dbTime) return '';
  
  try {
    // Handle various format possibilities
    if (typeof dbTime === 'string') {
      // Special handling for Rails time format: "2000-01-01 11:00:00.000000000 +1000"
      const railsTimeMatch = dbTime.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);
      if (railsTimeMatch) {
        // Extract hours and minutes from the match
        const hours = railsTimeMatch[4].padStart(2, '0');
        const minutes = railsTimeMatch[5].padStart(2, '0');
        return `${hours}:${minutes}`;
      }
      
      // Handle ISO format or other string formats
      const date = new Date(dbTime);
      if (!isNaN(date.getTime())) {
        // Valid date object created from string
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
      } else {
        // Try direct extraction if it's already in a time format like "11:00:00"
        const timeMatch = dbTime.match(/\d{1,2}:\d{2}/);
        if (timeMatch) {
          return timeMatch[0].padStart(5, '0');
        }
      }
    } else if (dbTime instanceof Date) {
      // Handle Date object
      const hours = dbTime.getHours().toString().padStart(2, '0');
      const minutes = dbTime.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    }
    
    // Fallback to empty if we can't process the time
    return '';
  } catch (error) {
    return '';
  }
};

const toDbTime = (inputTime: string): string => {
  // Convert HTML time input format (HH:MM) to DB time format (HH:MM:SS)
  return inputTime ? `${inputTime}:00` : '';
};



const formatDateYYYYMMDD = (date: Date | null): string | null => {
  if (!date) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface ReservationSettingsProps {
  restaurant: Restaurant;
  onUpdate: (updatedRestaurant: Restaurant) => void;
}

export function ReservationSettings({ restaurant, onUpdate }: ReservationSettingsProps): JSX.Element {
  // UI state
  const [isExpanded, setIsExpanded] = useState(true);
  const [operatingHoursExpanded, setOperatingHoursExpanded] = useState(false);
  const [specialEventsExpanded, setSpecialEventsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [operatingHours, setOperatingHours] = useState<OperatingHour[]>([]);
  const [draftHours, setDraftHours] = useState<OperatingHour[]>([]);
  const [specialEvents, setSpecialEvents] = useState<SpecialEvent[]>([]);
  const [draftEvents, setDraftEvents] = useState<SpecialEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [seatCount, setSeatCount] = useState(0);
  const [actualCapacity, setActualCapacity] = useState(0);
  const [isError, setIsError] = useState(false);

  // Validate tenant context when component mounts or restaurant changes
  useEffect(() => {
    if (restaurant && tenantUtils.validateRestaurantContext(restaurant)) {
      loadOperatingHoursAndEvents();
    }
  }, [restaurant]);

  // API functions with proper tenant isolation
  async function fetchOperatingHours() {
    try {
      if (!restaurant || !tenantUtils.validateRestaurantContext(restaurant)) {
        throw new Error('Invalid restaurant context');
      }
      
      // Correct syntax for get method: api.get(endpoint, params, options)
      const params = { restaurant_id: restaurant.id };
      
      // The params object is passed as the second parameter, not within an object
      const response = await api.get('/operating_hours', params);
      
      // Return the direct response data, which should be the array of operating hours
      return response;
    } catch (error) {
      console.error('Error fetching operating hours:', error);
      toastUtils.error('Failed to load operating hours');
      return [];
    }
  }
  
  async function updateOperatingHour(id: number, data: any) {
    try {
      if (!restaurant || !tenantUtils.validateRestaurantContext(restaurant)) {
        throw new Error('Invalid restaurant context');
      }
      
      // Add restaurant_id parameter for tenant isolation
      const updatedData = {
        ...data,
        restaurant_id: restaurant.id
      };
      
      // Use the shared API client directly
      return await api.patch(`/operating_hours/${id}`, updatedData);
    } catch (error) {
      console.error('Error updating operating hour:', error);
      toastUtils.error('Failed to update operating hours');
      throw error;
    }
  }
  
  async function fetchSpecialEvents() {
    try {
      if (!restaurant || !tenantUtils.validateRestaurantContext(restaurant)) {
        throw new Error('Invalid restaurant context');
      }
      
      // Correct syntax for get method: api.get(endpoint, params, options)
      const params = { restaurant_id: restaurant.id };
      
      // The params object is passed as the second parameter, not within an object
      const response = await api.get('/special_events', params);
      
      // Return the direct response data, which should be the array of special events
      return response;
    } catch (error) {
      console.error('Error fetching special events:', error);
      toastUtils.error('Failed to load special events');
      return [];
    }
  }
  
  async function createSpecialEvent(data: any) {
    try {
      if (!restaurant || !tenantUtils.validateRestaurantContext(restaurant)) {
        throw new Error('Invalid restaurant context');
      }
      
      // Add restaurant_id for tenant isolation
      const eventData = {
        ...data,
        restaurant_id: restaurant.id
      };
      
      // Use the shared API client directly
      return await api.post('/special_events', eventData);
    } catch (error) {
      console.error('Error creating special event:', error);
      toastUtils.error('Failed to create special event');
      throw error;
    }
  }
  
  async function updateSpecialEvent(id: number, data: any) {
    try {
      if (!restaurant || !tenantUtils.validateRestaurantContext(restaurant)) {
        throw new Error('Invalid restaurant context');
      }
      
      // Add restaurant_id for tenant isolation
      const eventData = {
        ...data,
        restaurant_id: restaurant.id
      };
      
      // Use the shared API client directly
      return await api.patch(`/special_events/${id}`, eventData);
    } catch (error) {
      console.error('Error updating special event:', error);
      toastUtils.error('Failed to update special event');
      throw error;
    }
  }
  
  async function deleteSpecialEvent(id: number) {
    try {
      if (!restaurant || !tenantUtils.validateRestaurantContext(restaurant)) {
        throw new Error('Invalid restaurant context');
      }
      
      // For DELETE, append restaurant_id as a query param directly to the URL
      // since the delete method doesn't accept params as a separate parameter
      return await api.delete(`/special_events/${id}?restaurant_id=${restaurant.id}`);
    } catch (error) {
      console.error('Error deleting special event:', error);
      toastUtils.error('Failed to delete special event');
      throw error;
    }
  }
  
  // Load operating hours and special events
  async function loadOperatingHoursAndEvents() {
    setLoading(true);
    setIsLoading(true);
    try {
      // Set seat count from restaurant
      if (restaurant.current_seat_count) {
        setSeatCount(restaurant.current_seat_count);
      }

      // Load operating hours
      const operatingHours = await fetchOperatingHours();
      
      // Ensure we're setting an array
      if (Array.isArray(operatingHours)) {
        setDraftHours(operatingHours);
      } else {
        setDraftHours([]);
      }

      // Load special events
      const specialEvents = await fetchSpecialEvents();
      
      // Map special events to the correct format
      if (Array.isArray(specialEvents)) {
        const mappedEvents = specialEvents.map((item: any) => ({
          id: item.id,
          event_date_obj: item.event_date ? new Date(item.event_date) : new Date(),
          event_date: item.event_date,
          start_time: item.start_time,
          end_time: item.end_time,
          closed: item.closed,
          exclusive_booking: item.exclusive_booking,
          max_capacity: item.max_capacity,
          description: item.description,
          _deleted: false,
        }));
        setDraftEvents(mappedEvents);
      } else {
        console.error('Special events data is not an array:', specialEvents);
        setDraftEvents([]);
      }
    } catch (err) {
      console.error('Error loading settings:', err);
      toastUtils.error('Failed to load settings.');
    } finally {
      setLoading(false);
    }
  }
  
  // Operating Hours changes
  function handleOHChange(hourId: number, field: keyof OperatingHour, value: any) {
    setDraftHours((prev) =>
      prev.map((oh) => (oh.id === hourId ? { ...oh, [field]: value } : oh))
    );
  }
  
  // Special Events changes
  function handleEventChange(eventId: number, field: keyof SpecialEvent, value: any) {
    setDraftEvents((prev) =>
      prev.map((ev) => (ev.id === eventId ? { ...ev, [field]: value } : ev))
    );
  }
  
  function handleDeleteEvent(eventId: number) {
    setDraftEvents((prev) =>
      prev.map((ev) => (ev.id === eventId ? { ...ev, _deleted: true } : ev))
    );
  }
  
  function handleAddEvent() {
    const newEvent: SpecialEvent = {
      id: 0,
      event_date_obj: null,
      start_time: null,
      end_time: null,
      closed: false,
      exclusive_booking: false,
      max_capacity: seatCount,
      description: '',
    };
    setDraftEvents((prev) => [...prev, newEvent]);
  }

  // Get current reservation settings with defaults
  const reservationSettings = restaurant.admin_settings?.reservations || {};
  const durationMinutes = reservationSettings.duration_minutes || restaurant.default_reservation_length || 60;
  const turnaroundMinutes = reservationSettings.turnaround_minutes || 15;
  const overlapWindowMinutes = reservationSettings.overlap_window_minutes || 120;
  const timeSlotInterval = reservationSettings.time_slot_interval || restaurant.time_slot_interval || 30;
  const maxPartySize = reservationSettings.max_party_size || 20;
  const effectiveCapacity = actualCapacity || seatCount || 20; // Use actual capacity, fallback to seat count or default

  // Duration options in minutes
  const durationOptions = [
    { value: '60', label: '1 hour' },
    { value: '90', label: '1.5 hours' },
    { value: '120', label: '2 hours' },
    { value: '150', label: '2.5 hours' },
    { value: '180', label: '3 hours' },
  ];

  // Turnaround time options in minutes
  const turnaroundOptions = [
    { value: '5', label: '5 minutes' },
    { value: '15', label: '15 minutes' },
    { value: '30', label: '30 minutes' },
    { value: '45', label: '45 minutes' },
    { value: '60', label: '1 hour' },
  ];

  // Overlap window options in minutes
  const overlapOptions = [
    { value: '60', label: '1 hour' },
    { value: '90', label: '1.5 hours' },
    { value: '120', label: '2 hours' },
    { value: '180', label: '3 hours' },
    { value: '240', label: '4 hours' },
  ];

  // Time slot interval options in minutes
  const intervalOptions = [
    { value: '15', label: '15 minutes' },
    { value: '30', label: '30 minutes' },
    { value: '60', label: '1 hour' },
  ];

  // Standard party size options
  const standardPartyOptions = [
    { value: '4', label: 'Maximum 4 guests' },
    { value: '6', label: 'Maximum 6 guests' },
    { value: '8', label: 'Maximum 8 guests' },
    { value: '10', label: 'Maximum 10 guests' },
    { value: '12', label: 'Maximum 12 guests' },
    { value: '15', label: 'Maximum 15 guests' },
    { value: '20', label: 'Maximum 20 guests' },
    { value: '25', label: 'Maximum 25 guests' },
    { value: '30', label: 'Maximum 30 guests' },
    { value: '50', label: 'Maximum 50 guests' },
  ];
  
  // State for dynamic party size options
  const [partySizeOptions, setPartySizeOptions] = useState(standardPartyOptions);
  
  // Update options when effectiveCapacity changes
  useEffect(() => {
    // Filter to ensure no options exceed the restaurant's physical capacity
    const filteredOptions = standardPartyOptions.filter(option => {
      const size = parseInt(option.value);
      const valid = size <= effectiveCapacity;
      return valid;
    });
    setPartySizeOptions(filteredOptions);
  }, [effectiveCapacity]);
  
  // Add the actual capacity as an option if it doesn't match any standard options
  useEffect(() => {
    if (effectiveCapacity > 0) {
      // Check if the actual capacity is already in the options
      if (!partySizeOptions.some(opt => parseInt(opt.value) === effectiveCapacity)) {
        // Add the actual capacity as an option
        setPartySizeOptions(prev => {
          const newOptions = [...prev, {
            value: effectiveCapacity.toString(),
            label: `Maximum ${effectiveCapacity} guests`
          }];
          // Sort options by value
          return newOptions.sort((a, b) => parseInt(a.value) - parseInt(b.value));
        });
      }
    }
    
  }, [effectiveCapacity, partySizeOptions]);
  
  // Ensure there's at least one option
  useEffect(() => {
    if (partySizeOptions.length === 0 && effectiveCapacity > 0) {
      setPartySizeOptions([{ 
        value: effectiveCapacity.toString(), 
        label: `Maximum ${effectiveCapacity} guests` 
      }]);
    }
  }, [partySizeOptions, effectiveCapacity]);

  // Helper function to update reservation settings
  const updateReservationSetting = (key: string, value: any) => {
    try {
      // Validate input value based on key
      if (typeof value === 'number' && (isNaN(value) || value < 0)) {
        toastUtils.error(`Invalid value for ${key}. Must be a positive number.`);
        return;
      }
      
      // No validation for max_party_size - allowing restaurants to set any maximum party size
      // regardless of the restaurant's physical capacity
      
      // Create updated restaurant object with new settings
      const updatedRestaurant = {
        ...restaurant,
        admin_settings: {
          ...restaurant.admin_settings,
          reservations: {
            ...(restaurant.admin_settings?.reservations || {}),
            [key]: value
          }
        }
      };
      
      // Call parent update function
      onUpdate(updatedRestaurant);
      
      // Show success message
      toastUtils.success(`Reservation ${key.replace('_', ' ')} updated successfully.`);
    } catch (error) {
      console.error('Error updating reservation setting:', error);
      toastUtils.error('Failed to update reservation setting. Please try again.');
    }
  };

  // Save all settings function
  async function handleSaveAll() {
    try {
      // 1) Update restaurant reservation settings (existing functionality)
      const updatedRestaurant = {
        ...restaurant,
        admin_settings: {
          ...restaurant.admin_settings,
          reservations: {
            ...(restaurant.admin_settings?.reservations || {})
            // Note: individual reservation settings are updated separately through updateReservationSetting
          }
        }
      };
      onUpdate(updatedRestaurant);
      
      // 2) Update operating hours
      for (const oh of draftHours) {
        await updateOperatingHour(oh.id, {
          open_time:  oh.open_time,
          close_time: oh.close_time,
          closed:     oh.closed,
        });
      }
      
      // 3) Special events handling
      const toCreate = draftEvents.filter(ev => ev.id === 0 && !ev._deleted);
      const toUpdate = draftEvents.filter(ev => ev.id !== 0 && !ev._deleted);
      const toDelete = draftEvents.filter(ev => ev.id !== 0 && ev._deleted);
      
      // 3.1) Create new events
      for (const ev of toCreate) {
        const payload = {
          event_date:       formatDateYYYYMMDD(ev.event_date_obj),
          start_time:       ev.start_time,
          end_time:         ev.end_time,
          closed:           ev.closed,
          exclusive_booking: ev.exclusive_booking,
          max_capacity:     ev.max_capacity,
          description:      ev.description,
        };
        await createSpecialEvent(payload);
      }
      
      // 3.2) Update existing events
      for (const ev of toUpdate) {
        const payload = {
          event_date:       formatDateYYYYMMDD(ev.event_date_obj),
          start_time:       ev.start_time,
          end_time:         ev.end_time,
          closed:           ev.closed,
          exclusive_booking: ev.exclusive_booking,
          max_capacity:     ev.max_capacity,
          description:      ev.description,
        };
        await updateSpecialEvent(ev.id, payload);
      }
      
      // 3.3) Delete events
      for (const ev of toDelete) {
        await deleteSpecialEvent(ev.id);
      }
      
      // Success notification
      toastUtils.success('All settings saved successfully!');
      
      // Reload data to reflect changes
      loadOperatingHoursAndEvents();
    } catch (err) {
      console.error('Error saving settings:', err);
      toastUtils.error('Failed to save settings. See console for details.');
    }
  }
  
  return (
    <div className="mt-8 bg-white rounded-lg shadow-md overflow-hidden">
      {/* Save button at the top */}
      <div className="flex justify-end p-2 bg-gray-50">
        <button
          type="button"
          onClick={handleSaveAll}
          className="px-4 py-2 bg-hafaloha-gold text-white rounded font-medium hover:bg-hafaloha-coral"
        >
          Save All Settings
        </button>
      </div>
      
      {/* General Reservation Settings Section */}
      <div 
        className="bg-teal-50 px-4 py-5 cursor-pointer flex justify-between items-center"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center">
          <Calendar className="h-6 w-6 text-teal-600 mr-3" />
          <h3 className="text-lg font-medium text-gray-900">
            Reservation Settings
          </h3>
        </div>
        <button
          type="button"
          className="text-gray-500 hover:text-gray-700"
        >
          {isExpanded ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </button>
      </div>

      {/* Section Content */}
      {isExpanded && (
        <div className="px-4 py-5 sm:p-6 space-y-6">
          {/* Enable Reservations Button Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 mb-6">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Enable "Book Your Table" Button</h4>
              <p className="text-xs text-gray-500 mt-1">
                When enabled, customers will see a "Book Your Table" button on the homepage.
                When disabled, the button will be hidden.
              </p>
            </div>
            <div className="flex items-center">
              <label className="inline-flex relative items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={restaurant.admin_settings?.reservations?.enable_reservations_button !== false} 
                  onChange={(e) => updateReservationSetting('enable_reservations_button', e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#c1902f]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#c1902f]"></div>
              </label>
            </div>
          </div>

          <div className="text-sm text-gray-500 mb-4">
            Configure how your reservation system handles time slots, overlaps, and seating capacity.
          </div>

          {/* Default Reservation Duration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                Default Reservation Duration
              </label>
              <MobileSelect
                value={durationMinutes.toString()}
                onChange={(value) => updateReservationSetting('duration_minutes', parseInt(value))}
                options={durationOptions}
                className="w-full"
              />
              <p className="mt-1 text-xs text-gray-500">How long each reservation typically lasts</p>
            </div>

            {/* Turnaround Time */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 flex items-center">
                <Hourglass className="h-4 w-4 mr-1" />
                Turnaround Time
              </label>
              <MobileSelect
                value={turnaroundMinutes.toString()}
                onChange={(value) => updateReservationSetting('turnaround_minutes', parseInt(value))}
                options={turnaroundOptions}
                className="w-full"
              />
              <p className="mt-1 text-xs text-gray-500">Buffer time needed between reservations</p>
            </div>

            {/* Reservation Overlap Window */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                Reservation Overlap Window
              </label>
              <MobileSelect
                value={overlapWindowMinutes.toString()}
                onChange={(value) => updateReservationSetting('overlap_window_minutes', parseInt(value))}
                options={overlapOptions}
                className="w-full"
              />
              <p className="mt-1 text-xs text-gray-500">How far to check for overlapping reservations</p>
            </div>

            {/* Time Slot Interval */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                Time Slot Interval
              </label>
              <MobileSelect
                value={timeSlotInterval.toString()}
                onChange={(value) => updateReservationSetting('time_slot_interval', parseInt(value))}
                options={intervalOptions}
                className="w-full"
              />
              <p className="mt-1 text-xs text-gray-500">Spacing between available reservation times</p>
            </div>

            {/* Maximum Party Size */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 flex items-center">
                <Users className="h-4 w-4 mr-1" />
                Maximum Party Size
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={maxPartySize}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 1;
                  updateReservationSetting('max_party_size', value);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">
                Largest party size that customers or admins can book in a single reservation
              </p>
              {maxPartySize > effectiveCapacity && effectiveCapacity > 0 && (
                <p className="mt-1 text-xs text-orange-500 font-medium">
                  Note: Your current setting exceeds your restaurant's physical capacity of {effectiveCapacity} seats.
                  Large parties may require special seating arrangements or multiple tables.
                </p>
              )}
            </div>
          </div>

          <div className="bg-yellow-50 p-4 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Configuration Tips</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Setting shorter durations allows more reservations but may rush guests</li>
                    <li>Turnaround time ensures tables can be cleaned between seatings</li>
                    <li>Smaller time slot intervals offer more flexibility but can complicate scheduling</li>
                    <li>Maximum party size should reflect your largest table or combinable tables</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Operating Hours Section */}
      <div 
        className="border-t border-gray-200 bg-blue-50 px-4 py-5 cursor-pointer flex justify-between items-center"
        onClick={() => setOperatingHoursExpanded(!operatingHoursExpanded)}
      >
        <div className="flex items-center">
          <Clock className="h-6 w-6 text-blue-600 mr-3" />
          <h3 className="text-lg font-medium text-gray-900">
            Operating Hours
          </h3>
        </div>
        <button
          type="button"
          className="text-gray-500 hover:text-gray-700"
        >
          {operatingHoursExpanded ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </button>
      </div>
      
      {/* Operating Hours Content */}
      {operatingHoursExpanded && (
        <div className="px-4 py-5 sm:p-6 space-y-6">
          <div className="text-sm text-gray-500 mb-4">
            Configure your restaurant's regular business hours. These times will be used to determine when reservations can be made.
          </div>
          
          {loading ? (
            <div className="text-center py-4">
              <svg className="animate-spin h-8 w-8 text-gray-400 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="mt-2 text-gray-500">Loading operating hours...</p>
            </div>
          ) : draftHours.length === 0 ? (
            <p className="text-sm text-gray-600">No operating hours found. Contact support to set up your restaurant's schedule.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm">Day</th>
                    <th className="px-4 py-2 text-left text-sm">Open Time</th>
                    <th className="px-4 py-2 text-left text-sm">Close Time</th>
                    <th className="px-4 py-2 text-left text-sm">Closed?</th>
                  </tr>
                </thead>
                <tbody>
                  {draftHours.map((oh) => {
                    const openVal = shortTime(oh.open_time);
                    const closeVal = shortTime(oh.close_time);
                    return (
                      <tr key={oh.id} className="border-b last:border-b-0">
                        <td className="px-4 py-2 text-sm">
                          {DAY_NAMES[oh.day_of_week] ?? `Day ${oh.day_of_week}`}
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="time"
                            disabled={oh.closed}
                            value={openVal || ''}
                            onChange={(e) => {
                              const newVal = toDbTime(e.target.value);
                              handleOHChange(oh.id, 'open_time', newVal);
                            }}
                            className="border border-gray-300 rounded p-1 w-32 text-sm"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="time"
                            disabled={oh.closed}
                            value={closeVal || ''}
                            onChange={(e) => {
                              const newVal = toDbTime(e.target.value);
                              handleOHChange(oh.id, 'close_time', newVal);
                            }}
                            className="border border-gray-300 rounded p-1 w-32 text-sm"
                          />
                        </td>
                        <td className="px-4 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={oh.closed}
                            onChange={(e) =>
                              handleOHChange(oh.id, 'closed', e.target.checked)
                            }
                            title="If checked, no reservations allowed this day"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      
      {/* Special Events Section */}
      <div 
        className="border-t border-gray-200 bg-yellow-50 px-4 py-5 cursor-pointer flex justify-between items-center"
        onClick={() => setSpecialEventsExpanded(!specialEventsExpanded)}
      >
        <div className="flex items-center">
          <Calendar className="h-6 w-6 text-yellow-600 mr-3" />
          <h3 className="text-lg font-medium text-gray-900">
            Special Events
          </h3>
        </div>
        <button
          type="button"
          className="text-gray-500 hover:text-gray-700"
        >
          {specialEventsExpanded ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </button>
      </div>
      
      {/* Special Events Content */}
      {specialEventsExpanded && (
        <div className="px-4 py-5 sm:p-6 space-y-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">
              Configure special dates such as holidays, private events, or days with non-standard capacity.
            </p>
            <button
              onClick={handleAddEvent}
              type="button"
              className="px-3 py-1 bg-hafaloha-gold text-white text-sm rounded hover:bg-hafaloha-coral flex items-center"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Event
            </button>
          </div>
          
          <div className="mb-4">
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showAdvanced}
                onChange={() => setShowAdvanced(!showAdvanced)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Show Advanced Options</span>
            </label>
          </div>
          
          {loading ? (
            <div className="text-center py-4">
              <svg className="animate-spin h-8 w-8 text-gray-400 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="mt-2 text-gray-500">Loading special events...</p>
            </div>
          ) : draftEvents.filter(e => !e._deleted).length === 0 ? (
            <p className="text-sm text-gray-600">No special events configured. Add an event for holidays or private functions.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-2 text-left text-sm">Event Date</th>
                    <th
                      className="px-2 py-2 text-left text-sm"
                      title="Fully close the restaurant?"
                    >
                      Fully Closed?
                    </th>
                    {showAdvanced && (
                      <th
                        className="px-2 py-2 text-left text-sm"
                        title="No other bookings if checked."
                      >
                        Private Only
                      </th>
                    )}
                    {showAdvanced && (
                      <th
                        className="px-2 py-2 text-left text-sm"
                        title="Max capacity for the day."
                      >
                        Max Guests
                      </th>
                    )}
                    <th className="px-2 py-2 text-left text-sm">Start</th>
                    <th className="px-2 py-2 text-left text-sm">End</th>
                    <th className="px-2 py-2 text-left text-sm">Description</th>
                    <th className="px-2 py-2 text-sm" />
                  </tr>
                </thead>
                <tbody>
                  {draftEvents.map((ev, idx) => {
                    if (ev._deleted) return null;
                    const rowKey = ev.id !== 0 ? `event-${ev.id}` : `new-${idx}`;
                    return (
                      <tr key={rowKey} className="border-b last:border-b-0">
                        <td className="px-2 py-2">
                          <DatePicker
                            selected={ev.event_date_obj}
                            onChange={(date: Date | null) => {
                              handleEventChange(ev.id, 'event_date_obj', date);
                            }}
                            dateFormat="MM/dd/yyyy"
                            isClearable
                            placeholderText="Pick a date"
                            className="border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                        </td>
                        <td className="px-2 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={ev.closed}
                            onChange={(e) =>
                              handleEventChange(ev.id, 'closed', e.target.checked)
                            }
                          />
                        </td>
                        {showAdvanced && (
                          <td className="px-2 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={ev.exclusive_booking}
                              onChange={(e) =>
                                handleEventChange(ev.id, 'exclusive_booking', e.target.checked)
                              }
                            />
                          </td>
                        )}
                        {showAdvanced && (
                          <td className="px-2 py-2 w-20">
                            <input
                              type="number"
                              min={0}
                              value={ev.max_capacity}
                              onChange={(e) =>
                                handleEventChange(ev.id, 'max_capacity', +e.target.value)
                              }
                              className="border border-gray-300 rounded p-1 w-full text-sm"
                            />
                          </td>
                        )}
                        <td className="px-2 py-2">
                          <input
                            type="time"
                            disabled={ev.closed}
                            value={shortTime(ev.start_time)}
                            onChange={(e) =>
                              handleEventChange(ev.id, 'start_time', toDbTime(e.target.value))
                            }
                            className="border border-gray-300 rounded p-1 w-20 text-sm"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="time"
                            disabled={ev.closed}
                            value={shortTime(ev.end_time)}
                            onChange={(e) =>
                              handleEventChange(ev.id, 'end_time', toDbTime(e.target.value))
                            }
                            className="border border-gray-300 rounded p-1 w-20 text-sm"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={ev.description || ''}
                            onChange={(e) =>
                              handleEventChange(ev.id, 'description', e.target.value)
                            }
                            className="border border-gray-300 rounded p-1 w-48 text-sm"
                          />
                        </td>
                        <td className="px-2 py-2 text-right">
                          {ev.id !== 0 ? (
                            <button
                              type="button"
                              onClick={() => handleDeleteEvent(ev.id)}
                              className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                            >
                              Delete
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                setDraftEvents((prev) => prev.filter((x) => x !== ev))
                              }
                              className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                            >
                              Remove
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
