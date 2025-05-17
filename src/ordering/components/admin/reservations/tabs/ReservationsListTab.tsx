// src/ordering/components/admin/reservations/tabs/ReservationsListTab.tsx
import { useState, useEffect } from 'react';
import { Search, Users, Phone, AlertCircle, MapPin, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatPhoneNumber } from '../../../../../shared/utils/formatters';
import { useRestaurantStore } from '../../../../../shared/store/restaurantStore';
import { useLocationDateStore } from '../../../../../shared/store/locationDateStore';
import { MobileSelect } from '../../../../../shared/components/ui/MobileSelect';
import { locationsApi } from '../../../../../shared/api/endpoints/locations';
import ReservationModal from '../modals/ReservationModal';
import ReservationFormModal from '../modals/ReservationFormModal';
import { fetchReservations, deleteReservation } from '../../../../../shared/api/endpoints/reservations';

/** Shape of a Reservation. */
interface Reservation {
  id: number;
  reservation_number?: string; // The formatted reservation number
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  party_size?: number;
  status?: string; // e.g. "booked", "seated", etc.
  seat_labels?: string[];
  seat_preferences?: string[][];
  start_time?: string; // e.g. "2025-01-22T18:00:00Z"
  location_id?: number;
  location?: {
    id: number;
    name: string;
  };
  created_at?: string; // When the reservation was initially created
  updated_at?: string; // When the reservation was last updated
}

// Utility functions for date formatting and parsing
function formatYYYYMMDD(dateObj: Date): string {
  return dateObj.toISOString().split('T')[0];
}

function formatStartTime(dateTimeStr?: string): string {
  if (!dateTimeStr) return 'Unknown';
  
  // Parse the UTC datetime string
  const d = new Date(dateTimeStr);
  if (isNaN(d.getTime())) return 'Invalid';
  
  // Calculate the time in Guam (UTC+10)
  // Get UTC hours and add 10 hours for Guam timezone
  const utcHours = d.getUTCHours();
  const guamHours = (utcHours + 10) % 24; // Add 10 hours and handle day wrapping
  
  // Handle day boundary changes
  let guamDay = d.getUTCDate();
  if (utcHours + 10 >= 24) {
    // If adding 10 hours crosses to the next day
    guamDay += 1;
  }
  
  // Create a date with the Guam time components
  const guamDate = new Date(d);
  guamDate.setUTCHours(guamHours);
  if (utcHours + 10 >= 24) {
    // Adjust the day if we crossed midnight
    guamDate.setUTCDate(guamDay);
  }
  
  // Format for display
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC', // Using UTC here, but we've already adjusted the time
  };
  
  // Format using the browser's formatter with our manually adjusted Guam time
  return new Intl.DateTimeFormat('en-US', options).format(guamDate);
}

export default function ReservationsListTab() {
  // Use shared location and date store instead of local state
  const { 
    selectedDate: date, 
    setSelectedDate: setDate,
    selectedLocationId,
    setSelectedLocationId
  } = useLocationDateStore();

  // Core state management
  const restaurant = useRestaurantStore(state => state.restaurant);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [hasMultipleLocations, setHasMultipleLocations] = useState(false);
  const [locations, setLocations] = useState<Array<{id: number, name: string}>>([]);

  // Modal control state
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Status and error handling
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for multiple locations on component mount
  useEffect(() => {
    // Validate restaurant context
    if (!restaurant || !restaurant.id) {
      setError('Unable to access reservations. Restaurant context is missing.');
      return;
    }
    
    // Check if restaurant has multiple locations
    checkForMultipleLocations();
  }, [restaurant]);

  // Fetch reservations whenever date or selected location changes
  useEffect(() => {
    if (error || !restaurant) return; // Don't fetch if there's a tenant context error
    fetchReservationsList();
  }, [date, selectedLocationId, error, restaurant]);
  
  // Check if restaurant has multiple locations and load location data
  const checkForMultipleLocations = async () => {
    try {
      const response = await locationsApi.getLocations({ active: true });
      if (response) {
        const locationsList = Array.isArray(response) ? response : [];
        setLocations(locationsList);
        setHasMultipleLocations(locationsList.length > 1);
        
        // If there's exactly one location, set it as the selected location
        if (locationsList.length === 1) {
          setSelectedLocationId(locationsList[0].id);
        } else if (locationsList.length > 1) {
          // If there are multiple locations and none is selected yet, select the default or first one
          if (!selectedLocationId) {
            const defaultLocation = locationsList.find(loc => loc.is_default) || locationsList[0];
            setSelectedLocationId(defaultLocation.id);
          }
        }
      }
    } catch (err) {
      console.error('Error checking for multiple locations:', err);
    }
  };

  async function fetchReservationsList() {
    // Validate restaurant context
    if (!restaurant || !restaurant.id) {
      setError('Unable to access reservations. Restaurant context is missing.');
      return;
    }

    // Clear existing reservations immediately to prevent showing stale data
    setReservations([]);
    setIsLoading(true);
    setError(null);

    try {
      // Add parameters for API request
      const params: Record<string, any> = { 
        date,
        restaurant_id: restaurant.id
      };
      
      // Add location_id as a separate parameter
      if (selectedLocationId) {
        params.location_id = selectedLocationId;
      }
      
      // Properly apply parameters to API call without nesting them in a JSON string
      const response = await fetchReservations(params);
      
      if (response) {
        const data = Array.isArray(response) ? response : [];
        
        // Sort reservations by:
        // 1. Start time (earlier first)
        // 2. If same start time, by creation date (first booked gets priority)
        const sorted = data.slice().sort((a: Reservation, b: Reservation) => {
          const startTimeA = new Date(a.start_time || '').getTime();
          const startTimeB = new Date(b.start_time || '').getTime();
          
          // First sort by start time
          if (startTimeA !== startTimeB) {
            return startTimeA - startTimeB;
          }
          
          // If start times are the same, sort by creation date (oldest first)
          const createdAtA = new Date(a.created_at || '').getTime();
          const createdAtB = new Date(b.created_at || '').getTime();
          return createdAtA - createdAtB;
        });
        
        setReservations(sorted);
      } else {
        setReservations([]);
      }
    } catch (err: any) {
      console.error('Error fetching reservations:', err);
      setError(err.message || 'Failed to load reservations. Please try again.');
      setReservations([]);
    } finally {
      setIsLoading(false);
    }
  }

  // Filter reservations by search term
  const searchedReservations = reservations.filter((r) => {
    const name = r.contact_name?.toLowerCase() ?? '';
    const phone = r.contact_phone ?? '';
    const email = r.contact_email?.toLowerCase() ?? '';
    const sTerm = searchTerm.toLowerCase();
    return (
      name.includes(sTerm) ||
      phone.includes(searchTerm) ||
      email.includes(sTerm)
    );
  });

  // Row click handler to open reservation detail
  function handleRowClick(res: Reservation) {
    setSelectedReservation(res);
  }

  // Modal control handlers
  function handleCloseCreateModal() {
    setShowCreateModal(false);
  }

  async function handleCreateReservationSuccess() {
    setShowCreateModal(false);
    await fetchReservationsList();
  }

  function handleModalClose() {
    setSelectedReservation(null);
  }

  // Reservation CRUD operations
  async function handleDeleteReservation(id: number) {
    // Validate restaurant context
    if (!restaurant || !restaurant.id) {
      setError('Unable to delete reservation. Restaurant context is missing.');
      return;
    }

    setIsLoading(true);
    try {
      await deleteReservation(id);
      setReservations((prev) => prev.filter((r) => r.id !== id));
      setSelectedReservation(null);
    } catch (err: any) {
      console.error('Failed to delete reservation:', err);
      setError(err.message || 'Failed to delete reservation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleReservationUpdated() {
    await fetchReservationsList();
    setSelectedReservation(null);
  }

  // UI helper functions
  function renderStatusBadge(status?: string) {
    let bgColor = 'bg-gray-100';
    let textColor = 'text-gray-800';

    switch (status?.toLowerCase()) {
      case 'booked':
        bgColor = 'bg-blue-100';
        textColor = 'text-blue-800';
        break;
      case 'confirmed':
      case 'reserved':
        bgColor = 'bg-green-100';
        textColor = 'text-green-800';
        break;
      case 'seated':
        bgColor = 'bg-purple-100';
        textColor = 'text-purple-800';
        break;
      case 'finished':
        bgColor = 'bg-gray-100';
        textColor = 'text-gray-800';
        break;
      case 'cancelled':
      case 'canceled':
        bgColor = 'bg-red-100';
        textColor = 'text-red-800';
        break;
      case 'no_show':
      case 'no-show':
        bgColor = 'bg-yellow-100';
        textColor = 'text-yellow-800';
        break;
    }

    return (
      <span className={`px-2 py-1 inline-flex text-xs leading-4 font-medium rounded-md ${bgColor} ${textColor}`}>
        {status || 'Unknown'}
      </span>
    );
  }

  return (
    <div className="h-full flex flex-col p-4">
      {/* Error display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm flex-1">{error}</p>
        </div>
      )}

      {/* Page header with title and action button for mobile */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <h2 className="text-2xl font-bold text-gray-900">Reservations</h2>
        
        {/* New reservation button (full width on mobile, normal on desktop) */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full sm:w-auto px-4 py-2.5 bg-hafaloha-gold text-white rounded-md text-sm font-medium hover:bg-hafaloha-gold/90 transition-colors flex items-center justify-center"
        >
          <span className="mr-1">+</span> New Reservation
        </button>
      </div>

      {/* Filters section - optimized layout */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 mb-6">
        <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
          {/* Date picker with navigation arrows */}
          <div className="relative flex-1 sm:flex-none sm:w-64">
            <div className="flex items-center space-x-2">
              {/* Previous day button */}
              <button
                onClick={() => {
                  const prevDay = new Date(date);
                  prevDay.setDate(prevDay.getDate() - 1);
                  setIsLoading(true);
                  setDate(formatYYYYMMDD(prevDay));
                }}
                className="p-2 rounded-md bg-hafaloha-gold/10 hover:bg-hafaloha-gold/20 active:bg-hafaloha-gold/30 transition-colors border border-hafaloha-gold/20"
                aria-label="Previous day"
                title="Previous day"
              >
                <ChevronLeft className="h-4 w-4 text-hafaloha-gold" />
              </button>
              
              {/* Date picker with icon */}
              <div className="relative flex-1 sm:w-48">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => {
                    if (e.target.value) {
                      setIsLoading(true);
                      setDate(e.target.value);
                      // Small delay to allow transition to show
                      setTimeout(() => {
                        // This will be overridden by the actual loading state from the API
                        // but helps create a smoother visual transition
                      }, 50);
                    }
                  }}
                  className="w-full pl-10 pr-3 py-2.5 bg-white border border-gray-300 rounded-lg shadow-sm text-sm focus:ring-1 focus:ring-hafaloha-gold/30 focus:border-hafaloha-gold outline-none"
                />
              </div>
              
              {/* Next day button */}
              <button
                onClick={() => {
                  const nextDay = new Date(date);
                  nextDay.setDate(nextDay.getDate() + 1);
                  setIsLoading(true);
                  setDate(formatYYYYMMDD(nextDay));
                }}
                className="p-2 rounded-md bg-hafaloha-gold/10 hover:bg-hafaloha-gold/20 active:bg-hafaloha-gold/30 transition-colors border border-hafaloha-gold/20"
                aria-label="Next day"
                title="Next day"
              >
                <ChevronRight className="h-4 w-4 text-hafaloha-gold" />
              </button>
            </div>
          </div>
          
          {/* Location selector - only show if multiple locations */}
          {hasMultipleLocations && locations.length > 0 && (
            <div className="relative flex-1 sm:flex-none sm:w-56 md:w-64">
              <div className="flex items-center space-x-2">
                <div className="w-full">
                  <div className="relative w-full">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MapPin className="h-4 w-4 text-gray-400" />
                    </div>
                    <div className="pl-7"> {/* Add left padding to accommodate the icon */}
                      <MobileSelect
                        options={locations.map(location => ({
                          value: location.id.toString(),
                          label: location.name
                        }))}
                        value={(selectedLocationId || '').toString()}
                        onChange={(value) => {
                          const id = parseInt(value, 10);
                          if (!isNaN(id)) {
                            setIsLoading(true);
                            setSelectedLocationId(id);
                            // Let the useEffect handle the API call
                          }
                        }}
                        placeholder="Select location"
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Search bar */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm"
              placeholder="Search by name, phone or email"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>
      
      {/* Content container with min-height to prevent layout shifts */}
      <div className="flex-1 min-h-[400px] flex flex-col relative transition-all duration-300 ease-in-out">
        {/* Loading state with skeleton loader */}
        <div className={`rounded-lg border border-gray-100 bg-white shadow-sm overflow-hidden absolute inset-0 transition-opacity duration-300 ${isLoading ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <div className="h-5 w-20 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="divide-y divide-gray-100">
            {Array(5).fill(0).map((_, i) => (
              <div key={i} className="p-4 flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-2"></div>
                  <div className="h-4 w-48 bg-gray-100 rounded animate-pulse"></div>
                </div>
                <div className="h-8 w-24 bg-gray-100 rounded animate-pulse self-end"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop Reservations table - hidden on small screens */}
        <div className={`hidden md:block rounded-lg border border-gray-100 shadow-sm overflow-hidden transition-opacity duration-300 ${!isLoading && searchedReservations.length > 0 ? 'opacity-100 relative' : 'opacity-0 absolute inset-0 pointer-events-none'}`}>
          <table className="min-w-full table-auto divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date/Time
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Size
                </th>
                {hasMultipleLocations && (
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                )}
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {searchedReservations.map((res) => (
                <tr
                  key={res.id}
                  className="hover:bg-hafaloha-gold/5 cursor-pointer transition-colors"
                  onClick={() => handleRowClick(res)}
                >
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{res.reservation_number ? res.reservation_number : `#${res.id}`}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{formatStartTime(res.start_time)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{res.contact_name}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {formatPhoneNumber(res.contact_phone)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    <span className="flex items-center">
                      <Users className="h-4 w-4 mr-1" />
                      {res.party_size}
                    </span>
                  </td>
                  {hasMultipleLocations && (
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {(() => {
                        // Find location name from location list using location_id
                        if (res.location_id) {
                          const location = locations.find(loc => loc.id === res.location_id);
                          return location?.name || `Location ${res.location_id}`;
                        }
                        return '—';
                      })()}
                    </td>
                  )}
                  <td className="px-4 py-3 whitespace-nowrap">
                    {renderStatusBadge(res.status)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRowClick(res);
                      }}
                      className="px-2.5 py-1 text-hafaloha-gold bg-hafaloha-gold/10 hover:bg-hafaloha-gold/20 rounded-md border border-hafaloha-gold/20 transition-colors"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Mobile Reservation Cards - only visible on small screens */}
        <div className={`md:hidden space-y-3 transition-opacity duration-300 ${!isLoading && searchedReservations.length > 0 ? 'opacity-100 relative' : 'opacity-0 absolute inset-0 pointer-events-none'}`}>
          {searchedReservations.map((res) => (
            <div 
              key={res.id}
              className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden cursor-pointer hover:border-hafaloha-gold/30 hover:bg-hafaloha-gold/5 transition-colors"
              onClick={() => handleRowClick(res)}
            >
              <div className="p-3 border-b border-gray-100 flex justify-between items-center">
                <div className="flex items-center">
                  {renderStatusBadge(res.status)}
                  <span className="ml-2 text-gray-500 text-xs">{res.reservation_number ? res.reservation_number : `#${res.id}`}</span>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRowClick(res);
                  }}
                  className="text-xs px-2 py-1 rounded-md bg-hafaloha-gold/10 text-hafaloha-gold hover:bg-hafaloha-gold/20 border border-hafaloha-gold/20 transition-colors"
                >
                  View
                </button>
              </div>
              <div className="p-3">
                <h3 className="font-medium text-gray-900 mb-2 truncate">{res.contact_name}</h3>
                
                <div className="space-y-1 text-sm">
                  <div className="flex items-start">
                    <Calendar className="h-4 w-4 text-gray-400 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-gray-600">{formatStartTime(res.start_time)}</span>
                  </div>
                  
                  <div className="flex items-start">
                    <Phone className="h-4 w-4 text-gray-400 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-gray-600">{formatPhoneNumber(res.contact_phone)}</span>
                  </div>
                  
                  <div className="flex items-start">
                    <Users className="h-4 w-4 text-gray-400 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-gray-600">Party of {res.party_size}</span>
                  </div>
                  
                  {hasMultipleLocations && res.location?.name && (
                    <div className="flex items-start">
                      <MapPin className="h-4 w-4 text-gray-400 mt-0.5 mr-2 flex-shrink-0" />
                      <span className="text-gray-600">{res.location.name}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Empty state */}
        <div className={`bg-white border border-gray-100 rounded-lg p-8 text-center shadow-sm transition-opacity duration-300 ${!isLoading && searchedReservations.length === 0 ? 'opacity-100 relative' : 'opacity-0 absolute inset-0 pointer-events-none'}`}>
          <div className="mx-auto h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Calendar className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No reservations found</h3>
          <p className="text-gray-500 mb-4">There are no reservations matching your search criteria.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-hafaloha-gold text-white rounded-md text-sm font-medium hover:bg-hafaloha-gold/90 transition-colors inline-flex items-center"
          >
            <span className="mr-1">+</span> Create New Reservation
          </button>
        </div>
      </div>

      {/* Reservation detail modal */}
      {selectedReservation && restaurant && (
        <ReservationModal
          reservation={selectedReservation}
          onClose={handleModalClose}
          onDelete={handleDeleteReservation}
          onRefreshData={handleReservationUpdated}
          restaurantId={restaurant.id}
        />
      )}

      {/* Create reservation modal */}
      {showCreateModal && restaurant && (
        <ReservationFormModal
          onClose={handleCloseCreateModal}
          onSuccess={handleCreateReservationSuccess}
          restaurantId={restaurant.id}
          defaultDate={date}
        />
      )}
    </div>
  );
}
