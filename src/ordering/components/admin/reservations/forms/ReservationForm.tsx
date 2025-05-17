// src/ordering/components/admin/reservations/forms/ReservationForm.tsx

import { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import Select, { SingleValue } from 'react-select';
import { 
  CalendarClock, 
  Check, 
  Clock, 
  Mail, 
  Phone, 
  Users, 
  User 
} from 'lucide-react';

import { useAuth } from '../../../../../shared/auth';
import toastUtils from '../../../../../shared/utils/toastUtils';
import { validateRestaurantContext } from '../../../../../shared/utils/tenantUtils';
import { formatPhoneNumber } from '../../../../../shared/utils/formatters';
import { useRestaurantStore } from '../../../../../shared/store/restaurantStore';
import { fetchAvailability, fetchCapacity } from '../../../../../shared/api/endpoints/reservations';

// Define the types
interface TimeOption {
  value: string; // e.g. "17:30"
  label: string; // e.g. "5:30 PM"
}

interface DurationOption {
  value: number; // e.g. 60
  label: string; // e.g. "60 minutes"
}

// Form fields
interface ReservationFormData {
  date: string;
  time: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  specialRequests: string;
  partySize: number;
  duration: number;
}

// Data for the confirmation UI
interface ConfirmationData {
  date: string;
  time: string;
  partySize: number;
  duration: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  specialRequests?: string;
  id?: number;
  reservation_number?: string;
}

/** Helper Functions */
function formatYYYYMMDD(dateObj: Date): string {
  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function parseYYYYMMDD(dateStr: string): Date | null {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function format12hSlot(slot: string) {
  const [hhStr, mmStr] = slot.split(':');
  const hh = parseInt(hhStr, 10);
  const mins = parseInt(mmStr, 10);
  const d = new Date(2020, 0, 1, hh, mins);
  return d.toLocaleString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
}

// "Reservation Confirmed!" screen
function ReservationConfirmation({
  reservation,
  onClose,
}: {
  reservation: ConfirmationData;
  onClose: () => void;
}) {
  // Format date for display
  const dateObj = parseYYYYMMDD(reservation.date);
  const dateStr = dateObj
    ? dateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : reservation.date;
  
  // Use the reservation number from the backend, or create a placeholder if it's a new reservation
  const reservationNumber = reservation.id ? (reservation.reservation_number || `R-${reservation.id}`) : 'New Reservation';
  
  // Current date and time for the confirmation timestamp
  const confirmationTime = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  });
  
  // Note: confirmationTime is defined but not currently used in the component

  return (
    <div className="relative p-6 max-w-md sm:max-w-xl mx-auto bg-white rounded-lg shadow-lg">
      {/* Success icon with gold color */}
      <div className="absolute left-1/2 -top-8 -translate-x-1/2">
        <div className="bg-gold text-white p-3 rounded-full shadow-lg">
          <Check className="h-7 w-7" />
        </div>
      </div>

      <div className="pt-6 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Reservation Request Received!</h2>
        <p className="text-gray-600 mb-6">Your reservation will be confirmed shortly</p>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold text-gray-700">Reservation #</div>
          <div className="font-mono bg-white px-3 py-1 rounded border border-gray-200">
            {reservationNumber}
          </div>
        </div>

        <div className="flex items-center mb-2 text-gray-700">
          <CalendarClock className="h-5 w-5 mr-2 text-gold flex-shrink-0" />
          <div>
            <span className="font-semibold">Date & Time:</span> {dateStr} at{' '}
            {reservation.time}
          </div>
        </div>

        <div className="flex items-center mb-2 text-gray-700">
          <Users className="h-5 w-5 mr-2 text-gold flex-shrink-0" />
          <div>
            <span className="font-semibold">Party Size:</span> {reservation.partySize}{' '}
            {reservation.partySize === 1 ? 'person' : 'people'}
          </div>
        </div>

        <div className="flex items-center mb-2 text-gray-700">
          <Clock className="h-5 w-5 mr-2 text-gold flex-shrink-0" />
          <div>
            <span className="font-semibold">Duration:</span> {reservation.duration}
          </div>
        </div>

        {reservation.firstName && (
          <div className="flex items-center mb-2 text-gray-700">
            <User className="h-5 w-5 mr-2 text-gold flex-shrink-0" />
            <div>
              <span className="font-semibold">Name:</span>{' '}
              {reservation.firstName} {reservation.lastName}
            </div>
          </div>
        )}

        {reservation.phone && (
          <div className="flex items-center mb-2 text-gray-700">
            <Phone className="h-5 w-5 mr-2 text-gold flex-shrink-0" />
            <div>
              <span className="font-semibold">Phone:</span>{' '}
              {formatPhoneNumber(reservation.phone)}
            </div>
          </div>
        )}

        {reservation.email && (
          <div className="flex items-center mb-2 text-gray-700">
            <Mail className="h-5 w-5 mr-2 text-gold flex-shrink-0" />
            <div>
              <span className="font-semibold">Email:</span> {reservation.email}
            </div>
          </div>
        )}

        {reservation.specialRequests && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="font-semibold text-gray-700 mb-1">Special Requests:</div>
            <div className="text-gray-600 text-sm italic">
              "{reservation.specialRequests}"
            </div>
          </div>
        )}
      </div>

      <div className="text-xs text-gray-500 mb-4 text-center">
        Confirmation sent at {confirmationTime}
      </div>

      <div className="flex justify-center">
        <button
          onClick={onClose}
          className="px-5 py-2 bg-gold hover:bg-amber-600 text-white rounded-md shadow transition"
        >
          Done
        </button>
      </div>
    </div>
  );
}

// Main ReservationForm
export default function ReservationForm({
  onClose,                // Parent can close the modal
  onToggleConfirmation,   // Tells parent if we're confirming
}: {
  onClose?: () => void;
  onToggleConfirmation?: (confirming: boolean) => void;
}) {
  const { isAuthenticated, user } = useAuth();
  const restaurant = useRestaurantStore(state => state.restaurant);
  
  // Error state for tenant validation
  const [error, setError] = useState<string | null>(null);
  
  // Step state (1 = date/time selection, 2 = contact details)
  const [step, setStep] = useState(1);
  
  // Confirmation state
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationData | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<ReservationFormData>({
    date: formatYYYYMMDD(new Date()),
    time: '',
    // Use the correct property names for the User type
    firstName: user?.first_name || '',  // Using snake_case based on TypeScript errors
    lastName: user?.last_name || '',    // Using snake_case based on TypeScript errors
    phone: user?.phone || '',          // Simplified to use the expected property name
    email: user?.email || '',
    specialRequests: '',
    partySize: 2,
    duration: 60,
  });
  
  // API response data
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [isLoadingTimeSlots, setIsLoadingTimeSlots] = useState(false);
  const [maxPartySize, setMaxPartySize] = useState<number>(0);
  const [isLoadingCapacity, setIsLoadingCapacity] = useState(false);
  
  // Form validation states
  const [dateTimeValid, setDateTimeValid] = useState(false);
  const [contactValid, setContactValid] = useState(false);
  
  // When step changes, tell parent if we're in confirmation mode
  useEffect(() => {
    if (onToggleConfirmation) {
      onToggleConfirmation(isConfirming);
    }
  }, [isConfirming, onToggleConfirmation]);

  // Validate restaurant context for tenant isolation
  useEffect(() => {
    if (!restaurant) {
      setError('Restaurant context is required to make reservations');
      return;
    }
    
    const validationResult = validateRestaurantContext(restaurant);
    if (!validationResult) {
      setError('Restaurant context is required to make reservations');
    }
  }, [restaurant]);
  
  // Check date+time validity when relevant fields change
  useEffect(() => {
    setDateTimeValid(!!formData.date && !!formData.time);
  }, [formData.date, formData.time]);
  
  // Check contact validity when relevant fields change
  useEffect(() => {
    // Name and phone are required
    setContactValid(
      !!formData.firstName.trim() && 
      !!formData.lastName.trim() && 
      !!formData.phone.trim()
    );
  }, [formData.firstName, formData.lastName, formData.phone]);
  
  // Fetch available time slots when date changes
  useEffect(() => {
    async function getAvailability() {
      if (!formData.date) return;
      
      // Validate restaurant context
      if (!restaurant) {
        setError('Restaurant context is required to retrieve availability');
        return;
      }
      
      const validationResult = validateRestaurantContext(restaurant);
      if (!validationResult) {
        setError('Restaurant context is required to retrieve availability');
        return;
      }
      
      // Get restaurant ID for the API call
      const restaurantId = restaurant.id;
      
      setIsLoadingTimeSlots(true);
      
      try {
        // Log the API request parameters for debugging
        console.log('Fetching availability with params:', {
          date: formData.date, 
          party_size: formData.partySize,
          restaurant_id: restaurantId
        });
        
        const response = await fetchAvailability({
          date: formData.date, 
          party_size: formData.partySize,
          restaurant_id: restaurantId
        });
        
        // Log the full API response for debugging
        console.log('API response for availability:', response);
        
        // Handle different response formats
        let availableTimes: string[] = [];
        
        // Handle different response formats safely with type assertions
        if (Array.isArray(response)) {
          availableTimes = response;
        } else if (response && typeof response === 'object') {
          // Use type assertions to avoid TypeScript errors
          const responseObj = response as Record<string, any>;
          if ('data' in responseObj && Array.isArray(responseObj.data)) {
            availableTimes = responseObj.data;
          } else if ('timeslots' in responseObj && Array.isArray(responseObj.timeslots)) {
            availableTimes = responseObj.timeslots;
          }
        }
        
        // Respect the API response - if no times are available, the UI will show no options
        // This ensures we're displaying only what the restaurant has configured
        
        setAvailableTimeSlots(availableTimes);
        
        // If current selection is no longer available, clear it
        if (formData.time && !availableTimes.includes(formData.time)) {
          setFormData(prev => ({ ...prev, time: '' }));
        }
      } catch (err) {
        console.error('Error fetching availability:', err);
        toastUtils.error('Could not load available time slots');
        setAvailableTimeSlots([]);
      } finally {
        setIsLoadingTimeSlots(false);
      }
    }
    
    getAvailability();
  }, [formData.date, formData.partySize]);
  
  // Convert time slots to React Select options
  const timeOptions: TimeOption[] = availableTimeSlots.map(slot => ({
    value: slot,
    label: format12hSlot(slot)
  }));
  
  // Duration options - based on 30 minute increments
  const durationOptions: DurationOption[] = [
    { value: 60, label: '1 hour' },
    { value: 90, label: '1 hour 30 minutes' },
    { value: 120, label: '2 hours' },
    { value: 150, label: '2 hours 30 minutes' },
    { value: 180, label: '3 hours' },
  ];
  
  // Time slot selection handler
  const handleTimeChange = (option: SingleValue<TimeOption>) => {
    const selectedTime = option?.value || '';
    
    setFormData(prev => ({
      ...prev,
      time: selectedTime,
    }));
    
    // Fetch capacity for this time if selected
    if (selectedTime && formData.date) {
      fetchCapacityForDateTime(formData.date, selectedTime);
    }
  };
  
  // Duration selection handler
  const handleDurationChange = (option: SingleValue<DurationOption>) => {
    setFormData(prev => ({
      ...prev,
      duration: option?.value || 60,
    }));
  };
  
  // Date change handler
  const handleDateChange = (date: Date | null) => {
    if (date) {
      setFormData(prev => ({
        ...prev,
        date: formatYYYYMMDD(date),
        time: '', // Reset time when date changes
      }));
    }
  };
  
  // Party size change handler
  const handlePartySizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 1;
    
    // Limit party size to the maximum available capacity or a reasonable default
    const maxValue = maxPartySize > 0 ? maxPartySize : 20;
    const boundedValue = Math.max(1, Math.min(value, maxValue));
    
    setFormData(prev => ({
      ...prev,
      partySize: boundedValue,
    }));
  };
  
  // Helper function to fetch capacity for a date and time
  const fetchCapacityForDateTime = async (date: string, time: string) => {
    if (!date || !time || !restaurant) return;
    
    // Validate restaurant context
    const validationResult = validateRestaurantContext(restaurant);
    if (!validationResult) {
      setError('Restaurant context is required to retrieve capacity');
      return;
    }
    
    setIsLoadingCapacity(true);
    
    try {
      // Log the API request parameters for debugging
      console.log('Fetching capacity with params:', {
        date, 
        time,
        restaurant_id: restaurant.id
      });
      
      const response = await fetchCapacity({
        date, 
        time,
        restaurant_id: restaurant.id
      });
      
      console.log('API response for capacity:', response);
      
      if (response.success && response.data) {
        const capacity = response.data.max_party_size || 0;
        setMaxPartySize(capacity);
        
        // If current party size exceeds capacity, adjust it
        if (capacity > 0 && formData.partySize > capacity) {
          setFormData(prev => ({
            ...prev,
            partySize: capacity
          }));
        }
        
        // If no capacity is available, show a toast notification
        if (capacity === 0) {
          toastUtils.error('No capacity available for this time slot');
        }
      }
    } catch (err) {
      console.error('Error fetching capacity:', err);
      setMaxPartySize(0);
    } finally {
      setIsLoadingCapacity(false);
    }
  };
  
  // Form field change handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };
  
  // Go to contact details step
  const handleContinue = () => {
    if (dateTimeValid) {
      setStep(2);
    }
  };
  
  // Go back to date/time selection
  const handleBack = () => {
    setStep(1);
  };
  
  // Submit the form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!dateTimeValid || !contactValid) return;
    
    // Set up confirmation data
    const confirmData: ConfirmationData = {
      date: formData.date,
      time: format12hSlot(formData.time),
      partySize: formData.partySize,
      duration: formatDuration(formData.duration),
      firstName: formData.firstName,
      lastName: formData.lastName,
      phone: formData.phone,
      email: formData.email,
      specialRequests: formData.specialRequests,
    };
    
    setConfirmation(confirmData);
    setIsConfirming(true);
    
    // In a full implementation, this would call the API to create the reservation
    // First ensure we have a valid restaurant context
    // if (!restaurant) {
    //   setError('Restaurant context is required to create a reservation');
    //   return;
    // }
    //
    // try {
    //   // Format the reservation data according to API expectations
    //   const reservationData = {
    //     reservation: {
    //       restaurant_id: restaurant.id,
    //       start_time: `${formData.date}T${formData.time}:00Z`,
    //       party_size: formData.partySize,
    //       duration_minutes: formData.duration,
    //       contact_name: `${formData.firstName} ${formData.lastName}`,
    //       contact_phone: formData.phone,
    //       contact_email: formData.email,
    //       special_requests: formData.specialRequests,
    //       status: 'confirmed'
    //     }
    //   };
    //
    //   // Call the API with proper data structure
    //   const response = await createReservation(reservationData);
    //   console.log('Reservation created successfully:', response);
    //   toastUtils.success('Reservation created successfully!');
    // } catch (error) {
    //   console.error('Error creating reservation:', error);
    //   toastUtils.error('Failed to create reservation. Please try again.');
    //   return;
    // }
  };
  
  // Close confirmation and modal
  const handleClose = () => {
    if (onClose) onClose();
  };
  
  // Error display
  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
        <h2 className="text-xl font-bold text-red-600 mb-4">Error</h2>
        <p className="text-gray-700 mb-4">{error}</p>
        <button
          onClick={handleClose}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Close
        </button>
      </div>
    );
  }
  
  // If we're showing the confirmation screen
  if (isConfirming && confirmation) {
    return (
      <ReservationConfirmation
        reservation={confirmation}
        onClose={handleClose}
      />
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden max-w-md mx-auto">
      {/* Header */}
      <div className="bg-gold text-white p-4">
        <h2 className="text-xl font-bold">Make a Reservation</h2>
        <p className="text-sm opacity-90">
          {restaurant?.name || 'Restaurant'} • 
          {/* Display a static location since restaurant.location isn't available */}
          {'Location'}
        </p>
      </div>
      
      {/* Step indicator */}
      <div className="px-6 pt-4">
        <div className="flex justify-between mb-4">
          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step >= 1 ? 'bg-gold text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              1
            </div>
            <div className={`ml-2 ${
              step >= 1 ? 'text-gray-900 font-medium' : 'text-gray-500'
            }`}>
              Date & Time
            </div>
          </div>
          
          <div className="flex-grow mx-2 flex items-center">
            <div className={`h-0.5 w-full ${
              step >= 2 ? 'bg-gold' : 'bg-gray-200'
            }`}></div>
          </div>
          
          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step >= 2 ? 'bg-gold text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              2
            </div>
            <div className={`ml-2 ${
              step >= 2 ? 'text-gray-900 font-medium' : 'text-gray-500'
            }`}>
              Details
            </div>
          </div>
        </div>
      </div>
      
      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="p-6">
          {/* Step 1: Date & Time Selection */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Party Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Party Size {maxPartySize > 0 && `(Max: ${maxPartySize})`}
                </label>
                <div className="flex items-center">
                  <Users className="h-5 w-5 text-gray-400 mr-2" />
                  <input
                    type="number"
                    min="1"
                    max={maxPartySize > 0 ? maxPartySize : 20}
                    value={formData.partySize}
                    onChange={handlePartySizeChange}
                    className={`
                      flex-grow p-2 border border-gray-300 rounded-md
                      focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent
                      ${isLoadingCapacity ? 'opacity-50' : ''}
                    `}
                    disabled={isLoadingCapacity}
                  />
                </div>
                {maxPartySize > 0 && (
                  <p className="mt-1 text-xs text-gray-600">
                    Maximum {maxPartySize} {maxPartySize === 1 ? 'person' : 'people'} available for this time slot
                  </p>
                )}
              </div>
              
              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <div className="flex items-center">
                  <CalendarClock className="h-5 w-5 text-gray-400 mr-2" />
                  <div className="flex-grow relative">
                    <DatePicker
                      selected={parseYYYYMMDD(formData.date)}
                      onChange={handleDateChange}
                      minDate={new Date()}
                      className="
                        w-full p-2 border border-gray-300 rounded-md
                        focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent
                      "
                      dateFormat="MMMM d, yyyy"
                    />
                  </div>
                </div>
              </div>
              
              {/* Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time
                </label>
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-gray-400 mr-2" />
                  <div className="flex-grow">
                    <Select
                      options={timeOptions}
                      value={timeOptions.find(option => option.value === formData.time)}
                      onChange={handleTimeChange}
                      isLoading={isLoadingTimeSlots}
                      placeholder="Select a time"
                      isDisabled={timeOptions.length === 0}
                      className="react-select-container"
                      classNamePrefix="react-select"
                    />
                    {timeOptions.length === 0 && !isLoadingTimeSlots && (
                      <p className="mt-1 text-xs text-red-500">
                        No available times for this date and party size
                      </p>
                    )}
                    {isLoadingCapacity && (
                      <p className="mt-1 text-xs text-gray-500">
                        Checking capacity for this time slot...
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration
                </label>
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-gray-400 mr-2" />
                  <div className="flex-grow">
                    <Select
                      options={durationOptions}
                      value={durationOptions.find(option => option.value === formData.duration)}
                      onChange={handleDurationChange}
                      placeholder="Select duration"
                      className="react-select-container"
                      classNamePrefix="react-select"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Step 2: Contact Details */}
          {step === 2 && (
            <div className="space-y-4">
              {/* First Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                  className="
                    w-full p-2 border border-gray-300 rounded-md
                    focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent
                  "
                />
              </div>
              
              {/* Last Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                  className="
                    w-full p-2 border border-gray-300 rounded-md
                    focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent
                  "
                />
              </div>
              
              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  className="
                    w-full p-2 border border-gray-300 rounded-md
                    focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent
                  "
                />
              </div>
              
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="
                    w-full p-2 border border-gray-300 rounded-md
                    focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent
                  "
                />
              </div>
              
              {/* Special Requests */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Special Requests
                </label>
                <textarea
                  name="specialRequests"
                  value={formData.specialRequests}
                  onChange={handleInputChange}
                  rows={3}
                  className="
                    w-full p-2 border border-gray-300 rounded-md
                    focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent
                  "
                  placeholder="E.g., high chair needed, allergies, special occasion..."
                />
              </div>
            </div>
          )}
        </div>
        
        {/* Footer with buttons */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between">
          {step === 1 ? (
            <>
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleContinue}
                disabled={!dateTimeValid}
                className={`
                  px-4 py-2 rounded-md
                  ${dateTimeValid
                    ? 'bg-gold text-white hover:bg-amber-600'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'}
                `}
              >
                Continue
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleBack}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={!contactValid}
                className={`
                  px-4 py-2 rounded-md
                  ${contactValid
                    ? 'bg-gold text-white hover:bg-amber-600' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'}
                `}
              >
                Make Reservation
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
